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
from plotting.plotter_3d import Plotter3D
from utils.errors import ClientError, ServerError
from utils.misc import list_areas
from flask import render_template
from flask import Response
import cmocean 
# New PLOTLY imports
from plotly.offline import plot
from plotly.graph_objs import Scatter, Surface, Layout

class BathPlotter(Plotter3D):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = 'map'

        super(BathPlotter, self).__init__(dataset_name, query, **kwargs)        
  
    # THIS SHOULDN'T BE NEEDED ANYMORE
    # CONFIRMING BEFORE REMOVING
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
        
            # Important but not part of data gathering IMO
            self.timestamp = dataset.timestamp_to_iso_8601(self.time)

        
        # Load bathymetry data
        self.bathymetry = overlays.bathymetry(
            self.basemap,
            self.latitude,
            self.longitude,
            blur=2
        )

        
        mask = maskoceans(self.longitude, self.latitude,
                          self.data, True, 'h', 1.25).mask
        self.data[~mask] = np.ma.masked
        self.depth_value_map = depth_value_map

    
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
        
        # Old stuff that might still be useful
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
        
        # STUFF CURRENTLY BEING USED
        
        # Initialize var for plot layers
        layers = list()

        # Create surface plot for bathymetry
        bathymetry = np.multiply(self.bathymetry, -1)
        
        layers.append(Surface(z=bathymetry, x=self.longitude, y=self.latitude, colorscale='Earth', colorbar={"len": 1, "x":-0.1}, showscale=True))

        # Create and append layers for each layer of data (at this point variables and what not don't matter)
        # Should probably store the type in each layer (for now just do surface)
        for _, layer in enumerate(self.data):
            data = np.multiply(layer['data'], -1)
            idxs = np.where(data < bathymetry)
            data[idxs] = bathymetry[idxs]
            layers.append(Surface(z=data, x=self.longitude, y=self.latitude, colorscale='Electric', showscale=True))

        lon = self.longitude
        lat = self.latitude
        
        layout = Layout(title="Bathymetry with depth based variable", scene={"xaxis":{"title": "Longitude"}, "yaxis":{"title": "Latitude"}, "zaxis":{"title": "Depth"}})
        #my_plot_div = plot([Scatter(x=[1,2,3], y=[3,1,6])], output_type='div')
        my_plot_div = plot({
            "data": layers,
            "layout": layout
        }, output_type='div',)

        return Response(my_plot_div, status=200, mimetype='text/html')