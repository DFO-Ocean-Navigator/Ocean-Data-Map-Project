import copy
import os
import tempfile
from textwrap import wrap

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
import osr
import pyresample.utils
from flask_babel import gettext
from geopy.distance import VincentyDistance
from matplotlib.bezier import concatenate_paths
from matplotlib.colors import LogNorm
from matplotlib.patches import PathPatch, Polygon
from mpl_toolkits.axes_grid1 import make_axes_locatable
from mpl_toolkits.basemap import maskoceans
from osgeo import gdal
from shapely.geometry import LinearRing, MultiPolygon, Point
from shapely.geometry import Polygon as Poly
from shapely.ops import cascaded_union

import plotting.basemap as basemap
import plotting.colormap as colormap
import plotting.overlays as overlays
import plotting.utils as utils
from data import open_dataset
from oceannavigator import DatasetConfig
from plotting.plotter import Plotter
from utils.errors import ClientError, ServerError
from utils.misc import list_areas


class MapPlotter(Plotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = 'map'

        super(MapPlotter, self).__init__(dataset_name, query, **kwargs)

    def parse_query(self, query):
        super(MapPlotter, self).parse_query(query)

        self.projection = query.get('projection')

        self.area = query.get('area')

        names = []
        centroids = []
        all_rings = []
        data = None
        for idx, a in enumerate(self.area):
            if isinstance(a, str):

                sp = a.split('/', 1)
                if data is None:
                    data = list_areas(sp[0], simplify=False)

                b = [x for x in data if x.get('key') == a]
                a = b[0]
                self.area[idx] = a
            else:
                self.points = copy.deepcopy(np.array(a['polygons']))
                a['polygons'] = self.points.tolist()
                a['name'] = " "

            rings = [LinearRing(po) for po in a['polygons']]
            if len(rings) > 1:
                u = cascaded_union(rings)
            else:
                u = rings[0]

            all_rings.append(u)
            if a.get('name'):
                names.append(a.get('name'))
                centroids.append(u.centroid)
        nc = sorted(zip(names, centroids))
        self.names = [n for (n, c) in nc]
        self.centroids = [c for (n, c) in nc]
        data = None

        if len(all_rings) > 1:
            combined = cascaded_union(all_rings)
        else:
            combined = all_rings[0]

        self.combined_area = combined
        combined = combined.envelope

        self.centroid = list(combined.centroid.coords)[0]
        self.bounds = combined.bounds

        self.show_bathymetry = bool(query.get('bathymetry'))
        self.show_area = bool(query.get('showarea'))

        self.quiver = query.get('quiver')

        self.contour = query.get('contour')

    def load_data(self):
        distance = VincentyDistance()
        height = distance.measure(
            (self.bounds[0], self.centroid[1]),
            (self.bounds[2], self.centroid[1])
        ) * 1000 * 1.25
        width = distance.measure(
            (self.centroid[0], self.bounds[1]),
            (self.centroid[0], self.bounds[3])
        ) * 1000 * 1.25

        if self.projection == 'EPSG:32661':             # north pole projection
            near_pole, covers_pole = self.pole_proximity(self.points[0])
            blat = min(self.bounds[0], self.bounds[2])
            blat = 5 * np.floor(blat / 5)

            if self.centroid[0] > 80 or near_pole or covers_pole:
                self.basemap = basemap.load_map(
                    'npstere', self.centroid, height, width, min(self.bounds[0], self.bounds[2]))
            else:
                self.basemap = basemap.load_map(
                    'lcc', self.centroid, height, width)
        elif self.projection == 'EPSG:3031':            # south pole projection
            near_pole, covers_pole = self.pole_proximity(self.points[0])
            blat = max(self.bounds[0], self.bounds[2])
            blat = 5 * np.ceil(blat / 5)
            # is centerered close to the south pole
            if ((self.centroid[0] < -80 or self.bounds[1] < -80 or self.bounds[3] < -80) or covers_pole) or near_pole:
                self.basemap = basemap.load_map(
                    'spstere', self.centroid, height, width, max(self.bounds[0], self.bounds[2]))
            else:
                self.basemap = basemap.load_map(
                    'lcc', self.centroid, height, width)
        elif abs(self.centroid[1] - self.bounds[1]) > 90:

            height_bounds = [self.bounds[0], self.bounds[2]]
            width_bounds = [self.bounds[1], self.bounds[3]]
            height_buffer = (abs(height_bounds[1]-height_bounds[0]))*0.1
            width_buffer = (abs(width_bounds[0]-width_bounds[1]))*0.1

            if abs(width_bounds[1] - width_bounds[0]) > 360:
                raise ClientError(gettext("You have requested an area that exceeds the width of the world. \
                                        Thinking big is good but plots need to be less than 360 deg wide."))

            if height_bounds[1] < 0:
                height_bounds[1] = height_bounds[1]+height_buffer
            else:
                height_bounds[1] = height_bounds[1]+height_buffer
            if height_bounds[0] < 0:
                height_bounds[0] = height_bounds[0]-height_buffer
            else:
                height_bounds[0] = height_bounds[0]-height_buffer

            new_width_bounds = []
            new_width_bounds.append(width_bounds[0]-width_buffer)

            new_width_bounds.append(width_bounds[1]+width_buffer)

            if abs(new_width_bounds[1] - new_width_bounds[0]) > 360:
                width_buffer = np.floor(
                    (360-abs(width_bounds[1] - width_bounds[0]))/2)
                new_width_bounds[0] = width_bounds[0]-width_buffer
                new_width_bounds[1] = width_bounds[1]+width_buffer

            if new_width_bounds[0] < -360:
                new_width_bounds[0] = -360
            if new_width_bounds[1] > 720:
                new_width_bounds[1] = 720

            self.basemap = basemap.load_map(
                'merc', self.centroid,
                (height_bounds[0], height_bounds[1]),
                (new_width_bounds[0], new_width_bounds[1])
            )
        else:
            self.basemap = basemap.load_map(
                'lcc', self.centroid, height, width
            )

        if self.basemap.aspect < 1:
            gridx = 500
            gridy = int(500 * self.basemap.aspect)
        else:
            gridy = 500
            gridx = int(500 / self.basemap.aspect)

        self.longitude, self.latitude = self.basemap.makegrid(gridx, gridy)

        with open_dataset(self.dataset_config, variable=self.variables, timestamp=self.time) as dataset:

            if len(self.variables) > 1:
                self.variable_unit = self.get_vector_variable_unit(
                    dataset, self.variables
                )
                self.variable_name = self.get_vector_variable_name(
                    dataset, self.variables
                )
                scale_factor = self.get_vector_variable_scale_factor(
                    dataset, self.variables
                )
            else:
                self.variable_unit = self.get_variable_units(
                    dataset, self.variables
                )[0]
                self.variable_name = self.get_variable_names(
                    dataset,
                    self.variables
                )[0]
                scale_factor = self.get_variable_scale_factors(
                    dataset, self.variables
                )[0]

            if self.cmap is None:
                if len(self.variables) == 1:
                    self.cmap = colormap.find_colormap(self.variable_name)
                else:
                    self.cmap = colormap.colormaps.get('speed')

            if self.depth == 'bottom':
                depth_value_map = 'Bottom'
            else:
                self.depth = np.clip(
                    int(self.depth), 0, len(dataset.depths) - 1)
                depth_value = dataset.depths[self.depth]
                depth_value_map = depth_value

            data = []
            allvars = []
            for v in self.variables:
                var = dataset.variables[v]
                allvars.append(v)
                if self.filetype in ['csv', 'odv', 'txt']:
                    d, depth_value_map = dataset.get_area(
                        np.array([self.latitude, self.longitude]),
                        self.depth,
                        self.time,
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours,
                        return_depth=True
                    )
                else:
                    d = dataset.get_area(
                        np.array([self.latitude, self.longitude]),
                        self.depth,
                        self.time,
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours
                    )

                d = np.multiply(d, scale_factor)

                data.append(d)
                if self.filetype not in ['csv', 'odv', 'txt']:
                    if len(var.dimensions) == 3:
                        self.depth_label = ""
                    elif self.depth == 'bottom':
                        self.depth_label = " at Bottom"
                    else:
                        self.depth_label = " at " + \
                            str(int(np.round(depth_value_map))) + " m"

            if len(data) == 2:
                data[0] = np.sqrt(data[0] ** 2 + data[1] ** 2)

            self.data = data[0]

            quiver_data = []
            # Store the quiver data on the same grid as the main variable. This
            # will only be used for CSV export.
            quiver_data_fullgrid = []

            if self.quiver is not None and \
                self.quiver['variable'] != '' and \
                    self.quiver['variable'] != 'none':
                for v in self.quiver['variable'].split(','):
                    allvars.append(v)
                    var = dataset.variables[v]
                    quiver_unit = self.dataset_config.variable[var].unit
                    quiver_name = self.dataset_config.variable[var].name
                    quiver_lon, quiver_lat = self.basemap.makegrid(50, 50)
                    d = dataset.get_area(
                        np.array([quiver_lat, quiver_lon]),
                        self.depth,
                        self.time,
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours,
                    )
                    quiver_data.append(d)
                    # Get the quiver data on the same grid as the main
                    # variable.
                    d = dataset.get_area(
                        np.array([self.latitude, self.longitude]),
                        self.depth,
                        self.time,
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours,
                    )
                    quiver_data_fullgrid.append(d)

                self.quiver_name = self.get_vector_variable_name(
                    dataset, self.quiver['variable'].split(',')
                )
                self.quiver_longitude = quiver_lon
                self.quiver_latitude = quiver_lat
                self.quiver_unit = quiver_unit
            self.quiver_data = quiver_data
            self.quiver_data_fullgrid = quiver_data_fullgrid

            if all([len(dataset.variables[v].dimensions) == 3 for v in allvars]):
                self.depth = 0

            contour_data = []
            if self.contour is not None and \
                self.contour['variable'] != '' and \
                    self.contour['variable'] != 'none':
                d = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    self.contour['variable'],
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                vc = self.dataset_config.variable[self.contour['variable']]
                contour_unit = vc.unit
                contour_name = vc.name
                contour_factor = vc.scale_factor
                d = np.multiply(d, contour_factor)
                contour_data.append(d)
                self.contour_unit = contour_unit
                self.contour_name = contour_name

            self.contour_data = contour_data

            self.timestamp = dataset.timestamp_to_iso_8601(self.time)

        if self.compare:
            self.variable_name += " Difference"
            compare_config = DatasetConfig(self.compare['dataset'])
            with open_dataset(compare_config, variable=self.compare['variables'], timestamp=self.compare['time']) as dataset:
                data = []
                for v in self.compare['variables']:
                    var = dataset.variables[v]
                    d = dataset.get_area(
                        np.array([self.latitude, self.longitude]),
                        self.compare['depth'],
                        self.compare['time'],
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours,
                    )
                    data.append(d)

                if len(data) == 2:
                    data = np.sqrt(data[0] ** 2 + data[1] ** 2)
                else:
                    data = data[0]

                self.data -= data

        # Load bathymetry data
        self.bathymetry = overlays.bathymetry(
            self.basemap,
            self.latitude,
            self.longitude,
            blur=2
        )

        if self.depth != 'bottom' and self.depth != 0:
            if len(quiver_data) > 0:
                quiver_bathymetry = overlays.bathymetry(
                    self.basemap, quiver_lat, quiver_lon)

            self.data[np.where(
                self.bathymetry < depth_value_map)] = np.ma.masked
            for d in self.quiver_data:
                d[np.where(quiver_bathymetry < depth_value)] = np.ma.masked
            for d in self.contour_data:
                d[np.where(self.bathymetry < depth_value_map)] = np.ma.masked
        else:
            mask = maskoceans(self.longitude, self.latitude,
                              self.data, True, 'h', 1.25).mask
            self.data[~mask] = np.ma.masked
            for d in self.quiver_data:
                mask = maskoceans(
                    self.quiver_longitude, self.quiver_latitude, d).mask
                d[~mask] = np.ma.masked
            for d in contour_data:
                mask = maskoceans(self.longitude, self.latitude, d).mask
                d[~mask] = np.ma.masked

        if self.area and self.filetype in ['csv', 'odv', 'txt', 'geotiff']:
            area_polys = []
            for a in self.area:
                rings = [LinearRing(p) for p in a['polygons']]
                innerrings = [LinearRing(p) for p in a['innerrings']]

                polygons = []
                for r in rings:
                    inners = []
                    for ir in innerrings:
                        if r.contains(ir):
                            inners.append(ir)

                    polygons.append(Poly(r, inners))

                area_polys.append(MultiPolygon(polygons))

            points = [Point(p) for p in zip(self.latitude.ravel(),
                                            self.longitude.ravel())]

            indicies = []
            for a in area_polys:
                indicies.append(np.where(
                    list(map(
                        lambda p, poly=a: poly.contains(p),
                        points
                    ))
                )[0])

            indicies = np.unique(np.array(indicies).ravel())
            newmask = np.ones(self.data.shape, dtype=bool)
            newmask[np.unravel_index(indicies, newmask.shape)] = False
            self.data.mask |= newmask

        self.depth_value_map = depth_value_map

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.3f" % x)
        data = float_to_str(self.data.ravel()[::5])
        station = ["%06d" % x for x in range(1, len(data) + 1)]

        latitude = self.latitude.ravel()[::5]
        longitude = self.longitude.ravel()[::5]
        time = np.repeat(self.timestamp, data.shape[0])
        depth = self.depth_value_map.ravel()[::5]

        return super(MapPlotter, self).odv_ascii(
            self.dataset_name,
            [self.variable_name],
            [self.variable_unit],
            station,
            latitude,
            longitude,
            depth,
            time,
            data
        )

    def csv(self):
        # If the user has selected the display of quiver data in the browser,
        # then also export that data in the CSV file.
        if self.quiver is not None and \
            self.quiver['variable'] != '' and \
                self.quiver['variable'] != 'none':
            have_quiver = True
        else:
            have_quiver = False

        header = [
            ['Dataset', self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "%s (%s)" % (self.variable_name, self.variable_unit)
        ]
        data_in = self.data.ravel()[::5]
        if have_quiver:
            # Include bearing information in the exported data, as per user
            # requests.
            columns.extend([
                "%s X (%s)" % (self.quiver_name, self.quiver_unit),
                "%s Y (%s)" % (self.quiver_name, self.quiver_unit),
                "Bearing (degrees clockwise positive from North)"
            ])
            quiver_data_in = (self.quiver_data_fullgrid[0].ravel()[::5],
                              self.quiver_data_fullgrid[1].ravel()[::5])
            bearing = np.arctan2(self.quiver_data_fullgrid[1].ravel()[::5],
                                 self.quiver_data_fullgrid[0].ravel()[::5])
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi

        latitude = self.latitude.ravel()[::5]
        longitude = self.longitude.ravel()[::5]
        depth = self.depth_value_map.ravel()[::5]

        data = []
        for idx in range(0, len(latitude)):
            if np.ma.is_masked(data_in[idx]):
                continue

            entry = [
                "%0.4f" % latitude[idx],
                "%0.4f" % longitude[idx],
                "%0.1f" % depth[idx],
                "%0.3f" % data_in[idx]
            ]
            if have_quiver:
                entry.extend([
                    "%0.3f" % quiver_data_in[0][idx],
                    "%0.3f" % quiver_data_in[1][idx],
                    "%0.3f" % bearing[idx]
                ])
            data.append(entry)

        return super(MapPlotter, self).csv(header, columns, data)

    def pole_proximity(self, points):
        near_pole, covers_pole, quad1, quad2, quad3, quad4 = False, False, False, False, False, False
        for p in points:
            if abs(p[0]) > 80:
                near_pole = True
            if -180 <= p[1] <= -90:
                quad1 = True
            elif -90 <= p[1] <= 0:
                quad2 = True
            elif 0 <= p[1] <= 90:
                quad3 = True
            elif 90 <= p[1] <= 180:
                quad4 = True
            if quad1 and quad2 and quad3 and quad4:
                covers_pole = True

        return near_pole, covers_pole

    def plot(self):
        if self.filetype == 'geotiff':
            f, fname = tempfile.mkstemp()
            os.close(f)

            driver = gdal.GetDriverByName('GTiff')
            outRaster = driver.Create(fname,
                                      self.latitude.shape[1],
                                      self.longitude.shape[0],
                                      1, gdal.GDT_Float64)
            x = [self.longitude[0, 0], self.longitude[-1, -1]]
            y = [self.latitude[0, 0], self.latitude[-1, -1]]
            outRasterSRS = osr.SpatialReference()

            x, y = self.basemap(x, y)
            outRasterSRS.ImportFromProj4(self.basemap.proj4string)

            pixelWidth = (x[-1] - x[0]) / self.longitude.shape[0]
            pixelHeight = (y[-1] - y[0]) / self.latitude.shape[0]
            outRaster.SetGeoTransform((x[0], pixelWidth, 0, y[0], 0,
                                       pixelHeight))

            outband = outRaster.GetRasterBand(1)
            d = self.data.astype("Float64")
            ndv = d.fill_value
            outband.WriteArray(d.filled(ndv))
            outband.SetNoDataValue(ndv)
            outRaster.SetProjection(outRasterSRS.ExportToWkt())
            outband.FlushCache()
            outRaster = None

            with open(fname, 'r', encoding="latin-1") as f:
                buf = f.read()
            os.remove(fname)

            return (buf, self.mime, self.filename.replace(".geotiff", ".tif"))
        # Figure size
        figuresize = list(map(float, self.size.split("x")))
        fig = plt.figure(figsize=figuresize, dpi=self.dpi)
        ax = plt.gca()

        if self.scale:
            vmin = self.scale[0]
            vmax = self.scale[1]
        else:
            vmin, vmax = utils.normalize_scale(self.data,
                                               self.dataset_config.variable[",".join(self.variables)])

        c = self.basemap.imshow(
            self.data, vmin=vmin, vmax=vmax, cmap=self.cmap)

        if len(self.quiver_data) == 2:
            qx, qy = self.quiver_data
            qx, qy, x, y = self.basemap.rotate_vector(qx, qy,
                                                      self.quiver_longitude,
                                                      self.quiver_latitude,
                                                      returnxy=True)
            qx = np.ma.masked_where(np.ma.getmask(self.quiver_data[0]), qx)
            qy = np.ma.masked_where(np.ma.getmask(self.quiver_data[1]), qy)
            quiver_mag = np.sqrt(qx ** 2 + qy ** 2)

            if self.quiver['magnitude'] != 'length':
                qx = qx / quiver_mag
                qy = qy / quiver_mag
                qscale = 50
            else:
                qscale = None

            if self.quiver['magnitude'] == 'color':
                if self.quiver['colormap'] is None or \
                   self.quiver['colormap'] == 'default':
                    qcmap = colormap.colormaps.get('speed')
                else:
                    qcmap = colormap.colormaps.get(self.quiver['colormap'])
                q = self.basemap.quiver(
                    x, y,
                    qx, qy,
                    quiver_mag,
                    width=0.0035,
                    headaxislength=4, headlength=4,
                    scale=qscale,
                    pivot='mid',
                    cmap=qcmap,
                )
            else:
                q = self.basemap.quiver(
                    x, y,
                    qx, qy,
                    width=0.0025,
                    headaxislength=4, headlength=4,
                    scale=qscale,
                    pivot='mid',
                )

            if self.quiver['magnitude'] == 'length':
                unit_length = np.mean(quiver_mag) * 2
                unit_length = np.round(unit_length,
                                       -int(np.floor(np.log10(unit_length))))
                if unit_length >= 1:
                    unit_length = int(unit_length)

                plt.quiverkey(q, .65, .01,
                              unit_length,
                              self.quiver_name.title() + " " +
                              str(unit_length) + " " +
                              utils.mathtext(self.quiver_unit),
                              coordinates='figure',
                              labelpos='E')

        if self.show_bathymetry:
            # Plot bathymetry on top
            cs = self.basemap.contour(
                self.longitude, self.latitude, self.bathymetry, latlon=True,
                linewidths=0.5,
                norm=LogNorm(vmin=1, vmax=6000),
                cmap=mcolors.LinearSegmentedColormap.from_list(
                    'transparent_gray',
                    [(0, 0, 0, 0.5), (0, 0, 0, 0.1)]
                ),
                levels=[100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000])
            plt.clabel(cs, fontsize='xx-small', fmt='%1.0fm')

        if self.area and self.show_area:
            for a in self.area:
                polys = []
                for co in a['polygons'] + a['innerrings']:
                    coords = np.array(co).transpose()
                    mx, my = self.basemap(coords[1], coords[0])
                    map_coords = list(zip(mx, my))
                    polys.append(Polygon(map_coords))

                paths = []
                for poly in polys:
                    paths.append(poly.get_path())
                path = concatenate_paths(paths)

                poly = PathPatch(path,
                                 fill=None,
                                 edgecolor='#ffffff',
                                 linewidth=5
                                 )
                plt.gca().add_patch(poly)
                poly = PathPatch(path,
                                 fill=None,
                                 edgecolor='k',
                                 linewidth=2
                                 )
                plt.gca().add_patch(poly)

            if self.names is not None and len(self.names) > 1:
                for idx, name in enumerate(self.names):
                    x, y = self.basemap(
                        self.centroids[idx].y, self.centroids[idx].x)
                    plt.annotate(
                        xy=(x, y),
                        s=name,
                        ha='center',
                        va='center',
                        size=12,
                        # weight='bold'
                    )

        if len(self.contour_data) > 0:
            if (self.contour_data[0].min() != self.contour_data[0].max()):
                cmin, cmax = utils.normalize_scale(
                    self.contour_data[0],
                    self.dataset_config.variable[self.contour['variable']]
                )
                levels = None
                if self.contour.get('levels') is not None and \
                    self.contour['levels'] != 'auto' and \
                        self.contour['levels'] != '':
                    try:
                        levels = list(
                            set(
                                [float(xx)
                                 for xx in self.contour['levels'].split(",")
                                 if xx.strip()]
                            )
                        )
                        levels.sort()
                    except ValueError:
                        pass

                if levels is None:
                    levels = np.linspace(cmin, cmax, 5)
                cmap = self.contour['colormap']
                if cmap is not None:
                    cmap = colormap.colormaps.get(cmap)
                    if cmap is None:
                        cmap = colormap.find_colormap(self.contour_name)

                if not self.contour.get('hatch'):
                    contours = self.basemap.contour(
                        self.longitude, self.latitude, self.contour_data[
                            0], latlon=True,
                        linewidths=2,
                        levels=levels,
                        cmap=cmap)

                    # Adds labels to the contour lines
                    if self.contour.get('clabel'):
                        plt.clabel(contours, inline=1, fontsize=10)
                
                else:
                    hatches = [
                        '//', 'xx', '\\\\', '--', '||', '..', 'oo', '**'
                    ]
                    if len(levels) + 1 < len(hatches):
                        hatches = hatches[0:len(levels) + 2]
                    self.basemap.contour(
                        self.longitude, self.latitude, self.contour_data[
                            0], latlon=True,
                        linewidths=1,
                        levels=levels,
                        colors='k')
                    contours = self.basemap.contourf(
                        self.longitude, self.latitude, self.contour_data[0],
                        latlon=True, colors=['none'],
                        levels=levels,
                        hatches=hatches,
                        vmin=cmin, vmax=cmax, extend='both')

                if self.contour['legend']:
                    handles, l = contours.legend_elements()
                    labels = []
                    for i, lab in enumerate(l):
                        if self.contour.get('hatch'):
                            if self.contour_unit == 'fraction':
                                if i == 0:
                                    labels.append("$x \\leq {0: .0f}\\%$".
                                                  format(levels[i] * 100))
                                elif i == len(levels):
                                    labels.append("$x > {0: .0f}\\%$".
                                                  format(levels[i - 1] * 100))
                                else:
                                    labels.append(
                                        "${0:.0f}\\% < x \\leq {1:.0f}\\%$".
                                        format(levels[i - 1] * 100,
                                               levels[i] * 100))
                            else:
                                if i == 0:
                                    labels.append("$x \\leq %.3g$" %
                                                  levels[i])
                                elif i == len(levels):
                                    labels.append("$x > %.3g$" %
                                                  levels[i - 1])
                                else:
                                    labels.append("$%.3g < x \\leq %.3g$" %
                                                  (levels[i - 1], levels[i]))
                        else:
                            if self.contour_unit == 'fraction':
                                labels.append("{0:.0%}".format(levels[i]))
                            else:
                                labels.append("%.3g %s" % (
                                    levels[i],
                                    utils.mathtext(self.contour_unit)
                                ))

                    ax = plt.gca()

                    if self.contour_unit != 'fraction' and not \
                            self.contour.get('hatch'):
                        contour_title = "%s (%s)" % (
                            self.contour_name, utils.mathtext(
                                self.contour_unit)
                        )
                    else:
                        contour_title = self.contour_name

                    leg = ax.legend(handles[::-1], labels[::-1],
                                    loc='lower left', fontsize='medium',
                                    frameon=True, framealpha=0.75,
                                    title=contour_title)
                    leg.get_title().set_fontsize('medium')
                    if not self.contour.get('hatch'):
                        for legobj in leg.legendHandles:
                            legobj.set_linewidth(3)

        # Map Info
        self.basemap.drawmapboundary(fill_color=(0.3, 0.3, 0.3), zorder=-1)
        self.basemap.drawcoastlines(linewidth=0.5)
        self.basemap.fillcontinents(color='grey', lake_color='dimgrey')

        def find_lines(values):
            if np.amax(values) - np.amin(values) < 1:
                return [values.mean()]
            elif np.amax(values) - np.amin(values) < 25:
                return np.round(
                    np.arange(
                        np.amin(values),
                        np.amax(values),
                        round(
                            np.amax(values) - np.amin(values)) / 5
                    )
                )
            else:
                return np.arange(
                    round(np.amin(values), -1),
                    round(np.amax(values), -1),
                    5
                )

        parallels = find_lines(self.latitude)
        meridians = find_lines(self.longitude)
        self.basemap.drawparallels(
            parallels, labels=[1, 0, 0, 0], color=(0, 0, 0, 0.5))
        self.basemap.drawmeridians(
            meridians, labels=[0, 0, 0, 1], color=(0, 0, 0, 0.5), latmax=85)

        title = self.plotTitle

        if self.plotTitle is None or self.plotTitle == "":
            area_title = "\n".join(
                wrap(", ".join(self.names), 60)
            ) + "\n"

            title = "%s %s %s, %s" % (
                area_title,
                self.variable_name.title(),
                self.depth_label,
                self.date_formatter(self.timestamp)
            )
        plt.title(title.strip())
        ax = plt.gca()
        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)
        bar.set_label("%s (%s)" % (self.variable_name.title(),
                                   utils.mathtext(self.variable_unit)), fontsize=14)

        if self.quiver is not None and \
            self.quiver['variable'] != '' and \
            self.quiver['variable'] != 'none' and \
                self.quiver['magnitude'] == 'color':
            bax = divider.append_axes("bottom", size="5%", pad=0.35)
            qbar = plt.colorbar(q, orientation='horizontal', cax=bax)
            qbar.set_label(
                self.quiver_name.title() + " " +
                utils.mathtext(self.quiver_unit), fontsize=14)

        fig.tight_layout(pad=3, w_pad=4)

        return super(MapPlotter, self).plot(fig)
