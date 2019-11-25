import contextlib
import datetime
import re
import numpy as np
import copy
import os
import osr
import json
import tempfile
import cmocean 
import pint
import plotting.colormap as colormap
import plotting.basemap as basemap
import plotting.overlays as overlays
import plotting.utils as utils
import pyresample.utils

from data import open_dataset
from oceannavigator import DatasetConfig
from abc import ABCMeta, abstractmethod
from io import BytesIO, StringIO
from flask_babel import format_date, format_datetime
from textwrap import wrap
from flask_babel import gettext
from geopy.distance import VincentyDistance
from osgeo import gdal

from matplotlib.bezier import concatenate_paths
from matplotlib.colors import LogNorm
from matplotlib.patches import PathPatch, Polygon
from mpl_toolkits.axes_grid1 import make_axes_locatable
from mpl_toolkits.basemap import maskoceans

from shapely.geometry import LinearRing, MultiPolygon, Point
from shapely.geometry import Polygon as Poly
from shapely.ops import cascaded_union

from utils.errors import ClientError, ServerError
from utils.misc import list_areas



class Area():

    def __init__(self, area, interp, neighbours, radius, projection):

        # This deals with interpolation information
        # Static because depth is not important at this time (but could be later)
        # Relied on in load_data stuff
        self.interp: str = "gaussian"
        self.radius: int = 25000  # radius in meters
        self.neighbours: int = 10
        self.projection = projection

        # Prep some stuff to get the lon and lat
        # STUFF IN BETWEEN HASH TAGS DOESN'T REALLY BELONG IN THIS FUNCTION
        ################################################################
        self.area = area
        centroids = []

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

        self.calc_latlon()
        ################################################################
        
        # Get lat and lons and stores as self.latitude and self.longitude
        #self.get_lat_lon()

        # This could probably be run in parallel to loading the rest of the data
        #self.get_bathymetry()

       
    def get_bathymetry(self):
        
        if not hasattr(self,'bathymetry'):
            # Load bathymetry data
            self.bathymetry = np.multiply(overlays.bathymetry(
                self.basemap,
                self.latitude,
                self.longitude,
                blur=2
            ), -1)

        return self.bathymetry

        
    
    def calc_latlon(self):
        """
            The only thing I know about this function is that it gets the latitudes and longitudes

            I know it deals with weird edge cases etc. but
            honestly it looks like gibberish
        """

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
        
        return self.latitude, self.longitude 

    def get_latlon(self):
        return self.latitude, self.longitude
    
    def get_variable(self, dataset, variable, depth, time):
        """
            Called from load_dataset_data

            This is a helper function which will load the variable data for a particular dataset and variable
            
            This should only add a data variable to the variable_obj, thereby maintaining all the settings for when it is actually plotted
        """
        
        time = self.__get_time(time)
        
        data = None

        # Get Dataset Config
        dataset_config = DatasetConfig(dataset)

        # Open the dataset
        with open_dataset(dataset_config, variable=variable, timestamp=time) as dataset:
            
            # Also for extras like plot titles and labels etc.
            variable_unit = self.get_variable_units(
                dataset, dataset_config, [variable]
            )[0]
            
            # Gets the name of the variable given it's id
            # This is probably not going to be used for data gathering but should be inserted into the 
            # variable object for use in generating titles etc.
            variable_name = self.get_variable_names(
                dataset,
                dataset_config,
                [variable]
            )[0]
            
            # Gets the scale factor of the variable
            # Scale factor is the value to multiply data by to get the actual value
            scale_factor = self.get_variable_scale_factors(
                dataset, dataset_config, [variable]
            )[0]


            var = dataset.variables[variable]
            
            # This CSV... stuff may actually be important but not for that therefore just skip for now
            if False:# or self.filetype in ['csv', 'odv', 'txt']:
                data, depth_value_map = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    depth,
                    time,
                    variable,
                    self.interp,
                    self.radius,
                    self.neighbours,
                    return_depth=True
                )
            else:
                data = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    depth,
                    time,
                    variable,
                    self.interp,
                    self.radius,
                    self.neighbours
                )
            data = np.multiply(data, scale_factor)
        
        data = np.multiply(data, -1)
        return data


    def get_variable_names(self, dataset, dataset_config, variables):
        """Returns a list of names for the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        names = []

        for _, v in enumerate(variables):
            names.append(
                dataset_config.variable[dataset.variables[v]].name)

        return names

    def get_variable_units(self, dataset, dataset_config, variables):
        """Returns a list of units for the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        units = []

        for idx, v in enumerate(variables):
            units.append(
                dataset_config.variable[dataset.variables[v]].unit)

        return units

    def get_variable_scale_factors(self, dataset, dataset_config, variables):
        """Returns a list of scale factors for the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        factors = []

        for idx, v in enumerate(variables):
            factors.append(
                dataset_config.variable[dataset.variables[v]].scale_factor)

        return factors


    def __get_time(self, param: str):
        if param is None or len(str(param)) == 0:
            return -1
        else:
            try:
                return int(param)
            except ValueError:
                return param