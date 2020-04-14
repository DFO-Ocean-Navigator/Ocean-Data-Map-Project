from typing import Union

import numpy as np
import pyresample
from pint import UnitRegistry

from data.calculated import CalculatedData
from data.model import Model
from data.nearest_grid_point import find_nearest_grid_point
from data.netcdf_data import NetCDFData
from utils.errors import APIError


class Mercator(Model):
    __depths = None

    def __init__(self, nc_data: Union[CalculatedData, NetCDFData]) -> None:
        super().__init__(nc_data)
        self.latvar = None
        self.lonvar = None
        self.nc_data = nc_data
        self._meta_only = nc_data.meta_only
        self.variables = nc_data.variables

    def __enter__(self):
        self.nc_data.__enter__()

        if not self._meta_only:
            if self.latvar is None:
                self.latvar, self.lonvar = self.nc_data.latlon_variables

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.nc_data.__exit__(exc_type, exc_value, traceback)

    @property
    def depths(self) -> np.ndarray:
        """Finds, caches, and returns the valid depths for the dataset.
        """
        if self.__depths is None:
            var = None
            for v in self.nc_data.depth_dimensions:
                # Depth is usually a "coordinate" variable
                if v in self.nc_data.dataset.coords:
                    # Get DataArray for depth
                    var = self.nc_data.get_dataset_variable(v)
                    break

            if var is not None:
                ureg = UnitRegistry()
                unit = ureg.parse_units(var.attrs['units'].lower())
                self.__depths = ureg.Quantity(var[:].values, unit).to(ureg.meters).magnitude
            else:
                self.__depths = np.array([0])

            self.__depths.flags.writeable = False

        return self.__depths

    def __bounding_box(self, lat, lon, n=10):

        y, x, _ = find_nearest_grid_point(lat, lon, self.latvar, self.lonvar, n)

        def fix_limits(data, limit):
            mx = np.amax(data)
            mn = np.amin(data)

            mn -= np.int64(n / 2)
            mx += np.int64(n / 2)

            mn = np.clip(mn, 0, limit)
            mx = np.clip(mx, 0, limit)

            return mn, mx

        miny, maxy = fix_limits(y, self.latvar.shape[0])
        minx, maxx = fix_limits(x, self.lonvar.shape[0])

        return np.int64(miny), np.int64(maxy), np.int64(minx), np.int64(maxx), np.amax(50000)

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var, radius=50000):
        var = np.squeeze(var)
        
        origshape = var.shape

        data, masked_lat_in, masked_lon_in, output_def = super()._make_resample_data(lat_in,
                                                                                     lon_in,
                                                                                     lat_out,
                                                                                     lon_out,
                                                                                     var)

        if len(data.shape) == 3:
            output = []
            # multiple depths
            for d in range(0, data.shape[2]):
                grid_lat, grid_lon = np.meshgrid(
                    masked_lat_in,
                    masked_lon_in
                )
                grid_lat.mask = grid_lon.mask = \
                    data[:, :, d].view(np.ma.MaskedArray).mask.transpose()
                input_def = pyresample.geometry.SwathDefinition(
                    lons=grid_lon,
                    lats=grid_lat
                )

                output.append(self.nc_data.interpolate(input_def, output_def, data[:, :, d].transpose()))

            output = np.ma.array(output).transpose()
        else:
            grid_lat, grid_lon = np.meshgrid(
                masked_lat_in,
                masked_lon_in
            )
            grid_lat.mask = grid_lon.mask = \
                data.view(np.ma.MaskedArray).mask.transpose()

            input_def = pyresample.geometry.SwathDefinition(
                lons=grid_lon,
                lats=grid_lat
            )

            output = self.nc_data.interpolate(input_def, output_def, data.transpose())

        if len(origshape) == 4:
            # un-collapse time and depth axes and
            # move axes back to original positions.
            output = np.rollaxis(output, -1).reshape((
                origshape[0], # time
                origshape[1], # depth
                output.shape[0], # lat
                output.shape[1] # lon
            ))

        return np.squeeze(output)

    def get_raw_point(self, latitude, longitude, depth, timestamp, variable):
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.nc_data.get_dataset_variable(variable)

        time = self.nc_data.timestamp_to_time_index(timestamp)

        if depth == 'bottom':
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = np.ma.masked_invalid(d.reshape([d.shape[0], -1]))

            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            if hasattr(time, "__len__"):
                data_in = var[time, :, miny:maxy, minx:maxx]
                data_in = data_in.reshape(
                    [data_in.shape[0], data_in.shape[1], -1])
                data = []
                for i, t in enumerate(time):
                    data.append(data_in[i, depths, indices])
                data = np.ma.array(data).reshape([len(time), d.shape[-2],
                                                  d.shape[-1]])
            else:
                data = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                         mask=True,
                                         dtype=d.dtype)
                data[np.unravel_index(indices, data.shape)] = \
                    reshaped[depths, indices]
        else:
            if len(var.shape) == 4:
                data = var[time, depth, miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]

        lat_out, lon_out = np.meshgrid(self.latvar[miny:maxy],
                                       self.lonvar[minx:maxx])

        return (
            lat_out,
            lon_out,
            data
        )

    def get_point(self, latitude, longitude, depth, variable, starttime,
                    endtime=None, return_depth=False):

        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.nc_data.get_dataset_variable(variable)

        starttime_idx = self.nc_data.timestamp_to_time_index(starttime)
        time_slice = slice(starttime_idx, starttime_idx + 1) # slice only 1 element
        if endtime is not None: # we have a range of times
            endtime_idx = self.nc_data.timestamp_to_time_index(endtime)
            time_slice = slice(starttime_idx, endtime_idx + 1)

            time_duration = endtime_idx - starttime_idx # how many time values we have

        depth_value = None
        res = None
        if depth == 'bottom':
            d = var[time_slice, :, miny:maxy, minx:maxx].values

            d = np.rollaxis(d, 0, 4) # roll time to back
            # compress lat, lon, time along depth axis
            reshaped = np.ma.masked_invalid(d.reshape([d.shape[0], -1]))

            # Find the bottom data values along depth axis.
            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            data = np.ma.MaskedArray(np.zeros(d.shape[1:]), # copy lat lon and time axis shapes
                                        mask=True,
                                        dtype=d.dtype)
            data[np.unravel_index(indices, data.shape)] = \
                reshaped[depths, indices]

            # Roll time axis back to the front
            data = np.rollaxis(data, 2, 0)

            res = self.__resample(
                self.latvar[miny:maxy],
                self.lonvar[minx:maxx],
                [latitude], [longitude],
                data,
                radius
            )

            if return_depth:
                depth_values = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                      mask=True,
                                      dtype=self.depths.dtype)

                depth_values[np.unravel_index(indices, depth_values.shape)] = self.depths[depths]

                dep = self.__resample(
                    self.latvar[miny:maxy],
                    self.lonvar[minx:maxx],
                    latitude, longitude,
                    np.reshape(depth_values, data.shape),
                    radius
                )

        else:
            if len(var.shape) == 4:
                data = var[time_slice, int(depth), miny:maxy, minx:maxx]
            else:
                data = var[time_slice, miny:maxy, minx:maxx]

            res = self.__resample(
                self.latvar[miny:maxy],
                self.lonvar[minx:maxx],
                latitude, longitude,
                data.values,
                radius
            )

            if return_depth:
                depth_value = self.depths[int(depth)]
                depth_value = np.tile(depth_value, len(latitude))
                if endtime is not None:
                    depth_value = np.array([depth_value] * time_duration)

        if return_depth:
            return res, depth_value
        return res

    def get_profile(self, latitude, longitude, variable, starttime, endtime=None):
        var = self.nc_data.get_dataset_variable(variable)
        # We expect the following shape (time, depth, lat, lon)
        if len(var.shape) != 4:
            raise APIError(f"This plot requires a depth dimension. This variable ({variable}) doesn't have a depth dimension.")

        time_slice = self.nc_data.make_time_slice(starttime, endtime)

        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        res = self.__resample(
            self.latvar[miny:maxy],
            self.lonvar[minx:maxx],
            [latitude], [longitude],
            var[time_slice, :, miny:maxy, minx:maxx].values,
            radius
        )

        return res, np.squeeze([self.depths] * len(latitude))
