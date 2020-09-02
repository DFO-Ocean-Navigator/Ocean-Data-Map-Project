import datetime
import os
import sqlite3
import uuid
import warnings
import zipfile
from typing import List, Dict, Union

import dateutil.parser
import geopy
import netCDF4
import numpy as np
import pandas
import pint
import pyresample
import xarray
import xarray.core.variable
from cachetools import TTLCache
from flask_babel import format_date

import data.calculated
import data.utils
from data.data import Data
from data.nearest_grid_point import find_nearest_grid_point
from data.sqlite_database import SQLiteDatabase
from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator.dataset_config import DatasetConfig


class NetCDFData(Data):
    """Handles reading of netcdf files.

       Injected as attribute into Model classes like Nemo, Mercator, Fvcom.
    """

    def __init__(self, url: str, **kwargs: Dict) -> None:
        super().__init__(url)
        self.meta_only: bool = kwargs.get('meta_only', False)
        self.dataset: Union[xarray.Dataset, netCDF4.Dataset] = None
        self._variable_list: VariableList = None
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)
        self._nc_files: list = []
        self._grid_angle_file_url: str = kwargs.get('grid_angle_file_url', "")
        self._bathymetry_file_url: str = kwargs.get('bathymetry_file_url', "")
        self._time_variable: xarray.IndexVariable = None
        self._dataset_open: bool = False
        self._dataset_key: str = kwargs.get('dataset_key', "")
        self._dataset_config: DatasetConfig = (
            DatasetConfig(self._dataset_key) if self._dataset_key else None
        )

    def __enter__(self):
        if not self.meta_only:
            # Don't decode times since we do it anyways.
            decode_times = False

            if self._nc_files:
                try:
                    self.dataset = xarray.open_mfdataset(
                        self._nc_files,
                        decode_times=decode_times,
                        chunks=200,
                    )
                except xarray.core.variable.MissingDimensionsError:
                    # xarray won't open FVCOM files due to dimension/coordinate/variable label
                    # duplication issue, so fall back to using netCDF4.Dataset()
                    self.dataset = netCDF4.MFDataset(self._nc_files)
            else:
                try:
                    # Handle list of URLs for staggered grid velocity field datasets
                    url = self.url if isinstance(self.url, list) else [self.url]
                    # This will raise a FutureWarning for xarray>=0.12.2.
                    # That warning should be resolvable by changing to:
                    # fields = xarray.open_mfdataset(self.url, combine="by_coords", decode_times=decode_times)
                    fields = xarray.open_mfdataset(url, decode_times=decode_times)
                except xarray.core.variable.MissingDimensionsError:
                    # xarray won't open FVCOM files due to dimension/coordinate/variable label
                    # duplication issue, so fall back to using netCDF4.Dataset()
                    fields = netCDF4.Dataset(self.url)
                if getattr(self._dataset_config, "geo_ref", {}):
                    drop_variables = self._dataset_config.geo_ref.get("drop_variables", [])
                    geo_refs = xarray.open_dataset(
                        self._dataset_config.geo_ref["url"], drop_variables=drop_variables,
                    )
                    fields = fields.merge(geo_refs)
                self.dataset = fields

            if self._grid_angle_file_url:
                angle_file = xarray.open_dataset(
                    self._grid_angle_file_url,
                    drop_variables=[self._dataset_config.lat_var_key, self._dataset_config.lon_var_key]
                )
                self.dataset = self.dataset.merge(angle_file)
                angle_file.close()

            if self._bathymetry_file_url:
                bathy_file = xarray.open_dataset(self._bathymetry_file_url)
                self.dataset = self.dataset.merge(bathy_file)
                bathy_file.close()

            self._dataset_open = True

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self._dataset_open:
            self.dataset.close()
            self._dataset_open = False

    def __find_variable(self, candidates: list):
        """Finds a matching variable in the dataset given a list
        of candidate keys.

        Arguments:
            candidates {list} -- list of possible variable key strings

        Returns:
            xArray.DataArray -- the corresponding variable's DataArray
        """
        for c in candidates:
            try:
                return self.dataset.variables[c]
            except KeyError:
                continue
        raise KeyError(f"None of {candidates} were found in {self.dataset}")

    def make_time_slice(self, starttime: int, endtime: Union[int, None] = None) -> slice:
        """Converts given start and/or end timestamp values (e.g. 60442857)
        into a slice object that captures the corresponding time
        indices such that [starttime, starttime] OR [starttime, endtime].

        Required Arguments:

            * starttime {int} -- The starting timestamp.

        Optional Arguments:

            * endtime {int or None} -- The ending timestamp to create
                an inclusive range. Default is None.

        Returns:

            * slice instance representing the requested time range.
        """

        starttime_idx = self.timestamp_to_time_index(starttime)

        if endtime is not None:
            endtime_idx = self.timestamp_to_time_index(endtime)
            return slice(starttime_idx, endtime_idx + 1)

        return slice(starttime_idx, starttime_idx + 1)

    def timestamp_to_time_index(self, timestamp: Union[int, List]):
        """Converts a given timestamp (e.g. 2031436800) or list of timestamps
        into the corresponding time index(es) for the time dimension.

        Arguments:
            timestamp {int or list} -- Raw timestamp(s).

        Returns:
            [int or ndarray] -- Time index(es).
        """

        time_var = np.sort(self.time_variable.astype(np.int))

        result = np.nonzero(np.isin(time_var, timestamp))[0]

        return result if result.shape[0] > 1 else result[0]

    def timestamp_to_iso_8601(self, timestamp: Union[int, List]):
        """Converts a given timestamp (e.g. 2031436800) or list of timestamps
        into corresponding ISO-8601 formatted datetime(s).

        Arguments:
            timestamp {int or list} -- Raw timestamp(s).

        Returns:
            [int or list] -- Time index(es).
        """

        time_var = self.time_variable

        result = data.utils.time_index_to_datetime(timestamp, time_var.attrs['units'])

        return result if len(result) > 1 else result[0]

    def convert_to_timestamp(self, date: str):
        """Converts ISO 8601 Extended date, to the corresponding dataset time index.
        """

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


    def subset(self, query):
        """ Subsets a netcdf file with all depths
        """
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

            quantum = self._dataset_config.quantum
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
        lat_var = find_variable("lat", list(self.dataset.variables.keys()))
        lon_var = find_variable("lon", list(self.dataset.variables.keys()))

        depth_var = find_variable(
            "depth", list(self.dataset.variables.keys()))

        # self.get_dataset_variable should be used below instead of
        # self.dataset.variables[...] because self.dataset.variables[...]
        # will go directly to the underlying dataset and will not handle
        # calculated variables.
        if not entire_globe:
            # Find closest indices in dataset corresponding to each calculated point
            ymin_index, xmin_index, _ = find_nearest_grid_point(
                bottom_left[0], bottom_left[1], self.get_dataset_variable(
                    lat_var), self.get_dataset_variable(lon_var)
            )
            ymax_index, xmax_index, _ = find_nearest_grid_point(
                top_right[0], top_right[1], self.get_dataset_variable(
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
        time_var = find_variable("time", list(self.dataset.variables.keys()))
        timestamp = str(format_date(pandas.to_datetime(np.float64(
            self.get_dataset_variable(time_var)[time_range[0]].values)), "yyyyMMdd"))
        endtimestamp = ""
        if apply_time_range:
            endtimestamp = "-" + str(format_date(pandas.to_datetime(np.float64(
                self.get_dataset_variable(time_var)[time_range[1]].values)), "yyyyMMdd"))

        dataset_name = query.get('dataset_name')
        lat_coord = self._dataset_config.lat_var_key
        lon_coord = self._dataset_config.lon_var_key

        # Do subset along coordinates
        subset = self.dataset.isel(**{lat_coord: y_slice, lon_coord: x_slice})

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

    def interpolate(self, input_def, output_def, data):
        """ Interpolates data given input and output definitions
            and the selected interpolation algorithm.
        """

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

        raise ValueError(f"Unknown interpolation method {self.interp}.")                                               

    @property
    def time_variable(self):
        """Finds and returns the xArray.IndexVariable containing
            the time dimension in self.dataset
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
    def dimensions(self) -> List[str]:
        """Return a list of the dimensions in the dataset.
        """
        # Handle possible list of URLs for staggered grid velocity field datasets
        url = self.url if not isinstance(self.url, list) else self.url[0]

        if url.endswith(".sqlite3"):
            try:
                with SQLiteDatabase(url) as db:
                    dimension_list = db.get_all_dimensions()
            except sqlite3.OperationalError:
                pass
            return dimension_list

        # Open dataset (can't use xarray here since it doesn't like FVCOM files)
        try:
            with netCDF4.Dataset(url) as ds:
                dimension_list = [dim for dim in ds.dimensions]
        except FileNotFoundError:
            dimension_list = []
        return dimension_list

    @property
    def depth_dimensions(self) -> List[str]:
        """
        Returns the possible names of the depth dimension in the dataset
        """

        return ['depth', 'deptht', 'z']

    def get_dataset_variable(self, key: str):
        """
        Returns the value of a given variable name from the dataset
        """
        return self.dataset.variables[key]

    @property
    def variables(self) -> VariableList:
        """Returns a list of all data variables and their
        attributes in the dataset.

        Returns:
            VariableList -- contains all the data variables (no coordinates)
        """

        # Check if variable list has been created yet.
        # This saves approx 3 lookups per tile, and
        # over a dozen when a new dataset is loaded.
        if self._variable_list is not None:
            return self._variable_list

        # Handle possible list of URLs for staggered grid velocity field datasets
        url = self.url if not isinstance(self.url, list) else self.url[0]
        if url.endswith(".sqlite3"):
            with SQLiteDatabase(url) as db:
                self._variable_list = db.get_data_variables()  # Cache the list for later
                return self._variable_list
        try:
            # Handle possible list of URLs for staggered grid velocity field datasets
            url = self.url if isinstance(self.url, list) else [self.url]
            # This will raise a FutureWarning for xarray>=0.12.2.
            # That warning should be resolvable by changing to:
            # with xarray.open_mfdataset(url, combine="by_coords", decode_times=False) as ds:
            with xarray.open_mfdataset(url, decode_times=False) as ds:
                self._variable_list = self._get_xarray_data_variables(ds)  # Cache the list for later
            return self._variable_list
        except xarray.core.variable.MissingDimensionsError:
            # xarray won't open FVCOM files due to dimension/coordinate/variable label
            # duplication issue, so fall back to using netCDF4.Dataset()
            with netCDF4.Dataset(self.url) as ds:
                self._variable_list = self._get_netcdf4_data_variables(ds)  # Cache the list for later
            return self._variable_list

    @staticmethod
    def _get_xarray_data_variables(ds):
        result = []
        required_attrs = {"long_name", "units"}
        for var in ds.data_vars:
            if set(ds[var].attrs).intersection(required_attrs) != required_attrs:
                continue
            result.append(
                Variable(
                    var, ds[var].attrs["long_name"], ds[var].attrs["units"],
                    tuple([dim for dim in ds.dims]),
                    # Use .get() here to provide None if variable metadata lacks
                    # valid_min or valid_max
                    ds[var].attrs.get("valid_min"), ds[var].attrs.get("valid_max"))
            )
        return VariableList(result)

    @staticmethod
    def _get_netcdf4_data_variables(ds):
        result = []
        required_attrs = {"long_name", "units"}
        for var in ds.variables:
            if set(ds[var].ncattrs()).intersection(required_attrs) != required_attrs:
                continue
            try:
                valid_min = ds[var].getncattr("valid_min")
            except AttributeError:
                valid_min = None
            try:
                valid_max = ds[var].getncattr("valid_max")
            except AttributeError:
                valid_max = None
            result.append(
                Variable(
                    var, ds[var].getncattr("long_name"), ds[var].getncattr("units"),
                    tuple([dim for dim in ds.dimensions]),
                    valid_min, valid_max)
            )
        return VariableList(result)

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
            time_list = data.utils.time_index_to_datetime(np.sort(var), var.attrs['units'])
            timestamps = np.array(time_list)
            timestamps.setflags(write=False)  # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")

    def get_nc_file_list(self, datasetconfig: DatasetConfig, **kwargs: dict) -> Union[List, None]:
        try:
            if not datasetconfig.url.endswith(".sqlite3"):
                # This method is only applicable to SQLite-indexed datasets
                return
        except AttributeError:
            # Probably a file path dataset config for which this method is also not applicable
            return

        with SQLiteDatabase(self.url) as db:

            try:
                variable = kwargs['variable']
            except KeyError:
                raise RuntimeError(
                    "Opening a dataset via sqlite requires the 'variable' keyword argument.")
            if isinstance(variable, str):
                variable = { variable }
            else:
                if not isinstance(variable, set):
                    variable = set(variable)

            calculated_variables = datasetconfig.calculated_variables
            variables_to_load = self.__get_variables_to_load(db, variable, calculated_variables)

            try:
                timestamp = self.__get_requested_timestamps(
                    db, variables_to_load[0], kwargs['timestamp'], kwargs.get('endtime'), kwargs.get('nearest_timestamp', False))
            except KeyError:
                raise RuntimeError(
                    "Opening a dataset via sqlite requires the 'timestamp' keyword argument.")

            if not timestamp:
                raise RuntimeError("Error finding timestamp(s) in database.")

            file_list = db.get_netcdf_files(timestamp, variables_to_load)
            if not file_list:
                raise RuntimeError("NetCDF file list is empty.")

            self._nc_files = file_list

    def __get_variables_to_load(self, db: SQLiteDatabase, variable: set,
                                    calculated_variables: dict) -> List[str]:

        calc_var_keys = set(calculated_variables)
        variables_to_load = variable.difference(calc_var_keys)
        requested_calculated_variables = variable & calc_var_keys
        if requested_calculated_variables:
            for rcv in requested_calculated_variables:
                equation = calculated_variables[rcv]['equation']

                variables_to_load.update(data.utils.get_data_vars_from_equation(
                    equation, [v.key for v in db.get_data_variables()]))

        return list(variables_to_load)

    def __get_requested_timestamps(self, db: SQLiteDatabase, variable: str, timestamp, endtime,
                                   nearest_timestamp) -> List[int]:

        # We assume timestamp and/or endtime have been converted
        # to the same time units as the requested dataset. Otherwise
        # this won't work.
        if nearest_timestamp:
            all_timestamps = db.get_timestamps(variable)

            start = data.utils.find_le(all_timestamps, timestamp)
            if not endtime:
                return [start]

            end = data.utils.find_le(all_timestamps, endtime)
            return db.get_timestamp_range(start, end, variable)

        if timestamp > 0 and endtime is None:
            # We've received a specific timestamp (e.g. 21100345)
            if not isinstance(timestamp, list):
                return [timestamp]
            return timestamp

        if timestamp < 0 and endtime is None:
            all_timestamps = db.get_timestamps(variable)
            return [all_timestamps[timestamp]]

        if timestamp > 0 and endtime > 0:
            # We've received a request for a time range
            # with specific timestamps given
            return db.get_timestamp_range(
                timestamp, endtime, variable)

        # Otherwise assume negative values are indices into timestamp list
        all_timestamps = db.get_timestamps(variable)
        len_timestamps = len(all_timestamps)
        if timestamp < 0 and endtime > 0:
            idx = data.utils.roll_time(timestamp, len_timestamps)
            return db.get_timestamp_range(all_timestamps[idx], endtime, variable)

        if timestamp > 0 and endtime < 0:
            idx = data.utils.roll_time(endtime, len_timestamps)
            return db.get_timestamp_range(timestamp, all_timestamps[idx], variable)
