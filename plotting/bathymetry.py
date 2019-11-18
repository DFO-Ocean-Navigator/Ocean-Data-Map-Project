import copy
import os
import tempfile
from textwrap import wrap

import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import numpy as np
import osr
import json
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
from flask import render_template
from flask import Response
import cmocean 
# New PLOTLY imports
from plotly.offline import plot
from plotly.graph_objs import Scatter, Surface, Layout

class BathPlotter(Plotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = 'map'

        super(BathPlotter, self).__init__(dataset_name, query, **kwargs)

    def parse_query(self, query):
        super(BathPlotter, self).parse_query(query)

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
            self.cmap = cmap = colormap.find_colormap(self.compare.get('colormap_diff'))
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

        return super(BathPlotter, self).odv_ascii(
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

        return super(BathPlotter, self).csv(header, columns, data)

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

        
        bathymetry = np.multiply(self.bathymetry, -1)
        data = np.multiply(self.data, -1)
        idxs = np.where(data < bathymetry)
        data[idxs] = bathymetry[idxs]
        
        lon = self.longitude
        lat = self.latitude
        
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
        layout = Layout(title="hello world", xaxis={"title": "Longitude"}, yaxis={"title": "Latitude"})
        #my_plot_div = plot([Scatter(x=[1,2,3], y=[3,1,6])], output_type='div')
        my_plot_div = plot({
            "data": [Surface(z=bathymetry, x=self.longitude, y=self.latitude, colorscale='Earth'), Surface(z=data, x=self.longitude, y=self.latitude)],
            "layout": layout
        }, output_type='div',)

        return Response(my_plot_div, status=200, mimetype='text/html')