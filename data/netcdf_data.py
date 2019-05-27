import netCDF4
from flask_babel import format_date
import dateutil.parser
from data.data import Data, Variable, VariableList
from data.nearest_grid_point import find_nearest_grid_point
import data.calculated
import xarray as xr
import os
from cachetools import TTLCache
import pytz
import warnings
import pyresample
import numpy as np
import re
import geopy
import datetime
import uuid
import pandas
import zipfile
import pint


class NetCDFData(Data):

    def __init__(self, url: str):
        self._dataset: [xr.core.dataset.Dataset, netCDF4.Dataset] = None
        self._variable_list: VariableList = None
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)
        super(NetCDFData, self).__init__(url)

    def __enter__(self):
        # Don't decode times since we do it anyways.
        self._dataset = xr.open_dataset(self.url, decode_times=False)
        
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._dataset.close()

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var):
        pass

    """
        Converts ISO 8601 Extended date, to the corresponding dataset time index
    """
    def convert_to_timestamp(self, date):
        
        # Time is in ISO 8601 Extended format
        # Get time index from dataset

        time_range = [dateutil.parser.parse(x) for x in date.split(',')]
        time_var = self.__get_time_variable()
        time_range[0] = time_range[0].replace(tzinfo=None)
        time_range = [netCDF4.date2num(x, time_var.attrs['units']) for x in time_range]
        time_range = [np.where(time_var.values == x)[0] for x in time_range]

        if len(time_range) == 1:    #Single Date
            return int(str(time_range[0][0]))
        else:                          #Multiple Dates
            date_formatted = {}
            i = 0
            for x in date.split(','):   # x is a single date
                new_date = {x : int(str(time_range[i][0]))}
                date_formatted.update(new_date)     #Add Next pair
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
        
        entire_globe = True # subset the globe?
        if 'min_range' in query:
            # Area explicitly specified
            entire_globe = False
            # Bounding box extents
            bottom_left = [float(x) for x in query.get('min_range').split(',')]
            top_right = [float(x) for x in query.get('max_range').split(',')]

        # Time range
        try:
            # Time is an index into timestamps array
            time_range = [int(x) for x in query.get('time').split(',')]
        except ValueError:
            # Time is in ISO 8601 format and we need the dataset quantum
            
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

            time_range = [dateutil.parser.parse(x) for x in query.get('time').split(',')]
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
        lat_var = find_variable("lat", list(self._dataset.variables.keys()))
        lon_var = find_variable("lon", list(self._dataset.variables.keys()))

        depth_var = find_variable("depth", list(self._dataset.variables.keys()))

        # self.get_dataset_variable should be used below instead of
        # self._dataset.variables[...] because self._dataset.variables[...]
        # will go directly to the underlying dataset and will not handle
        # calculated variables.
        if not entire_globe:
            # Find closest indices in dataset corresponding to each calculated point
            ymin_index, xmin_index, _ = find_nearest_grid_point(
                bottom_left[0], bottom_left[1], self._dataset,
                self.get_dataset_variable(lat_var), self.get_dataset_variable(lon_var)
            )
            ymax_index, xmax_index, _ = find_nearest_grid_point(
                top_right[0], top_right[1], self._dataset, self.get_dataset_variable(lat_var), self.get_dataset_variable(lon_var)
            )

            # Compute min/max for each slice in case the values are flipped
            # the netCDF4 module does not support unordered slices
            y_slice = slice(min(ymin_index, ymax_index), max(ymin_index, ymax_index))
            x_slice = slice(min(xmin_index, xmax_index), max(xmin_index, xmax_index))

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
        timestamp = str(format_date(pandas.to_datetime(np.float64(self.get_dataset_variable(time_var)[time_range[0]].values)), "yyyyMMdd"))
        endtimestamp = ""
        if apply_time_range:
            endtimestamp = "-" + str(format_date(pandas.to_datetime(np.float64(self.get_dataset_variable(time_var)[time_range[1]].values)), "yyyyMMdd"))
        
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
            time_slice = slice(int(time_range[0]), int(time_range[1]) + 1) # slice doesn't include the last element
        else:
            time_slice = slice(int(time_range[0]), int(time_range[0]) + 1)

        subset = subset.isel(**{time_var: time_slice})

        # Filter out unwanted variables
        output_vars = query.get('variables').split(',')
        output_vars.extend([depth_var, time_var, lat_var, lon_var]) # Keep the coordinate variables
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
        filename =  dataset_name + "_" + "%dN%dW-%dN%dW" % (p0.latitude, p0.longitude, p1.latitude, p1.longitude) \
                    + "_" + timestamp + endtimestamp + "_" + output_format

        # Workaround for https://github.com/pydata/xarray/issues/2822#issuecomment-475487497
        if '_NCProperties' in subset.attrs.keys():
                del subset.attrs['_NCProperties']

        # "Special" output
        if output_format == "NETCDF3_NC":
            # Regrids an input data array according to it's input grid definition
            # to the output definition
            def regrid( data: np.ndarray,
                        input_def: pyresample.geometry.SwathDefinition,
                        output_def: pyresample.geometry.SwathDefinition):
                
                data = np.rollaxis(data, 0, 4) # Roll time axis backward
                data = np.rollaxis(data, 0, 4) # Roll depth axis backward
                data = data.reshape([data.shape[0], data.shape[1], -1]) # Merge time + depth axis together
                
                # Perform regridding using nearest neighbour weighting
                regridded = pyresample.kd_tree.resample_nearest(input_def, data, output_def, 50000, fill_value=None, nprocs=8)
                return np.moveaxis(regridded, -1, 0) # Move merged axis back to front

            GRID_RESOLUTION = 50

            # Check lat/lon wrapping
            lon_vals, lat_vals = pyresample.utils.check_and_wrap(lons=subset[lon_var].values, lats=subset[lat_var].values)

            # Generate our lat/lon grid of 50x50 resolution
            min_lon, max_lon = np.amin(lon_vals), np.amax(lon_vals)
            min_lat, max_lat = np.amin(lat_vals), np.amax(lat_vals)
            XI = np.linspace(min_lon, max_lon, num=GRID_RESOLUTION, dtype=lon_vals.dtype)
            YI = np.linspace(min_lat, max_lat, num=GRID_RESOLUTION, dtype=lat_vals.dtype)
            XI_mg, YI_mg = np.meshgrid(XI, YI)

            # Define input/output grid definitions
            input_def = pyresample.geometry.SwathDefinition(lons=lon_vals, lats=lat_vals)
            output_def = pyresample.geometry.SwathDefinition(lons=XI_mg, lats=YI_mg)

            # Find correct variable names in subset
            temp_var = find_variable('temp', subset.variables)
            saline_var = find_variable('salin', subset.variables)
            x_vel_var = find_variable('crtx', subset.variables)
            y_vel_var = find_variable('crty', subset.variables)
            
            # Create file
            time_range = len(subset[time_var][:]) - 1
            filename = dataset_name.upper() + "_" + \
                datetime.date.today().strftime("%Y%m%d") +"_d0" + \
                (("-"+str(time_range)) if time_range > 0 else "") + "_" + \
                str(np.round(top_right[0]).astype(int)) + "N" + str(np.abs(np.round(bottom_left[1]).astype(int))).zfill(3) + "W" + \
                str(np.round(bottom_left[0]).astype(int)) + "N" + str(np.abs(np.round(top_right[1])).astype(int)).zfill(3) + "W" + \
                "_" + output_format
            ds = netCDF4.Dataset(working_dir + filename + ".nc", 'w', format="NETCDF3_CLASSIC")
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
                origshape = subset[temp_var].shape
                temp_data = regrid(subset[temp_var].values, input_def, output_def)
                temp_data = np.reshape(temp_data, (origshape[0], origshape[1], GRID_RESOLUTION, GRID_RESOLUTION))
                
                temp = ds.createVariable('water_temp', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)

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
                        temp[:,i, :, :] = temp_data[:,i,:,:] - 273.15

                else:
                    for i in range(0, len(subset[depth_var][:])):
                        temp[:,i, :, :] = temp_data[:,i,:,:]

                temp.valid_min = -100.0
                temp.valid_max = 100.0
                temp.long_name = "Water Temperature"
                temp.units = "degC"
                temp.NAVO_code = 15
            if saline_var is not None:
                salinity = ds.createVariable('salinity', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                salinity[:] = regrid(subset[saline_var].values, input_def, output_def)[:] # Note the automatic reshaping by numpy here ^.^
                salinity.long_name = "Salinity"
                salinity.units = "psu"
                salinity.valid_min = 0.0
                salinity.valid_max = 45.0
                salinity.NAVO_code = 16
            if x_vel_var is not None:
                x_velo = ds.createVariable('water_u', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                x_velo[:] = regrid(subset[x_vel_var].values, input_def, output_def)[:]
                x_velo.long_name = "Eastward Water Velocity"
                x_velo.units = "meter/sec"
                x_velo.NAVO_code = 17
            if y_vel_var is not None:
                y_velo = ds.createVariable('water_v', 'd', ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                y_velo[:] = regrid(subset[y_vel_var].values, input_def, output_def)[:]
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
       
    """
        Finds and returns the xArray.IndexVariable containing
        the time dimension in self._dataset
    """
    def __get_time_variable(self):
        for v in self.time_variables:
            if v in self._dataset.variables.keys():
                # Get the xarray.DataArray for time variable
                return self.get_dataset_variable(v)

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
                if (len(var.dims) == 0):
                    # Skip any variables without dimensions, this makes the
                    # xarray based datasets behave more like the netcdf4-python
                    # ones.
                    continue

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
            t = netCDF4.netcdftime.utime(var.attrs['units']) # Get time units from variable
            time_list = list(map(
                                lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
                                var.values
                            ))
            timestamps = np.array(time_list)
            timestamps.setflags(write=False) # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")
