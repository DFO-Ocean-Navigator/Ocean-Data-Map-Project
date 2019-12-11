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
#from plotly.offline import plot
#from plotly.graph_objs import Scatter, Surface, Layout
import plotly.graph_objs as go
import plotly.io as pio

class BathPlotter(Plotter3D):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = 'map'

        super(BathPlotter, self).__init__(dataset_name, query, **kwargs)        
  
    
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
        
        layers.append(go.Surface(z=bathymetry, x=self.longitude, y=self.latitude, colorscale='Earth', colorbar={"len": 1, "x":-0.1}, showscale=True))

        # Create and append layers for each layer of data (at this point variables and what not don't matter)
        # Should probably store the type in each layer (for now just do surface)
        for _, layer in enumerate(self.data):
            data = np.multiply(layer['data'], -1)
            idxs = np.where(data < bathymetry)
            data[idxs] = bathymetry[idxs]
            layers.append(go.Surface(z=data, x=self.longitude, y=self.latitude, colorscale='Electric', showscale=True))

        lon = self.longitude
        lat = self.latitude
        
        #old for reference
        #Surface(z=bathymetry, x=self.longitude, y=self.latitude, colorscale='Earth', colorbar={"len":1, "x":-0.1}, showscale=True), Surface(z=data, x=self.longitude, y=self.latitude, colorscale='Electric', showscale=True
        
        layout = go.Layout(autosize=True, title="Bathymetry with depth based variable", scene={"xaxis":{"title": "Longitude"}, "yaxis":{"title": "Latitude"}, "zaxis":{"title": "Depth"}})
        #plot_div = plot([Scatter(x=[1,2,3], y=[3,1,6])], output_type='div')
        #plot_div = plot({
        #    "data": layers,
        #    "layout": layout
        #}, output_type='div',)
        fig = go.Figure(data=layers, layout=layout)
        plot_div = pio.to_html(fig, full_html=True)
        return Response(plot_div, status=200, mimetype='text/html')