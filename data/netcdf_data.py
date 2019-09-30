#!/usr/bin/env python

import datetime
import os
import re
import uuid
import warnings
import zipfile

import cftime
import dateutil.parser
import geopy
import netCDF4
import numpy as np
import pandas
import pint
import pyresample
import xarray as xr
from cachetools import TTLCache
from flask_babel import format_date

import data.calculated
from data.data import Data
from data.nearest_grid_point import find_nearest_grid_point
from data.sqlite_database import SQLiteDatabase
from data.utils import time_index_to_datetime
from data.variable import Variable
from data.variable_list import VariableList
from utils.errors import ServerError


class NetCDFData(Data):

    def __init__(self, url: str, **kwargs):
        self._dataset: [xr.core.dataset.Dataset, netCDF4.Dataset] = None
        self._variable_list: VariableList = None
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)
        self._nc_files: list = kwargs.get('nc_files')
        self._grid_angle_file_url: str = kwargs.get('grid_angle_file_url')
        self._time_variable: xr.IndexVariable = None
        self._meta_only: bool = kwargs.get('meta_only', False)
        self._dataset_open: bool = False

        super(NetCDFData, self).__init__(url)

    def __enter__(self):
        if not self._meta_only:
            # Don't decode times since we do it anyways.
            decode_times = False
            
            if self._nc_files:
                self._dataset = xr.open_mfdataset(
                    self._nc_files, decode_times=decode_times)
            else:
                self._dataset = xr.open_dataset(
                    self.url, decode_times=decode_times)
            
            if self._grid_angle_file_url:
                angle_file = xr.open_mfdataset(
                    self._grid_angle_file_url, drop_variables=['nav_lat', 'nav_lon'])
                self._dataset.merge(angle_file)
                angle_file.close()

            self._dataset_open = True

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self._dataset_open:
            self._dataset.close()
            self._dataset_open = False

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var):
        pass

    def __find_variable(self, candidates: list):
        """Finds a matching variable in the dataset given a list
        of candidate keys.

        Arguments:
            candidates {list} -- list of possible variable key strings

        Returns:
            xArray.DataArray -- the corresponding variable's DataArray
        """
        for c in candidates:
            if c in self._dataset.variables.keys():
                return self._dataset.variables[c]

        raise KeyError("None of ", candidates,
                       " where found in ", self._dataset)

    def timestamp_to_time_index(self, timestamp):
        """Converts a given timestamp (e.g. 2031436800) into the corresponding
        time index(es) for the time dimension.

        Arguments:
            timestamp {int or list} -- Raw timestamp(s).

        Returns:
            [int or list] -- Time index(es).
        """

        time_var = self.time_variable

        result = np.nonzero(np.isin(time_var, timestamp))[0]

        return result if result.shape[0] > 1 else result[0]

    def timestamp_to_iso_8601(self, timestamp):

        time_var = self.time_variable

        result = time_index_to_datetime(timestamp, time_var.attrs['units'])

        return result if len(result) > 1 else result[0]

    """
        Converts ISO 8601 Extended date, to the corresponding dataset time index
    """

    def convert_to_timestamp(self, date: str):

        # Time is in ISO 8601 Extended format
        # Get time index from dataset

        time_range = [dateutil.parser.parse(x) for x in date.split(',')]
        time_var = self.time_variable
        time_range[0] = time_range[0].replace(tzinfo=None)
        time_range = [netCDF4.date2num(
            x, time_var.attrs['units']) for x in time_range]
        time_range = [np.where(time_var.values == x)[0] for x in time_range]

        if len(time_range) == 1:  # Single Date
            return int(str(time_range[0][0]))
        else:  # Multiple Dates
            date_formatted = {}
            i = 0
            for x in date.split(','):   # x is a single date
                new_date = {x: int(str(time_range[i][0]))}
                date_formatted.update(new_date)  # Add Next pair
                i += 1
            return date_formatted

    """
        Subsets a netcdf file with all depths
    """

    def subset(self, query):

        # Ensure we have an output folder that will be cleaned by tmpreaper
        if not os.path.isdir("/tmp/subset"):
            os.makedirs("/tmp/subset")
        working_dir = "/tmp/subset/"

        entire_globe = True  # subset the globe?
        if 'min_range' in query:
            # Area explicitly specified
            entire_globe = False
            # Bounding box extents
            bottom_left = [float(x) for x in query.get('min_range').split(',')]
            top_right = [float(x) for x in query.get('max_range').split(',')]

        # Time range
        try:
            # Time is an index into timestamps array
            time_range = [self.timestamp_to_time_index(
                int(x)) for x in query.get('time').split(',')]
        except ValueError:
            # Time is in ISO 8601 format and we need the dataset quantum

            """
            quantum = query.get('quantum')
            if quantum == 'day' or quantum == 'hour':
                def find_time_index(isoDate: datetime.datetime):
                    for idx, date in enumerate(self.timestamps):
                        # Only compare year, month, day.
                        # Some daily/hourly average datasets have an
                        # hour and minute offset that messes up
                        # the index search.
                        if date.date() == isoDate.date():
                            return idx

            else:
                def find_time_index(isoDate: datetime.datetime):
                    for idx, date in enumerate(self.timestamps):
                        # Only compare year and month
                        if date.date().year == isoDate.date().year and \
                                date.date().month == isoDate.date().month:
                            return idx

            time_range = [dateutil.parser.parse(
                x) for x in query.get('time').split(',')]
            time_range = [find_time_index(x) for x in time_range]
            """
            raise ServerError("Not implemented.")

        apply_time_range = False
        if time_range[0] != time_range[1]:
            apply_time_range = True

        # Finds a variable in a dictionary given a substring containing common characters.
        # Don't use regex here since compiling a new pattern every call WILL add huge overhead.
        # This is guaranteed to be the fastest method.
        def find_variable(substring: str, variables: list):
            for key in variables:
                if substring in key:
                    return key
            return None

        # Get lat/lon variable names from dataset (since they all differ >.>)
        lat_var = find_variable("lat", list(self._dataset.variables.keys()))
        lon_var = find_variable("lon", list(self._dataset.variables.keys()))

        depth_var = find_variable(
            "depth", list(self._dataset.variables.keys()))

        # self.get_dataset_variable should be used below instead of
        # self._dataset.variables[...] because self._dataset.variables[...]
        # will go directly to the underlying dataset and will not handle
        # calculated variables.
        if not entire_globe:
            # Find closest indices in dataset corresponding to each calculated point
            ymin_index, xmin_index, _ = find_nearest_grid_point(
                bottom_left[0], bottom_left[1], self._dataset,
                self.get_dataset_variable(
                    lat_var), self.get_dataset_variable(lon_var)
            )
            ymax_index, xmax_index, _ = find_nearest_grid_point(
                top_right[0], top_right[1], self._dataset, self.get_dataset_variable(
                    lat_var), self.get_dataset_variable(lon_var)
            )

            # Compute min/max for each slice in case the values are flipped
            # the netCDF4 module does not support unordered slices
            y_slice = slice(min(ymin_index, ymax_index),
                            max(ymin_index, ymax_index))
            x_slice = slice(min(xmin_index, xmax_index),
                            max(xmin_index, xmax_index))

            # Get nicely formatted bearings
            p0 = geopy.Point(bottom_left)
            p1 = geopy.Point(top_right)
        else:
            y_slice = slice(self.get_dataset_variable(lat_var).size)
            x_slice = slice(self.get_dataset_variable(lon_var).size)

            p0 = geopy.Point([-85.0, -180.0])
            p1 = geopy.Point([85.0, 180.0])

        # Get timestamp
        time_var = find_variable("time", list(self._dataset.variables.keys()))
        timestamp = str(format_date(pandas.to_datetime(np.float64(
            self.get_dataset_variable(time_var)[time_range[0]].values)), "yyyyMMdd"))
        endtimestamp = ""
        if apply_time_range:
            endtimestamp = "-" + str(format_date(pandas.to_datetime(np.float64(
                self.get_dataset_variable(time_var)[time_range[1]].values)), "yyyyMMdd"))

        dataset_name = query.get('dataset_name')
        # Figure out coordinate dimension names
        if "riops" in dataset_name:
            lon_coord = "xc"
            lat_coord = "yc"
        elif dataset_name == "giops_forecast":
            lon_coord = "longitude"
            lat_coord = "latitude"
        else:
            lon_coord = "x"
            lat_coord = "y"
        # Do subset along coordinates
        subset = self._dataset.isel(**{lat_coord: y_slice, lon_coord: x_slice})

        # Select requested time (time range if applicable)
        if apply_time_range:
            # slice doesn't include the last element
            time_slice = slice(int(time_range[0]), int(time_range[1]) + 1)
        else:
            time_slice = slice(int(time_range[0]), int(time_range[0]) + 1)

        subset = subset.isel(**{time_var: time_slice})

        # Filter out unwanted variables
        output_vars = query.get('variables').split(',')
        # Keep the coordinate variables
        output_vars.extend([depth_var, time_var, lat_var, lon_var])
        for variable in subset.data_vars:
            if variable not in output_vars:
                subset = subset.drop(variable)

        for variable in output_vars:
            # if variable is a computed variable, overwrite it
            if isinstance(self.get_dataset_variable(variable),
                          data.calculated.CalculatedArray):
                subset = subset.assign(**{variable:
                                          self.get_dataset_variable(variable).isel(**{
                                              time_var: time_slice,
                                              lat_coord: y_slice,
                                              lon_coord: x_slice
                                          })})

        output_format = query.get('output_format')
        filename = dataset_name + "_" + "%dN%dW-%dN%dW" % (p0.latitude, p0.longitude, p1.latitude, p1.longitude) \
            + "_" + timestamp + endtimestamp + "_" + output_format

        # Workaround for https://github.com/pydata/xarray/issues/2822#issuecomment-475487497
        if '_NCProperties' in subset.attrs.keys():
            del subset.attrs['_NCProperties']

        # "Special" output
        if output_format == "NETCDF3_NC":

            GRID_RESOLUTION = 50

            # Regrids an input data array according to it's input grid definition
            # to the output definition
            def regrid(data: np.ndarray,
                       input_def: pyresample.geometry.SwathDefinition,
                       output_def: pyresample.geometry.SwathDefinition):

                orig_shape = data.shape

                data = np.rollaxis(data, 0, 4)  # Roll time axis backward
                data = np.rollaxis(data, 0, 4)  # Roll depth axis backward
                # Merge time + depth axis together
                data = data.reshape([data.shape[0], data.shape[1], -1])

                # Perform regridding using nearest neighbour weighting
                regridded = pyresample.kd_tree.resample_nearest(
                    input_def, data, output_def, 50000, fill_value=None, nprocs=8)
                # Move merged axis back to front
                regridded = np.moveaxis(regridded, -1, 0)
                # Match target output grid (netcdf4 used to do this automatically but now it doesn't >.>)
                return np.reshape(regridded, (orig_shape[0], orig_shape[1], GRID_RESOLUTION, GRID_RESOLUTION))

            # Check lat/lon wrapping
            lon_vals, lat_vals = pyresample.utils.check_and_wrap(
                lons=subset[lon_var].values, lats=subset[lat_var].values)

            # Generate our lat/lon grid of 50x50 resolution
            min_lon, max_lon = np.amin(lon_vals), np.amax(lon_vals)
            min_lat, max_lat = np.amin(lat_vals), np.amax(lat_vals)
            XI = np.linspace(min_lon, max_lon,
                             num=GRID_RESOLUTION, dtype=lon_vals.dtype)
            YI = np.linspace(min_lat, max_lat,
                             num=GRID_RESOLUTION, dtype=lat_vals.dtype)
            XI_mg, YI_mg = np.meshgrid(XI, YI)

            # Define input/output grid definitions
            input_def = pyresample.geometry.SwathDefinition(
                lons=lon_vals, lats=lat_vals)
            output_def = pyresample.geometry.SwathDefinition(
                lons=XI_mg, lats=YI_mg)

            # Find correct variable names in subset
            temp_var = find_variable('temp', subset.variables)
            saline_var = find_variable('salin', subset.variables)
            x_vel_var = find_variable('crtx', subset.variables)
            y_vel_var = find_variable('crty', subset.variables)

            # Create file
            time_range = len(subset[time_var][:]) - 1
            filename = dataset_name.upper() + "_" + \
                datetime.date.today().strftime("%Y%m%d") + "_d0" + \
                (("-"+str(time_range)) if time_range > 0 else "") + "_" + \
                str(np.round(top_right[0]).astype(int)) + "N" + str(np.abs(np.round(bottom_left[1]).astype(int))).zfill(3) + "W" + \
                str(np.round(bottom_left[0]).astype(int)) + "N" + str(np.abs(np.round(top_right[1])).astype(int)).zfill(3) + "W" + \
                "_" + output_format
            ds = netCDF4.Dataset(working_dir + filename +
                                 ".nc", 'w', format="NETCDF3_CLASSIC")
            ds.description = "Converted " + dataset_name
            ds.history = "Created: " + str(datetime.datetime.now())
            ds.source = "www.navigator.oceansdata.ca"

            # Create the netcdf dimensions
            ds.createDimension('lat', GRID_RESOLUTION)
            ds.createDimension('lon', GRID_RESOLUTION)
            ds.createDimension('time', len(subset[time_var][:]))

            # Create the netcdf variables and assign the values
            latitudes = ds.createVariable('lat', 'd', ('lat',))
            longitudes = ds.createVariable('lon', 'd', ('lon',))
            latitudes[:] = YI
            longitudes[:] = XI

            # Variable Attributes
            latitudes.long_name = "Latitude"
            latitudes.units = "degrees_north"
            latitudes.NAVO_code = 1

            longitudes.long_name = "Longitude"
            longitudes.units = "degrees_east"
            longitudes.NAVO_code = 2

            # LOL I had CreateDimension vs createDimension here >.< Stumped Clyde too hehe :P
            ds.createDimension('depth', len(subset[depth_var][:]))
            levels = ds.createVariable('depth', 'i', ('depth',))
            levels[:] = subset[depth_var][:]
            levels.long_name = "Depth"
            levels.units = "meter"
            levels.positive = "down"
            levels.NAVO_code = 5

            if temp_var is not None:
                temp = ds.createVariable(
                    'water_temp', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                temp_data = regrid(
                    subset[temp_var].values, input_def, output_def)

                # Convert from Kelvin to Celsius
                ureg = pint.UnitRegistry()
                try:
                    u = ureg.parse_units(subset[temp_var].units.lower())
                except:
                    u = ureg.dimensionless

                if u == ureg.boltzmann_constant:
                    u = ureg.kelvin

                if u == ureg.kelvin:
                    for i in range(0, len(subset[depth_var][:])):
                        temp[:, i, :, :] = temp_data[:, i, :, :] - 273.15

                else:
                    for i in range(0, len(subset[depth_var][:])):
                        temp[:, i, :, :] = temp_data[:, i, :, :]

                temp.valid_min = -100.0
                temp.valid_max = 100.0
                temp.long_name = "Water Temperature"
                temp.units = "degC"
                temp.NAVO_code = 15
            if saline_var is not None:
                salinity = ds.createVariable(
                    'salinity', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                salinity[:] = regrid(
                    subset[saline_var].values, input_def, output_def)[:]
                salinity.long_name = "Salinity"
                salinity.units = "psu"
                salinity.valid_min = 0.0
                salinity.valid_max = 45.0
                salinity.NAVO_code = 16
            if x_vel_var is not None:
                x_velo = ds.createVariable(
                    'water_u', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                x_velo[:] = regrid(subset[x_vel_var].values,
                                   input_def, output_def)[:]
                x_velo.long_name = "Eastward Water Velocity"
                x_velo.units = "meter/sec"
                x_velo.NAVO_code = 17
            if y_vel_var is not None:
                y_velo = ds.createVariable(
                    'water_v', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                y_velo[:] = regrid(subset[y_vel_var].values,
                                   input_def, output_def)[:]
                y_velo.long_name = "Northward Water Velocity"
                y_velo.units = "meter/sec"
                y_velo.NAVO_code = 18

            temp_file_name = working_dir + str(uuid.uuid4()) + ".nc"
            subset.to_netcdf(temp_file_name)
            subset.close()

            # Reopen using netCDF4 to get non-encoded time values
            subset = netCDF4.Dataset(temp_file_name, 'r')

            times = ds.createVariable('time', 'i', ('time',))
            # Convert time from seconds to hours
            for i in range(0, len(subset[time_var])):
                times[i] = subset[time_var][i] / 3600

            times.long_name = "Validity time"
            times.units = "hours since 1950-01-01 00:00:00"
            times.time_origin = "1950-01-01 00:00:00"

            ds.close()
            subset.close()
        else:
            # Save subset normally
            subset.to_netcdf(working_dir + filename +
                             ".nc", format=output_format)

        if int(query.get('should_zip')) == 1:
            myzip = zipfile.ZipFile('%s%s.zip' % (
                working_dir, filename), mode='w')
            myzip.write('%s%s.nc' % (working_dir, filename),
                        os.path.basename('%s%s.nc' % (working_dir, filename)))
            myzip.comment = b"Generated from www.navigator.oceansdata.ca"
            myzip.close()  # Must be called to actually create zip
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

    @property
    def time_variable(self):
        """Finds and returns the xArray.IndexVariable containing
            the time dimension in self._dataset
        """

        if self._time_variable is not None:
            return self._time_variable

        self._time_variable = self.__find_variable(
            ['time', 'time_counter', 'Times'])
        return self._time_variable

    @property
    def latlon_variables(self):
        """Finds the lat and lon variable arrays in the dataset.

        Returns:
            list -- list containing the xarray.DataArray's for latitude and 
            longitude.
        """
        return (
            self.__find_variable(['nav_lat', 'latitude']),
            self.__find_variable(['nav_lon', 'longitude'])
        )

    @property
    def depth_dimensions(self):
        """
        Returns the possible names of the depth dimension in the dataset
        """

        return ['depth', 'deptht', 'z']

    def get_dataset_variable(self, key: str):
        """
        Returns the value of a given variable name from the dataset
        """
        return self._dataset.variables[key]

    @property
    def variables(self):
        """Returns a list of all data variables and their 
        attributes in the dataset.

        Returns:
            VariableList -- contains all the data variables (no coordinates)
        """

        # Check if variable list has been created yet.
        # This saves approx 3 lookups per tile, and
        # over a dozen when a new dataset is loaded.
        if self._variable_list == None:

            with SQLiteDatabase(self.url) as db:

                self._variable_list = db.get_data_variables()  # Cache the list for later

        return self._variable_list

    @property
    def timestamps(self):
        """
            Loads, caches, and returns the values of the
            time dimension for the open netcdf files.

            Note: to get all timestamp values from a dataset,
            you must query the SQLiteDatabase.
        """
        # If the timestamp cache is empty
        if self.__timestamp_cache.get("timestamps") is None:

            var = self.time_variable

            # Convert timestamps to UTC
            time_list = time_index_to_datetime(var.values, var.attrs['units'])
            timestamps = np.array(time_list)
            timestamps.setflags(write=False)  # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")
