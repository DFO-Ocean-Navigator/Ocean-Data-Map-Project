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