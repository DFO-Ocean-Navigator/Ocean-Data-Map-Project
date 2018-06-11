from netCDF4 import Dataset, netcdftime, date2num
from flask_babel import format_date
import dateutil.parser
from data.data import Data, Variable, VariableList
from oceannavigator.nearest_grid_point import find_nearest_grid_point
import xarray as xr
import os
from cachetools import TTLCache
import pytz
import warnings
import pyresample
import numpy as np
import re
import geopy
import pandas
import zipfile

class NetCDFData(Data):

    def __init__(self, url: str):
        self._dataset: [xr.core.dataset.Dataset, Dataset] = None
        self._variable_list: VariableList = None
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)
        super(NetCDFData, self).__init__(url)

    def __enter__(self):
        # Don't decode times since we do it anyways.
        self._dataset = xr.open_dataset(self.url, decode_times=False)
        
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._dataset.close()

    """

    """
    def subset(self, query):
        
        # Ensure we have an output folder that will be cleaned by tmpreaper
        if not os.path.isdir("/tmp/subset"):
            os.makedirs("/tmp/subset")
        working_dir = "/tmp/subset/"
        
        entire_globe = True # subset the globe?
        if 'min_range' in query:
            # Area explicitly specified
            entire_globe = False
            # Bounding box extents
            bottom_left = [float(x) for x in query.get('min_range').split(',')]
            top_right = [float(x) for x in query.get('max_range').split(',')]

        # Time range
        try:
            time_range = [int(x) for x in query.get('time').split(',')]
        except ValueError:
            # Time is in ISO 8601 format
            # Get time index from dataset
            time_range = [dateutil.parser.parse(x) for x in query.get('time').split(',')]
            time_var = self.__get_time_variable()
            time_range = [date2num(x, time_var.attrs['units']) for x in time_range]
            time_range = [np.where(time_var.values == x)[0] for x in time_range]

        apply_time_range = False
        if time_range[0] != time_range[1]:
            apply_time_range = True

        # Finds a variable in a dictionary given a substring containing common characters
        # Not a fool-proof method but I want to avoid regex because I hate it.
        variable_list = list(self._dataset.variables.keys())
        def find_variable(substring):
            for key in variable_list:
                if substring in key:
                    return key

        # Get lat/lon variable names from dataset (since they all differ >.>)
        lat = find_variable("lat")
        lon = find_variable("lon")

        if not entire_globe:
            # Find closest indices in dataset corresponding to each calculated point
            ymin_index, xmin_index, _ = find_nearest_grid_point(
                bottom_left[0], bottom_left[1], self._dataset, self._dataset.variables[lat], self._dataset.variables[lon]
            )
            ymax_index, xmax_index, _ = find_nearest_grid_point(
                top_right[0], top_right[1], self._dataset, self._dataset.variables[lat], self._dataset.variables[lon]
            )

            y_slice = slice(ymin_index, ymax_index)
            x_slice = slice(xmin_index, xmax_index)

            # Get nicely formatted bearings
            p0 = geopy.Point(bottom_left)
            p1 = geopy.Point(top_right)
        else:
            y_slice = slice(self._dataset.variables[lat].size)
            x_slice = slice(self._dataset.variables[lon].size)

            p0 = geopy.Point([-85.0, -180.0])
            p1 = geopy.Point([85.0, 180.0])

        # Get timestamp
        time_variable = find_variable("time")
        timestamp = str(format_date(pandas.to_datetime(np.float64(self._dataset[time_variable][time_range[0]].values)), "yyyyMMdd"))
        endtimestamp = ""
        if apply_time_range:
            endtimestamp = "-" + str(format_date(pandas.to_datetime(np.float64(self._dataset[time_variable][time_range[1]].values)), "yyyyMMdd"))
        
        dataset_name = query.get('dataset_name')
        # Do subsetting
        if "riops" in dataset_name:
            # Riops has different coordinate names...why? ¯\_(ツ)_/¯
            subset = self._dataset.isel(yc=y_slice, xc=x_slice)
        elif dataset_name == "giops_forecast":
            subset = self._dataset.isel(latitude=y_slice, longitude=x_slice)
        else:
            subset = self._dataset.isel(y=y_slice, x=x_slice)

        # Select requested time (time range if applicable)
        if apply_time_range:
            subset = subset.isel(**{time_variable: slice(int(time_range[0]), int(time_range[1]) + 1)}) # slice doesn't include the last element
        else:
            subset = subset.isel(**{time_variable: slice(int(time_range[0]), int(time_range[0]) + 1)})

        # Filter out unwanted variables
        output_vars = query.get('variables').split(',')
        output_vars.extend([find_variable("depth"), time_variable, lat, lon]) # Keep the coordinate variables
        for variable in subset.data_vars:
            if variable not in output_vars:
                subset = subset.drop(variable)

        output_format = query.get('output_format')
        filename =  dataset_name + "_" + "%dN%dW-%dN%dW" % (p0.latitude, p0.longitude, p1.latitude, p1.longitude) \
                    + "_" + timestamp + endtimestamp + "_" + output_format

        # Save subset normally
        subset.to_netcdf(working_dir + filename + ".nc", format=output_format)

        if int(query.get('should_zip')) == 1:
            myzip = zipfile.ZipFile('%s%s.zip' % (working_dir, filename), mode='w')
            myzip.write('%s%s.nc' % (working_dir, filename), os.path.basename('%s%s.nc' % (working_dir, filename)))
            myzip.comment = b"Generated from www.navigator.oceansdata.ca"
            myzip.close() # Must be called to actually create zip
            return working_dir, filename+".zip"

        return working_dir, filename+".nc"
    
    """
        Interpolates data given input and output definitions
        and the selected interpolation algorithm.
    """
    def _interpolate(self, input_def, output_def, data):
        
        # Ignore pyresample warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            warnings.simplefilter("ignore", UserWarning)
            
            # Interpolation with gaussian weighting
            if self.interp == "gaussian":
                return pyresample.kd_tree.resample_gauss(input_def, data,
                    output_def, radius_of_influence=float(self.radius), sigmas=self.radius / 2, fill_value=None,
                    nprocs=8)

            # Bilinear weighting
            elif self.interp == "bilinear":
                """
                    Weight function used to determine the effect of surrounding points
                    on a given point
                """
                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps,
                                np.finfo(r.dtype).max)
                    return 1. / r

                return pyresample.kd_tree.resample_custom(input_def, data,
                    output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                    weight_funcs=weight, nprocs=8)

            # Inverse-square weighting
            elif self.interp == "inverse":
                """
                    Weight function used to determine the effect of surrounding points
                    on a given point
                """
                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps,
                                np.finfo(r.dtype).max)
                    return 1. / r ** 2

                return pyresample.kd_tree.resample_custom(input_def, data,
                    output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                    weight_funcs=weight, nprocs=8)


            # Nearest-neighbour interpolation (junk)
            elif self.interp == "nearest":

                return pyresample.kd_tree.resample_nearest(input_def, data,
                    output_def, radius_of_influence=float(self.radius), nprocs=8)
       
    def __get_time_variable(self):
        for v in self.time_variables:
            if v in self._dataset.variables.keys():
                # Get the xarray.DataArray for time variable
                return self._dataset.variables[v]

    """
        Returns the possible names of the depth dimension in the dataset
    """
    @property
    def depth_dimensions(self) -> list:
        return ['depth', 'deptht', 'z']

    """
        Returns the value of a given variable name from the dataset
    """
    def get_dataset_variable(self, key: str):
        return self._dataset.variables[key]

    """
        Returns a list of all data variables and their 
        attributes in the dataset.
    """
    @property
    def variables(self):
        # Check if variable list has been created yet.
        # This saves approx 3 lookups per tile, and
        # over a dozen when a new dataset is loaded.
        if self._variable_list == None:
            l = []
            # Get "data variables" from dataset
            variables = list(self._dataset.data_vars.keys())

            for name in variables:
                # Get variable DataArray
                # http://xarray.pydata.org/en/stable/api.html#dataarray
                var = self._dataset.variables[name]

                # Get variable attributes
                attrs = list(var.attrs.keys())
            
                if 'long_name' in attrs:
                    long_name = var.attrs['long_name']
                else:
                    long_name = name

                if 'units' in attrs:
                    units = var.attrs['units']
                else:
                    units = None

                if 'valid_min' in attrs:
                    valid_min = float(re.sub(r"[^0-9\.\+,eE]", "",
                                             str(var.attrs['valid_min'])))
                    valid_max = float(re.sub(r"[^0-9\,\+,eE]", "",
                                         str(var.attrs['valid_max'])))
                else:
                    valid_min = None
                    valid_max = None

                # Add to our "Variable" wrapper
                l.append(Variable(name, long_name, units, var.dims,
                              valid_min, valid_max))

            self._variable_list = VariableList(l) # Cache the list for later
        
        return self._variable_list

    """
        Returns the possible names of the time dimension in the dataset
    """
    @property
    def time_variables(self):
        return ['time', 'time_counter', 'Times']

    """
        Loads, caches, and returns the time dimension from a dataset.
    """
    @property
    def timestamps(self):
        # If the timestamp cache is empty
        if self.__timestamp_cache.get("timestamps") is None:
            
            var = self.__get_time_variable()

            # Convert timestamps to UTC
            t = netcdftime.utime(var.attrs['units']) # Get time units from variable
            time_list = list(map(
                                lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
                                var.values
                            ))
            timestamps = np.array(time_list)
            timestamps.setflags(write=False) # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")
