import pyresample
import numpy as np
import warnings
from netCDF4 import Dataset
import cftime
from data.calculated import CalculatedData
from pint import UnitRegistry
from cachetools import TTLCache
from data.data import Variable, VariableList
from data.nearest_grid_point import find_nearest_grid_point
import math
import pytz
import re

class Mercator(CalculatedData):
    __depths = None

    def __init__(self, url, **kwargs):
        self.latvar = None
        self.lonvar = None
        self.__latsort = None
        self.__lonsort = None

        super(Mercator, self).__init__(url, **kwargs)

    def __enter__(self):
        super(Mercator, self).__enter__()

        if self.latvar is None:
            self.latvar = self.__find_var(['nav_lat', 'latitude', 'lat'])
            self.lonvar = self.__find_var(['nav_lon', 'longitude', 'lon'])
            self.__latsort = np.argsort(self.latvar[:])
            self.__lonsort = np.argsort(np.mod(self.lonvar[:] + 360, 360))

        return self

    """
        Finds, caches, and returns the valid depths for the dataset.
    """
    @property
    def depths(self) -> np.ndarray:
        if self.__depths is None:
            var = None
            for v in self.depth_dimensions:
                # Depth is usually a "coordinate" variable
                if v in list(self._dataset.coords.keys()):
                    # Get DataArray for depth
                    var = self.get_dataset_variable(v)
                    break

            if var is not None:
                ureg = UnitRegistry()
                unit = ureg.parse_units(var.attrs['units'].lower())
                self.__depths = ureg.Quantity(
                    var[:].values, unit
                ).to(ureg.meters).magnitude
            else:
                self.__depths = np.array([0])

            self.__depths.flags.writeable = False

        return self.__depths

    def __find_var(self, candidates):
        for c in candidates:
            if c in self._dataset.variables:
                return self.get_dataset_variable(c)

        return None

    def __bounding_box(self, lat, lon, n=10):

        y, x, _ = find_nearest_grid_point(lat, lon, self._dataset, self.latvar, self.lonvar, n)

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
        if len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)

        origshape = var.shape

        data = np.ma.masked_invalid(var[:])

        lon_in, lat_in = pyresample.utils.check_and_wrap(lon_in, lat_in)

        masked_lon_in = np.ma.array(lon_in)
        masked_lat_in = np.ma.array(lat_in)

        output_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_out),
            lats=np.ma.array(lat_out)
        )

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

                output.append(super(Mercator, self)._interpolate(input_def, output_def, data[:, :, d].transpose()))

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

            output = super(Mercator, self)._interpolate(input_def, output_def, data.transpose())

        if len(origshape) == 4:
            output = output.reshape(origshape[2:])

        return np.squeeze(output)

    def get_raw_point(self, latitude, longitude, depth, time, variable):
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.get_dataset_variable(variable)

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

    def get_point(self, latitude, longitude, depth, time, variable,
                  return_depth=False):

        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.get_dataset_variable(variable)

        if depth == 'bottom':
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = np.ma.masked_invalid(d.values.reshape([d.shape[0], -1]))

            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            if hasattr(time, "__len__"):
                data_in = var[time, :, miny:maxy, minx:maxx]
                data_in = data_in.reshape(
                    [data_in.shape[0], data_in.shape[1], -1])
                data = []
                for i, t in enumerate(time):
                    di = np.ma.MaskedArray(np.zeros(data_in.shape[-1]),
                                           mask=True,
                                           dtype=data_in.dtype)
                    di[indices] = data_in[i, depths, indices]
                    data.append(di)
                data = np.ma.array(data).reshape([len(time), d.shape[-2],
                                                  d.shape[-1]])
            else:
                data = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                         mask=True,
                                         dtype=d.dtype)
                data[np.unravel_index(indices, data.shape)] = \
                    reshaped[depths, indices]

            res = self.__resample(
                self.latvar[miny:maxy],
                np.mod(self.lonvar[minx:maxx] + 360, 360),
                [latitude], [longitude],
                data,
                radius
            )

            if return_depth:
                d = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                      mask=True,
                                      dtype=self.depths.dtype)

                d[np.unravel_index(indices, d.shape)] = self.depths[depths]

                if hasattr(time, "__len__"):
                    d = [d] * len(time)

                dep = self.__resample(
                    self.latvar[miny:maxy],
                    self.lonvar[minx:maxx],
                    latitude, longitude,
                    np.reshape(d, data.shape),
                    radius
                )

        else:
            if len(var.shape) == 4:
                data = var[time, int(depth), miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]

            res = self.__resample(
                self.latvar[miny:maxy],
                self.lonvar[minx:maxx],
                latitude, longitude,
                data.values,
                radius
            )

            if return_depth:
                dep = self.depths[depth]
                dep = np.tile(dep, len(latitude))
                if hasattr(time, "__len__"):
                    dep = np.array([dep] * len(time))

        if return_depth:
            return res, dep
        else:
            return res

    def get_profile(self, latitude, longitude, time, variable):
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.get_dataset_variable(variable)
        res = self.__resample(
            self.latvar[miny:maxy],
            self.lonvar[minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx].values,
            radius
        )

        return res, np.squeeze([self.depths] * len(latitude))
