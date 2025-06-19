import datetime
import uuid
import warnings
import zipfile
from pathlib import Path
from typing import Dict, List, Set, Tuple, Union

import dateutil.parser
import geopy
import netCDF4
import numpy as np
import pint
import pyresample
import xarray
import xarray.core.variable
from babel.dates import format_date
from cachetools import TTLCache

import data.calculated
import data.utils
from data.data import Data
from data.nearest_grid_point import find_nearest_grid_point
from data.sqlite_database import SQLiteDatabase
from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator.dataset_config import DatasetConfig

import xarray as xr
import numpy as np


class NetCDFData(Data):
    """Handles reading of netcdf files.

    Injected as attribute into Model classes like Nemo, Mercator, Fvcom.
    """

    def __init__(self, url: Union[str, list], **kwargs: Dict) -> None:
        super().__init__(url)
        self.dataset: Union[xarray.Dataset, netCDF4.Dataset] = None
        self._variable_list: VariableList = None
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)
        self._grid_angle_file_url: str = kwargs.get("grid_angle_file_url", "")
        self._bathymetry_file_url: str = kwargs.get("bathymetry_file_url", "")
        self._time_variable: xarray.IndexVariable = None
        self._dataset_open: bool = False
        self._dataset_key: str = kwargs.get("dataset_key", "")
        self._dataset_config: DatasetConfig = (
            DatasetConfig(self._dataset_key) if self._dataset_key else None
        )
        self._nc_files: Union[List, None] = self.get_nc_file_list(
            self._dataset_config, **kwargs
        )
        self.interp: str = kwargs.get("interp", "gaussian")
        self.radius: int = kwargs.get("radius", 25000)
        self.neighbours: int = kwargs.get("neighbours", 10)

    def __enter__(self):
        # Don't decode times since we do it anyways.
        decode_times = False

        if self.url.endswith(".sqlite3") if not isinstance(self.url, list) else False:
            if self._nc_files:
                try:
                    if len(self._nc_files) > 1:
                        self.dataset = xarray.open_mfdataset(
                            self._nc_files, decode_times=decode_times
                        )
                    else:
                        self.dataset = xarray.open_dataset(
                            self._nc_files[0],
                            decode_times=decode_times,
                        )
                except ValueError:
                    # xarray won't open FVCOM files due to dimension/coordinate/
                    # variable label duplication issue, so fall back to using
                    # netCDF4.Dataset()
                    self.dataset = netCDF4.MFDataset(self._nc_files)
            else:
                self.dataset = xarray.Dataset()

        elif self.url.endswith(".zarr") if not isinstance(self.url, list) else False:
            ds_zarr = xarray.open_zarr(self.url, decode_times=decode_times)
            self.dataset = ds_zarr

        else:
            try:
                # Handle list of URLs for staggered grid velocity field datasets
                url = self.url if isinstance(self.url, list) else [self.url]
                if len(url) > 1:
                    fields = self._construct_remote_ds(url, decode_times)
                else:
                    fields = xarray.open_mfdataset(url, decode_times=decode_times)
            except ValueError:
                # xarray won't open FVCOM files due to dimension/coordinate/variable
                # label duplication issue, so fall back to using netCDF4.Dataset()
                fields = netCDF4.Dataset(self.url)
            if getattr(self._dataset_config, "geo_ref", {}):
                drop_variables = self._dataset_config.geo_ref.get("drop_variables", [])
                geo_refs = xarray.open_dataset(
                    self._dataset_config.geo_ref["url"],
                    drop_variables=drop_variables,
                )
                fields = fields.merge(geo_refs)
            self.dataset = fields

        if self._grid_angle_file_url:
            angle_file = xarray.open_dataset(
                self._grid_angle_file_url,
                drop_variables=[
                    self._dataset_config.lat_var_key,
                    self._dataset_config.lon_var_key,
                ],
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

    def make_time_slice(
        self, starttime: int, endtime: Union[int, None] = None
    ) -> slice:
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

        time_var = np.sort(self.time_variable.astype(int))

        result = np.nonzero(np.isin(time_var, timestamp))[0].tolist()

        return result if len(result) > 1 else result[0]

    def timestamp_to_iso_8601(self, timestamp: Union[int, List]):
        """Converts a given timestamp (e.g. 2031436800) or list of timestamps
        into corresponding ISO-8601 formatted datetime(s).

        Arguments:
            timestamp {int or list} -- Raw timestamp(s).

        Returns:
            [int or list] -- Time index(es).
        """

        time_var = self.time_variable

        result = data.utils.time_index_to_datetime(timestamp, time_var.attrs["units"])

        return result if len(result) > 1 else result[0]

    def convert_to_timestamp(self, date: str):
        """Converts ISO 8601 Extended date, to the corresponding dataset time index."""

        # Time is in ISO 8601 Extended format
        # Get time index from dataset

        time_range = [dateutil.parser.parse(x) for x in date.split(",")]
        time_var = self.time_variable
        time_range[0] = time_range[0].replace(tzinfo=None)
        time_range = [netCDF4.date2num(x, time_var.attrs["units"]) for x in time_range]
        time_range = [np.where(time_var.values == x)[0] for x in time_range]

        if len(time_range) == 1:  # Single Date
            return int(str(time_range[0][0]))
        else:  # Multiple Dates
            date_formatted = {}
            i = 0
            for x in date.split(","):  # x is a single date
                new_date = {x: int(str(time_range[i][0]))}
                date_formatted.update(new_date)  # Add Next pair
                i += 1
            return date_formatted

    def subset(self, query):
        """Subsets a netcdf file with all depths"""
        # Ensure we have an output folder that will be cleaned by tmpreaper
        path = Path("/tmp/subset")
        path.mkdir(parents=True, exist_ok=True)
        working_dir = "/tmp/subset/"

        entire_globe = True  # subset the globe?
        if "min_range" in query:
            # Area explicitly specified
            entire_globe = False
            # Bounding box extents
            bottom_left = [float(x) for x in query.get("min_range").split(",")]
            top_right = [float(x) for x in query.get("max_range").split(",")]

        if "area" in query:
            # Predefined area specified
            entire_globe = False
            # get bounding area
            polys = np.squeeze(np.array(query["polygons"]))
            bottom_left = [np.min(polys[:, 0]), np.min(polys[:, 1])]
            top_right = [np.max(polys[:, 0]), np.max(polys[:, 1])]

        # Time range
        try:
            # Time is an index into timestamps array
            time_range = [
                self.timestamp_to_time_index(int(x))
                for x in query.get("time").split(",")
            ]
        except ValueError:
            # Time is in ISO 8601 format and we need the dataset quantum

            quantum = self._dataset_config.quantum
            if quantum == "day" or quantum == "hour":

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
                        if (
                            date.date().year == isoDate.date().year
                            and date.date().month == isoDate.date().month
                        ):
                            return idx

            time_range = [
                dateutil.parser.parse(x) for x in query.get("time").split(",")
            ]
            time_range = [find_time_index(x) for x in time_range]

        apply_time_range = False
        if time_range[0] != time_range[1]:
            apply_time_range = True

        # Finds a variable in a dictionary given a substring containing common
        # characters. Don't use regex here since compiling a new pattern every
        # call WILL add huge overhead. This is guaranteed to be the fastest
        # method.
        def find_variable(substring: str, variables: list):
            for key in variables:
                if substring in key:
                    return key
            return None

        # Get lat/lon variable names from dataset (since they all differ >.>)
        lat_var = find_variable("lat", list(self.dataset.variables.keys()))
        lon_var = find_variable("lon", list(self.dataset.variables.keys()))

        depth_var = find_variable("depth", list(self.dataset.variables.keys()))
        self.dataset = self.dataset.assign_coords(
            {lon_var: (((self.dataset.longitude + 180) % 360) - 180)}
        )
        self.dataset = self.dataset.sortby(lon_var)

        # self.get_dataset_variable should be used below instead of
        # self.dataset.variables[...] because self.dataset.variables[...]
        # will go directly to the underlying dataset and will not handle
        # calculated variables.
        if not entire_globe:
            # Find closest indices in dataset corresponding to each calculated point
            y0_index, x0_index, _ = find_nearest_grid_point(
                bottom_left[0],
                bottom_left[1],
                self.get_dataset_variable(lat_var),
                self.get_dataset_variable(lon_var),
            )
            y1_index, x1_index, _ = find_nearest_grid_point(
                top_right[0],
                top_right[1],
                self.get_dataset_variable(lat_var),
                self.get_dataset_variable(lon_var),
            )
            y2_index, x2_index, _ = find_nearest_grid_point(
                bottom_left[0],
                top_right[1],
                self.get_dataset_variable(lat_var),
                self.get_dataset_variable(lon_var),
            )
            y3_index, x3_index, _ = find_nearest_grid_point(
                top_right[0],
                bottom_left[1],
                self.get_dataset_variable(lat_var),
                self.get_dataset_variable(lon_var),
            )

        #     y_slice = slice(
        #         min(y0_index, y1_index, y2_index, y3_index),
        #         max(y0_index, y1_index, y2_index, y3_index),
        #     )

        #     #  if region crosses antimeridian
        #     def crosses_antimeridian(lon_min, lon_max):
        #         lon_min = ((lon_min + 180) % 360) - 180
        #         lon_max = ((lon_max + 180) % 360) - 180
        #         return lon_max < lon_min

        #     if crosses_antimeridian(bottom_left[1], top_right[1]):
        #         # Region crosses 180/-180 → grab both sides of the cut
        #         left = self.dataset.sel({lon_var: slice(bottom_left[1], 180)})
        #         right = self.dataset.sel({lon_var: slice(-180, top_right[1])})
        #         self.dataset = xarray.concat([left, right], dim=lon_var)

        #         x_slice = slice(self.get_dataset_variable(lon_var).size)
        #     else:

        #         x_slice = slice(
        #             min(x0_index, x1_index, x2_index, x3_index),
        #             max(x0_index, x1_index, x2_index, x3_index),
        #         )

        #     p0 = geopy.Point(bottom_left)
        #     p1 = geopy.Point(top_right)
        # else:
        #     y_slice = slice(self.get_dataset_variable(lat_var).size)
        #     x_slice = slice(self.get_dataset_variable(lon_var).size)

        #     p0 = geopy.Point([-85.0, -180.0])
        #     p1 = geopy.Point([85.0, 180.0])
        # ——————————————
        # pull out your y/x dimension names
        y_coord, x_coord = self.yx_dimensions
        lat0, lon0 = bottom_left
        lat1, lon1 = top_right

        # 1) compute y_slice exactly as before
        y_slice = slice(
            min(y0_index, y1_index, y2_index, y3_index),
            max(y0_index, y1_index, y2_index, y3_index),
        )

        # 2) gather all x‐indices and find min/max
        x_indices = [x0_index, x1_index, x2_index, x3_index]
        x_min_idx, x_max_idx = min(x_indices), max(x_indices)
        x_slice = slice(x_min_idx, x_max_idx + 1)

        def crosses_antimeridian(lon_min, lon_max):
            lon_min = ((lon_min + 180) % 360) - 180
            lon_max = ((lon_max + 180) % 360) - 180
            return lon_max < lon_min

        if crosses_antimeridian(lon0, lon1):
            part1 = self.dataset.isel({y_coord: y_slice, x_coord: slice(0, x_min_idx)})
            part2 = self.dataset.isel(
                {
                    y_coord: y_slice,
                    x_coord: slice(x_max_idx, self.dataset[x_coord].size),
                }
            )
            self.dataset = xarray.concat([part2, part1], dim=x_coord)
        else:
            self.dataset = self.dataset.isel(
                {y_coord: y_slice, x_coord: slice(x_min_idx, x_max_idx + 1)}
            )

        p0 = geopy.Point(bottom_left)
        p1 = geopy.Point(top_right)

        # Get timestamp
        time_var = find_variable("time", list(self.dataset.variables.keys()))
        timestamp = str(
            format_date(
                self.timestamp_to_iso_8601(
                    self.get_dataset_variable(time_var)[time_range[0]].values
                ),
                "yyyMMdd",
            )
        )
        endtimestamp = ""
        if apply_time_range:
            endtimestamp = "-" + str(
                format_date(
                    self.timestamp_to_iso_8601(
                        self.get_dataset_variable(time_var)[time_range[1]].values
                    ),
                    "yyyMMdd",
                )
            )

        dataset_name = query.get("dataset")
        y_coord, x_coord = self.yx_dimensions

        # Select requested time (time range if applicable)
        if apply_time_range:
            # slice doesn't include the last element
            time_slice = slice(int(time_range[0]), int(time_range[1]) + 1)
        else:
            time_slice = slice(int(time_range[0]), int(time_range[0]) + 1)

        # subset = ds_region.isel(**{time_var: time_slice})
        time_dim = self.time_variable.name
        subset = self.dataset.isel(**{time_dim: time_slice})
        # Filter out unwanted variables
        output_vars = query.get("variables").split(",")
        # Keep the coordinate variables
        output_vars.extend(filter(None, [depth_var, time_var, lat_var, lon_var]))
        for variable in subset.data_vars:
            if variable not in output_vars:
                subset = subset.drop_vars([variable])

        time_dim = self.time_variable.name
        y_dim, x_dim = y_coord, x_coord
        for variable in output_vars:
            # if variable is a computed variable, overwrite it
            # if isinstance(
            # #     self.get_dataset_variable(variable), data.calculated.CalculatedArray
            # # ):
            #     subset = subset.assign(
            #         **{
            #             variable: self.get_dataset_variable(variable).isel(
            #                 **{time_var: time_slice, y_coord: y_slice, x_coord: x_slice}
            #             )
            #         }
            #     )

            if isinstance(subset[variable], data.calculated.CalculatedArray):
                subset = subset.assign(
                    **{
                        variable: subset[variable].isel(
                            **{time_dim: time_slice, y_dim: y_slice, x_dim: x_slice}
                        )
                    }
                )
                # Cast each attribute to str (allows exporting to all NC formats)
            subset[variable].attrs = {
                key: str(value) for key, value in subset[variable].attrs.items()
            }

        output_format = query.get("output_format")
        filename = (
            dataset_name
            + "_"
            + "%dN%dW-%dN%dW" % (p0.latitude, p0.longitude, p1.latitude, p1.longitude)
            + "_"
            + timestamp
            + endtimestamp
            + "_"
            + output_format
        )

        # Workaround for
        # https://github.com/pydata/xarray/issues/2822#issuecomment-475487497
        if "_NCProperties" in subset.attrs.keys():
            del subset.attrs["_NCProperties"]

        # "Special" output
        if output_format == "NETCDF3_NC":
            GRID_RESOLUTION = 50

            # Regrids an input data array according to it's input grid definition
            # to the output definition
            def regrid(
                data: np.ndarray,
                input_def: pyresample.geometry.SwathDefinition,
                output_def: pyresample.geometry.SwathDefinition,
            ):
                orig_shape = data.shape

                data = np.rollaxis(data, 0, 4)  # Roll time axis backward
                data = np.rollaxis(data, 0, 4)  # Roll depth axis backward
                # Merge time + depth axis together
                data = data.reshape([data.shape[0], data.shape[1], -1])

                # Perform regridding using nearest neighbour weighting
                regridded = pyresample.kd_tree.resample_nearest(
                    input_def, data, output_def, 50000, fill_value=None
                )
                # Move merged axis back to front
                regridded = np.moveaxis(regridded, -1, 0)
                # Match target output grid (netcdf4 used to do this automatically but
                # now it doesn't >.>)
                return np.reshape(
                    regridded,
                    (orig_shape[0], orig_shape[1], GRID_RESOLUTION, GRID_RESOLUTION),
                )

            # Check lat/lon wrapping
            lon_vals, lat_vals = pyresample.utils.check_and_wrap(
                lons=subset[lon_var].values, lats=subset[lat_var].values
            )

            # Generate our lat/lon grid of 50x50 resolution
            min_lon, max_lon = np.amin(lon_vals), np.amax(lon_vals)
            min_lat, max_lat = np.amin(lat_vals), np.amax(lat_vals)
            XI = np.linspace(
                min_lon, max_lon, num=GRID_RESOLUTION, dtype=lon_vals.dtype
            )
            YI = np.linspace(
                min_lat, max_lat, num=GRID_RESOLUTION, dtype=lat_vals.dtype
            )
            XI_mg, YI_mg = np.meshgrid(XI, YI)

            # Define input/output grid definitions
            if lon_vals.ndim == 1:
                lon_vals, lat_vals = np.meshgrid(lon_vals, lat_vals)
            input_def = pyresample.geometry.SwathDefinition(
                lons=lon_vals, lats=lat_vals
            )
            output_def = pyresample.geometry.SwathDefinition(lons=XI_mg, lats=YI_mg)

            # Find correct variable names in subset
            temp_var = find_variable("temp", subset.variables)
            saline_var = find_variable("salin", subset.variables)
            x_vel_var = find_variable("crtx", subset.variables)
            y_vel_var = find_variable("crty", subset.variables)

            # Create file
            time_range = len(subset[time_var][:]) - 1
            filename = (
                dataset_name.upper()
                + "_"
                + datetime.date.today().strftime("%Y%m%d")
                + "_d0"
                + (("-" + str(time_range)) if time_range > 0 else "")
                + "_"
                + str(np.round(top_right[0]).astype(int))
                + "N"
                + str(np.abs(np.round(bottom_left[1]).astype(int))).zfill(3)
                + "W"
                + str(np.round(bottom_left[0]).astype(int))
                + "N"
                + str(np.abs(np.round(top_right[1])).astype(int)).zfill(3)
                + "W"
                + "_"
                + output_format
            )
            ds = netCDF4.Dataset(
                working_dir + filename + ".nc", "w", format="NETCDF3_CLASSIC"
            )
            ds.description = "Converted " + dataset_name
            ds.history = "Created: " + str(datetime.datetime.now())
            ds.source = "www.oceannavigator.ca"

            # Create the netcdf dimensions
            ds.createDimension("lat", GRID_RESOLUTION)
            ds.createDimension("lon", GRID_RESOLUTION)
            ds.createDimension("time", len(subset[time_var][:]))

            # Create the netcdf variables and assign the values
            latitudes = ds.createVariable("lat", "d", ("lat",))
            longitudes = ds.createVariable("lon", "d", ("lon",))
            latitudes[:] = YI
            longitudes[:] = XI

            # Variable Attributes
            latitudes.long_name = "Latitude"
            latitudes.units = "degrees_north"
            latitudes.NAVO_code = 1

            longitudes.long_name = "Longitude"
            longitudes.units = "degrees_east"
            longitudes.NAVO_code = 2

            ds.createDimension("depth", len(subset[depth_var][:]))
            levels = ds.createVariable("depth", "i", ("depth",))
            levels[:] = subset[depth_var][:]
            levels.long_name = "Depth"
            levels.units = "meter"
            levels.positive = "down"
            levels.NAVO_code = 5

            if temp_var is not None:
                temp = ds.createVariable(
                    "water_temp",
                    "d",
                    ("time", "depth", "lat", "lon"),
                    fill_value=-30000.0,
                )
                temp_data = regrid(subset[temp_var].values, input_def, output_def)

                # Convert from Kelvin to Celsius
                ureg = pint.UnitRegistry()
                try:
                    u = ureg.parse_units(subset[temp_var].units.lower())
                except (AttributeError, ValueError):
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
                    "salinity",
                    "d",
                    ("time", "depth", "lat", "lon"),
                    fill_value=-30000.0,
                )
                salinity[:] = regrid(subset[saline_var].values, input_def, output_def)[
                    :
                ]
                salinity.long_name = "Salinity"
                salinity.units = "psu"
                salinity.valid_min = 0.0
                salinity.valid_max = 45.0
                salinity.NAVO_code = 16
            if x_vel_var is not None:
                x_velo = ds.createVariable(
                    "water_u", "d", ("time", "depth", "lat", "lon"), fill_value=-30000.0
                )
                x_velo[:] = regrid(subset[x_vel_var].values, input_def, output_def)[:]
                x_velo.long_name = "Eastward Water Velocity"
                x_velo.units = "meter/sec"
                x_velo.NAVO_code = 17
            if y_vel_var is not None:
                y_velo = ds.createVariable(
                    "water_v", "d", ("time", "depth", "lat", "lon"), fill_value=-30000.0
                )
                y_velo[:] = regrid(subset[y_vel_var].values, input_def, output_def)[:]
                y_velo.long_name = "Northward Water Velocity"
                y_velo.units = "meter/sec"
                y_velo.NAVO_code = 18

            temp_file_name = working_dir + str(uuid.uuid4()) + ".nc"
            subset.to_netcdf(temp_file_name)
            subset.close()

            # Reopen using netCDF4 to get non-encoded time values
            subset = netCDF4.Dataset(temp_file_name, "r")

            times = ds.createVariable("time", "i", ("time",))
            # Convert time from seconds to hours
            for i in range(0, len(subset[time_var])):
                times[i] = subset[time_var][i] / 3600

            times.long_name = "Validity time"
            times.units = "hours since 1950-01-01 00:00:00"
            times.time_origin = "1950-01-01 00:00:00"

            ds.close()
            subset.close()
        elif output_format == "NETCDF3_CLASSIC":
            subset = subset.fillna(9999)
            encoding = {var: {"_FillValue": 9999} for var in subset.variables}
            subset.to_netcdf(
                working_dir + filename + ".nc", format=output_format, encoding=encoding
            )
        else:
            # Save subset normally
            subset.to_netcdf(working_dir + filename + ".nc", format=output_format)

        if int(query.get("should_zip")) == 1:
            myzip = zipfile.ZipFile("%s%s.zip" % (working_dir, filename), mode="w")
            myzip.write(
                "%s%s.nc" % (working_dir, filename),
                Path("%s%s.nc" % (working_dir, filename)).name,
            )
            myzip.comment = b"Generated from www.oceannavigator.ca"
            myzip.close()  # Must be called to actually create zip
            return working_dir, filename + ".zip"

        return working_dir, filename + ".nc"

    def interpolate(self, input_def, output_def, data):
        """Interpolates data given input and output definitions
        and the selected interpolation algorithm.
        """

        # Ignore pyresample warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            warnings.simplefilter("ignore", UserWarning)

            # Interpolation with gaussian weighting
            if self.interp == "gaussian":
                return pyresample.kd_tree.resample_gauss(
                    input_def,
                    data,
                    output_def,
                    radius_of_influence=float(self.radius),
                    sigmas=self.radius / 2,
                    fill_value=None,
                )

            # Bilinear weighting
            elif self.interp == "bilinear":
                """
                Weight function used to determine the effect of surrounding points
                on a given point
                """

                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                    return 1.0 / r

                return pyresample.kd_tree.resample_custom(
                    input_def,
                    data,
                    output_def,
                    radius_of_influence=float(self.radius),
                    neighbours=self.neighbours,
                    fill_value=None,
                    weight_funcs=weight,
                )

            # Inverse-square weighting
            elif self.interp == "inverse":
                """
                Weight function used to determine the effect of surrounding points
                on a given point
                """

                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                    return 1.0 / r**2

                return pyresample.kd_tree.resample_custom(
                    input_def,
                    data,
                    output_def,
                    radius_of_influence=float(self.radius),
                    neighbours=self.neighbours,
                    fill_value=None,
                    weight_funcs=weight,
                )

            # Nearest-neighbour interpolation (junk)
            elif self.interp == "nearest":
                return np.ma.asarray(
                    pyresample.kd_tree.resample_nearest(
                        input_def,
                        data,
                        output_def,
                        radius_of_influence=float(self.radius),
                    )
                )

        raise ValueError(f"Unknown interpolation method {self.interp}.")

    @property
    def time_variable(self):
        """Finds and returns the xArray.IndexVariable containing
        the time dimension in self.dataset
        """

        if self._time_variable is not None:
            return self._time_variable

        self._time_variable = self.__find_variable(["time", "time_counter", "Times"])
        return self._time_variable

    @property
    def latlon_variables(self) -> tuple:
        """Finds the lat and lon variable arrays in the dataset.

        Returns:
            tuple -- tuple containing the xarray.DataArray's for latitude and
            longitude.
        """
        return (
            self.__find_variable(["nav_lat", "latitude", "lat"]),
            self.__find_variable(["nav_lon", "longitude", "lon"]),
        )

    @property
    def dimensions(self) -> List[str]:
        try:
            return list(self.dataset.dims)
        except AttributeError:
            # FVCOM datasets are netCDF4.Dataset instances that use a dimensions
            # property
            return [dim for dim in self.dataset.dimensions]

    @property
    def depth_dimensions(self) -> List[str]:
        """
        Returns the possible names of the depth dimension in the dataset
        """

        return ["depth", "deptht", "z"]

    @property
    def y_dimensions(self) -> Set[str]:
        """
        Possible names of the y dimension in the dataset.
        """

        return {"y", "yc", "latitude", "gridY"}

    @property
    def x_dimensions(self) -> Set[str]:
        """
        Possible names of the x dimension in the dataset.
        """

        return {"x", "xc", "longitude", "gridX"}

    @property
    def yx_dimensions(self) -> Tuple[str, str]:
        """
        Names of the y and x dimensions in the dataset.
        """
        dims = set(self.dimensions)

        y_dim = self.y_dimensions.intersection(dims)
        try:
            y_dim = y_dim.pop()
        except KeyError:
            raise ValueError(
                f"None of {self.y_dimensions} were found in dataset's \
                    dimensions {dims}."
            ) from KeyError

        x_dim = self.x_dimensions.intersection(dims)
        try:
            x_dim = x_dim.pop()
        except KeyError:
            raise ValueError(
                f"None of {self.x_dimensions} were found in dataset's \
                    dimensions {dims}."
            ) from KeyError

        return y_dim, x_dim

    def get_dataset_variable(self, key: str) -> xarray.DataArray:
        """
        Returns the xarray.DataArray for a given variable key
        """
        return self.dataset[key]

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
                self._variable_list = (
                    db.get_data_variables()
                )  # Cache the list for later

        elif url.endswith(".zarr"):
            ds_zarr = xarray.open_zarr(url)
            var_list = []
            for var in list(ds_zarr.data_vars):
                name = var
                units = (
                    ds_zarr.variables[var].attrs["units"]
                    if ds_zarr.variables[var].attrs["units"]
                    else None
                )
                long_name = (
                    ds_zarr.variables[var].attrs["long_name"]
                    if ds_zarr.variables[var].attrs["long_name"]
                    else name
                )
                valid_min = (
                    ds_zarr.variables[var].attrs["valid_min"]
                    if ds_zarr.variables[var].attrs["valid_min"]
                    else None
                )
                valid_max = (
                    ds_zarr.variables[var].attrs["valid_max"]
                    if ds_zarr.variables[var].attrs["valid_max"]
                    else None
                )

                var_list.append(
                    Variable(
                        name,
                        long_name,
                        units,
                        list(ds_zarr[name].dims),
                        valid_min,
                        valid_max,
                    )
                )

            self._variable_list = var_list

        else:
            try:
                # Handle possible list of URLs for staggered grid velocity field
                # datasets
                url = self.url if isinstance(self.url, list) else [self.url]
                if len(url) > 1:
                    ds = self._construct_remote_ds(url, False)
                else:
                    ds = xarray.open_mfdataset(url, decode_times=False)
                # Cache the list for later
                self._variable_list = self._get_xarray_data_variables(ds)
            except ValueError:
                # xarray won't open FVCOM files due to dimension/coordinate/variable
                # label duplication issue, so fall back to using netCDF4.Dataset()
                with netCDF4.Dataset(self.url) as ds:
                    self._variable_list = self._get_netcdf4_data_variables(
                        ds
                    )  # Cache the list for later

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
                    var,
                    ds[var].attrs["long_name"],
                    ds[var].attrs["units"],
                    tuple([dim for dim in ds.dims]),
                    # Use .get() here to provide None if variable metadata lacks
                    # valid_min or valid_max
                    ds[var].attrs.get("valid_min"),
                    ds[var].attrs.get("valid_max"),
                )
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
                    var,
                    ds[var].getncattr("long_name"),
                    ds[var].getncattr("units"),
                    tuple([dim for dim in ds.dimensions]),
                    valid_min,
                    valid_max,
                )
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
            time_list = data.utils.time_index_to_datetime(
                np.sort(var), var.attrs["units"]
            )
            timestamps = np.array(time_list)
            timestamps.setflags(write=False)  # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")

    def get_nc_file_list(
        self, datasetconfig: DatasetConfig, **kwargs: dict
    ) -> Union[List, None]:
        try:
            if not datasetconfig.url.endswith(".sqlite3"):
                # This method is only applicable to SQLite-indexed datasets
                return
        except AttributeError:
            # Probably a file path dataset config for which this method is also not
            # applicable
            return

        try:
            variables = kwargs["variable"]
        except KeyError:
            variables = set()

        variables = {variables} if isinstance(variables, str) else set(variables)
        calculated_variables = datasetconfig.calculated_variables
        with SQLiteDatabase(self.url) as db:
            variables_to_load = self.__get_variables_to_load(
                db, variables, calculated_variables
            )

            if len(variables_to_load) == 0:
                return []

            timestamp = self.__get_requested_timestamps(
                db,
                variables_to_load[0],
                kwargs.get("timestamp", -1),
                kwargs.get("endtime"),
                kwargs.get("nearest_timestamp", False),
            )

            if not timestamp:
                raise RuntimeError("Error finding timestamp(s) in database.")

            file_list = db.get_netcdf_files(timestamp, variables_to_load)
            if len(file_list) > 50:
                file_list = np.array(file_list)
                idx = np.linspace(0, file_list.size - 1, 50, dtype=int)
                file_list = file_list[idx].tolist()
            if not file_list:
                raise RuntimeError("NetCDF file list is empty.")

            return file_list

    def __get_variables_to_load(
        self, db: SQLiteDatabase, variable: set, calculated_variables: dict
    ) -> List[str]:
        calc_var_keys = set(calculated_variables)
        variables_to_load = variable.difference(calc_var_keys)
        requested_calculated_variables = variable & calc_var_keys
        if requested_calculated_variables:
            for rcv in requested_calculated_variables:
                equation = calculated_variables[rcv]["equation"]

                variables_to_load.update(
                    data.utils.get_data_vars_from_equation(
                        equation, [v.key for v in db.get_data_variables()]
                    )
                )

        return list(variables_to_load)

    def __get_requested_timestamps(
        self, db: SQLiteDatabase, variable: str, timestamp, endtime, nearest_timestamp
    ) -> List[int]:
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
            return db.get_timestamp_range(timestamp, endtime, variable)

        # Otherwise assume negative values are indices into timestamp list
        all_timestamps = db.get_timestamps(variable)
        len_timestamps = len(all_timestamps)
        if timestamp < 0 and endtime > 0:
            idx = data.utils.roll_time(timestamp, len_timestamps)
            return db.get_timestamp_range(all_timestamps[idx], endtime, variable)

        if timestamp > 0 and endtime < 0:
            idx = data.utils.roll_time(endtime, len_timestamps)
            return db.get_timestamp_range(timestamp, all_timestamps[idx], variable)

    def _construct_remote_ds(self, urls: list, decode_times: bool) -> xarray.Dataset:
        """Constructs dataset from multiple remote urls. This avoids memory errors due
        to xarray's inability to lazily concatenate large datasets. Datasets are
        arbitrarily limited to 100 most recent timestamps.
        """
        fields = xarray.Dataset()
        for url in urls:
            field = xarray.open_dataset(url, decode_times=decode_times)
            variables = list(field.keys())
            for var in variables:
                fields[var] = field[var][-100:]
        fields.attrs = field.attrs

        return fields
