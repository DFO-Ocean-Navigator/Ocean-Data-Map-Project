import pyresample
import numpy as np
import warnings
import netcdf_data
from pint import UnitRegistry
from data import Variable, VariableList
import math

RAD_FACTOR = np.pi / 180.0
EARTH_RADIUS = 6378137.0


class Mercator(netcdf_data.NetCDFData):
    __depths = None

    @property
    def depth_dimensions(self):
        return ['depth', 'deptht', 'z']

    @property
    def depths(self):
        if self.__depths is None:
            var = None
            for v in ['depth', 'deptht']:
                if v in self._dataset.variables:
                    var = self._dataset.variables[v]
                    break

            if var is not None:
                ureg = UnitRegistry()
                unit = ureg.parse_units(var.units.lower())
                self.__depths = ureg.Quantity(
                    var[:], unit
                ).to(ureg.meters).magnitude
            else:
                self.__depths = np.array([0])

            self.__depths.flags.writeable = False

        return self.__depths

    @property
    def variables(self):
        l = []
        for name in self._dataset.variables:
            var = self._dataset.variables[name]
            if 'long_name' in var.ncattrs():
                long_name = var.long_name
            else:
                long_name = name
            if 'units' in var.ncattrs():
                units = var.units
            else:
                units = None
            l.append(Variable(name, long_name, units, var.dimensions))

        return VariableList(l)

    def __find_var(self, candidates):
        for c in candidates:
            if c in self._dataset.variables:
                return self._dataset.variables[c]

        return None

    def __find_index(self, lat, lon, n=1):
        def find_nearest(array, value, sorter):
            idx = np.searchsorted(array, value, side="left",
                                  sorter=sorter)

            result = []
            for i in range(0, len(value)):
                if idx[i] > 0 and (
                    idx[i] == len(array) or
                    math.fabs(value[i] - array[idx[i] - 1]) < math.fabs(
                        value[i] - array[idx[i]])
                ):
                    result.append(idx[i] - 1)
                else:
                    result.append(idx[i])

            return sorter[result]

        if not hasattr(lat, "__len__"):
            lat = [lat]
            lon = [lon]

        lat = np.array(lat)
        lon = np.mod(np.array(lon) + 360, 360)

        iy_min = find_nearest(self.latvar[:], lat, self.__latsort)
        ix_min = find_nearest(np.mod(self.lonvar[:] + 360, 360), lon,
                              self.__lonsort)

        return iy_min, ix_min, [50000]

    def __bounding_box(self, lat, lon, n=10):
        y, x, d = self.__find_index(lat, np.mod(np.add(lon, 360), 360), n)

        def fix_limits(data, limit):
            mx = np.amax(data)
            mn = np.amin(data)

            mn -= n / 2
            mx += n / 2

            mn = np.clip(mn, 0, limit)
            mx = np.clip(mx, 0, limit)

            return mn, mx

        miny, maxy = fix_limits(y, self.latvar.shape[0])
        minx, maxx = fix_limits(x, self.lonvar.shape[0])

        return miny, maxy, minx, maxx, np.amax(d)

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var, radius=50000):
        if len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)

        origshape = var.shape

        def weight(r):
            r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
            return 1. / r ** 2

        data = var[:]

        masked_lon_in = np.ma.array(lon_in)
        masked_lat_in = np.ma.array(lat_in)

        output_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_out),
            lats=np.ma.array(lat_out)
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)

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
                    output.append(pyresample.kd_tree.resample_custom(
                        input_def, data[:, :, d].transpose(), output_def,
                        radius_of_influence=float(radius),
                        neighbours=10,
                        weight_funcs=weight,
                        fill_value=None, nprocs=4
                    ))

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

                output = pyresample.kd_tree.resample_custom(
                    input_def, data.transpose(), output_def,
                    radius_of_influence=float(radius),
                    neighbours=10,
                    weight_funcs=weight,
                    fill_value=None, nprocs=4
                )

        if len(origshape) == 4:
            output = output.reshape(origshape[2:])

        return np.squeeze(output)

    def __init__(self, url):
        super(Mercator, self).__init__(url)
        self.latvar = None
        self.lonvar = None
        self.__latsort = None
        self.__lonsort = None

    def __enter__(self):
        super(Mercator, self).__enter__()

        if self.latvar is None:
            self.latvar = self.__find_var(['nav_lat', 'latitude', 'lat'])
            self.lonvar = self.__find_var(['nav_lon', 'longitude', 'lon'])
            self.__latsort = np.argsort(self.latvar[:])
            self.__lonsort = np.argsort(np.mod(self.lonvar[:] + 360, 360))

        return self

    def get_raw_point(self, latitude, longitude, depth, time, variable):
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]

        if depth == 'bottom':
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = d.reshape([d.shape[0], -1])

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

        var = self._dataset.variables[variable]

        if depth == 'bottom':
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = d.reshape([d.shape[0], -1])

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
                data = var[time, depth, miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]

            res = self.__resample(
                self.latvar[miny:maxy],
                self.lonvar[minx:maxx],
                latitude, longitude,
                data,
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

        var = self._dataset.variables[variable]
        res = self.__resample(
            self.latvar[miny:maxy],
            self.lonvar[minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx],
            radius
        )

        return res, np.squeeze([self.depths] * len(latitude))
