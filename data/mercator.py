import numpy as np
import pyresample
from pint import UnitRegistry

from data.calculated import CalculatedData
import data.geo as geo
from data.model import Model
from data.nearest_grid_point import find_nearest_grid_point
from utils.errors import APIError


class Mercator(Model):
    __depths = None

    def __init__(self, nc_data: CalculatedData) -> None:
        super().__init__(nc_data)
        self.latvar = None
        self.lonvar = None
        self.__latsort = None
        self.__lonsort = None
        self.nc_data = nc_data
        self._dataset = nc_data._dataset
        self._meta_only = nc_data.meta_only
        self.variables = nc_data.variables

    def __enter__(self):
        self.nc_data.__enter__()
        self._dataset = self.nc_data._dataset

        if not self._meta_only:
            if self.latvar is None:
                self.latvar, self.lonvar = self.nc_data.latlon_variables
                self.__latsort = np.argsort(self.latvar[:])
                self.__lonsort = np.argsort(np.mod(self.lonvar[:] + 360, 360))

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
                if v in list(self._dataset.coords.keys()):
                    # Get DataArray for depth
                    var = self.nc_data.get_dataset_variable(v)
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
            output = output.reshape(origshape[2:])

        return np.squeeze(output)

    def get_path(self, path, depth, time, variable, numpoints=100, times=None, return_depth=False):
        if times is None:
            if hasattr(time, "__len__"):
                times = self.nc_data.timestamp_to_iso_8601(time)
            else:
                times = None
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints, times=times)

        if return_depth:
            result, dep = self.get_point(lat, lon, depth, time, variable,
                                         return_depth=return_depth)
            return np.array([lat, lon]), distances, times, result, dep
        else:
            result = self.get_point(lat, lon, depth, time, variable,
                                    return_depth=return_depth)
            return np.array([lat, lon]), distances, times, result

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

    def get_point(self, latitude, longitude, depth, timestamp, variable, return_depth=False):

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
        return res

    def get_profile(self, latitude, longitude, timestamp, variable):
        var = self.nc_data.get_dataset_variable(variable)
        # We expect the following shape (time, depth, lat, lon)
        if len(var.shape) != 4:
            raise APIError("This plot requires a depth dimension. This dataset doesn't have a depth dimension.")

        time = self.nc_data.timestamp_to_time_index(timestamp)

        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        res = self.__resample(
            self.latvar[miny:maxy],
            self.lonvar[minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx].values,
            radius
        )

        return res, np.squeeze([self.depths] * len(latitude))
