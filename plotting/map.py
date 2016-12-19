from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from mpl_toolkits.axes_grid1 import make_axes_locatable
from mpl_toolkits.basemap import maskoceans
import matplotlib.colors as mcolors
import numpy as np
import colormap
import basemap
import overlays
import utils
from data import load_interpolated, load_interpolated_grid
import gdal
import osr
import tempfile
import os
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url, get_dataset_climatology
from shapely.geometry import LinearRing
from shapely.ops import cascaded_union
from matplotlib.patches import Polygon
from matplotlib.bezier import concatenate_paths
from matplotlib.patches import PathPatch
from textwrap import wrap
from oceannavigator.misc import list_areas
import pyresample.utils
import area
from geopy.distance import VincentyDistance


class MapPlotter(area.AreaPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = 'map'
        super(MapPlotter, self).__init__(dataset_name, query, format)

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.3f" % x)
        data = np.ma.expand_dims(float_to_str(self.data.ravel()[::5]), 1)
        station = map(lambda x: "%06d" % x, range(1, len(data) + 1))

        latitude = self.latitude.ravel()[::5]
        longitude = self.longitude.ravel()[::5]
        time = np.repeat(self.timestamp, data.shape[0])
        if (self.depth != 'bottom'):
            depth = np.repeat(self.depth_value, data.shape[0])
        else:
            depth = self.bathymetry.ravel()[::5]

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

    def load_data(self):
        if self.projection == 'EPSG:32661':
            blat = min(self.bounds[0], self.bounds[2])
            blat = 5 * np.floor(blat / 5)
            self.basemap = basemap.load_map('npstere', (blat, 0), None, None)
        elif self.projection == 'EPSG:3031':
            blat = max(self.bounds[0], self.bounds[2])
            blat = 5 * np.ceil(blat / 5)
            self.basemap = basemap.load_map('spstere', (blat, 180), None, None)
        else:
            distance = VincentyDistance()
            height = distance.measure(
                (self.bounds[0], self.centroid[1]),
                (self.bounds[2], self.centroid[1])
            ) * 1000 * 1.25
            width = distance.measure(
                (self.centroid[0], self.bounds[1]),
                (self.centroid[0], self.bounds[3])
            ) * 1000 * 1.25
            self.basemap = basemap.load_map(
                'lcc', self.centroid, height, width
            )

        self.longitude, self.latitude = self.basemap.makegrid(500, 500)

        with Dataset(get_dataset_url(self.dataset_name), 'r') as dataset:
            time_var = utils.get_time_var(dataset)
            if self.time >= time_var.shape[0]:
                self.time = -1

            if self.time < 0:
                self.time += time_var.shape[0]

            self.variable_unit = get_variable_unit(
                self.dataset_name,
                dataset.variables[self.variables[0]])
            self.variable_name = get_variable_name(
                self.dataset_name,
                dataset.variables[self.variables[0]])

            if self.cmap is None:
                if len(self.variables) == 1:
                    self.cmap = colormap.find_colormap(self.variable_name)
                else:
                    self.cmap = colormap.colormaps.get('speed')

            if len(self.variables) == 2:
                self.variable_name = self.vector_name(self.variable_name)

            depth_var = utils.get_depth_var(dataset)

            depth_value = 0
            if depth_var is not None:
                if self.depth == 'bottom':
                    depth_value = 'Bottom'
                else:
                    if int(self.depth) >= depth_var.shape[0]:
                        self.depth = 0
                    self.depth = int(self.depth)
                    depth_value = depth_var[int(self.depth)]

            data = []
            allvars = []
            for v in self.variables:
                var = dataset.variables[v]
                allvars.append(v)
                d = load_interpolated_grid(
                    self.latitude, self.longitude, dataset, v,
                    self.depth, self.time,
                    interpolation=utils.get_interpolation(self.query))

                self.variable_unit, d = self.kelvin_to_celsius(
                    self.variable_unit, d)

                data.append(d)
                if len(var.shape) == 3:
                    self.depth_label = ""
                elif self.depth == 'bottom':
                    self.depth_label = " at Bottom"
                else:
                    self.depth_label = " at " + \
                        str(int(np.round(depth_value))) + " " + depth_var.units

            if len(data) == 2:
                data[0] = np.sqrt(data[0] ** 2 + data[1] ** 2)

            self.data = data[0]

            quiver_data = []
            if self.quiver_variables:
                for v in self.quiver_variables:
                    allvars.append(v)
                    var = dataset.variables[v]
                    quiver_unit = get_variable_unit(self.dataset_name, var)
                    quiver_name = get_variable_name(self.dataset_name, var)
                    quiver_lat, quiver_lon, d = load_interpolated(
                        self.basemap, 50, dataset, v, self.depth, self.time,
                        interpolation=utils.get_interpolation(self.query))
                    quiver_data.append(d)

                self.quiver_name = self.vector_name(quiver_name)
                self.quiver_longitude = quiver_lon
                self.quiver_latitude = quiver_lat
                self.quiver_unit = quiver_unit
            self.quiver_data = quiver_data

            if all(map(lambda v: len(dataset.variables[v].shape) == 3,
                       allvars)):
                self.depth = 0

            contour_data = []
            if self.contour is not None and \
                self.contour['variable'] != '' and \
                    self.contour['variable'] != 'none':
                lat, lon, d = load_interpolated(
                    self.basemap, 500, dataset,
                    self.contour['variable'],
                    self.depth, self.time,
                    interpolation=utils.get_interpolation(self.query))
                contour_unit = get_variable_unit(
                    self.dataset_name, self.contour['variable'])
                contour_name = get_variable_name(
                    self.dataset_name, self.contour['variable'])
                contour_unit, d = self.kelvin_to_celsius(contour_unit, d)
                contour_data.append(d)
                self.contour_unit = contour_unit
                self.contour_name = contour_name

            self.contour_data = contour_data

            t = netcdftime.utime(time_var.units)
            self.timestamp = t.num2date(time_var[self.time])

        if self.variables != self.variables_anom:
            self.variable_name += " Anomaly"
            with Dataset(
                get_dataset_climatology(self.dataset_name),
                'r'
            ) as dataset:
                data = []
                for v in self.variables:
                    var = dataset.variables[v]
                    d = load_interpolated_grid(
                        self.latitude, self.longitude, dataset, v,
                        self.depth, self.timestamp.month - 1,
                        interpolation=utils.get_interpolation(self.query))
                    data.append(d)

                if len(data) == 2:
                    data = np.sqrt(data[0] ** 2 + data[1] ** 2)
                else:
                    data = data[0]

                u, data = self.kelvin_to_celsius(
                    dataset.variables[self.variables[0]].units,
                    data)

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

            self.data[np.where(self.bathymetry < depth_value)] = np.ma.masked
            for d in self.quiver_data:
                d[np.where(quiver_bathymetry < depth_value)] = np.ma.masked
            for d in self.contour_data:
                d[np.where(self.bathymetry < depth_value)] = np.ma.masked
        else:
            mask = maskoceans(self.longitude, self.latitude, self.data).mask
            self.data[~mask] = np.ma.masked
            for d in self.quiver_data:
                mask = maskoceans(
                    self.quiver_longitude, self.quiver_latitude, d).mask
                d[~mask] = np.ma.masked
            for d in contour_data:
                mask = maskoceans(self.longitude, self.latitude, d).mask
                d[~mask] = np.ma.masked

        self.depth_value = depth_value

    def parse_query(self, query):
        super(MapPlotter, self).parse_query(query)

        self.projection = query.get('projection')

        self.area = query.get('area')

        names = []
        centroids = []
        all_rings = []
        data = None
        for idx, a in enumerate(self.area):
            if isinstance(a, str) or isinstance(a, unicode):
                a = a.encode("utf-8")
                sp = a.split('/', 1)
                if data is None:
                    data = list_areas(sp[0], simplify=False)

                b = [x for x in data if x.get('key') == a]
                a = b[0]
                self.area[idx] = a
            else:
                p = np.array(a['polygons'])
                p[:, :, 1] = pyresample.utils.wrap_longitudes(p[:, :, 1])
                a['polygons'] = p.tolist()
                del p

            rings = [LinearRing(p) for p in a['polygons']]
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

        quiver_variables = query.get('quiver')
        if quiver_variables is not None:
            quiver_variables = quiver_variables.split(",")
            if len(quiver_variables) != 2:
                quiver_variables = None

        self.quiver_variables = quiver_variables

        self.contour = query.get('contour')

    def plot(self):
        if self.filetype == 'geotiff':
            f, fname = tempfile.mkstemp()
            os.close(f)

            driver = gdal.GetDriverByName('GTiff')
            outRaster = driver.Create(fname,
                                      self.longitude.shape[0],
                                      self.latitude.shape[1],
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

            with open(fname, 'r') as f:
                buf = f.read()
            os.remove(fname)

            return (buf, self.mime, self.filename.replace(".geotiff", ".tif"))
        # Figure size
        figuresize = map(float, self.size.split("x"))
        fig = plt.figure(figsize=figuresize, dpi=self.dpi)

        if self.scale:
            vmin = self.scale[0]
            vmax = self.scale[1]
        else:
            vmin = np.amin(self.data)
            vmax = np.amax(self.data)
            if self.variables != self.variables_anom:
                vmax = max(abs(vmax), abs(vmin))
                vmin = -vmax

        c = self.basemap.imshow(
            self.data, vmin=vmin, vmax=vmax, cmap=self.cmap)

        if len(self.quiver_data) == 2:
            qx, qy = self.quiver_data
            quiver_mag = np.sqrt(qx ** 2 + qy ** 2)

            if self.variables == self.quiver_variables:
                qx /= quiver_mag
                qy /= quiver_mag
                qscale = 100
            else:
                qscale = None

            q = self.basemap.quiver(
                self.quiver_longitude, self.quiver_latitude,
                qx, qy,
                latlon=True, width=0.0025,
                headaxislength=4, headlength=4,
                scale=qscale,
                pivot='mid'
            )

            if self.variables != self.quiver_variables:
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
                lineweight=0.5,
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
                    map_coords = zip(mx, my)
                    polys.append(Polygon(map_coords))

                paths = []
                for poly in polys:
                    paths.append(poly.get_path())
                path = concatenate_paths(paths)

                poly = PathPatch(path,
                                 fill=None,
                                 edgecolor='k',
                                 linewidth=1
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
                    self.contour_name, self.contour_unit
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
        self.basemap.drawmapboundary(fill_color=(0.3, 0.3, 0.3))
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

        area_title = "\n".join(
            wrap(", ".join(self.names), 60)
        ) + "\n"

        title = "%s %s %s, %s" % (
            area_title,
            self.variable_name.title(),
            self.depth_label,
            self.timestamp.strftime(self.dformat)
        )
        plt.title(title.strip())
        ax = plt.gca()
        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)
        bar.set_label("%s (%s)" % (self.variable_name.title(),
                                   utils.mathtext(self.variable_unit)))

        fig.tight_layout(pad=3, w_pad=4)

        return super(MapPlotter, self).plot(fig)
