from pykdtree.kdtree import KDTree
import pyresample
import numpy as np
import warnings
import data.netcdf_data as ncData
from pint import UnitRegistry
from data.data import Variable, VariableList
from netCDF4 import chartostring
import pytz
from cachetools import TTLCache
import dateutil.parser
import re

RAD_FACTOR = np.pi / 180.0
EARTH_RADIUS = 6378137.0
ureg = UnitRegistry()


class Fvcom(ncData.NetCDFData):
    __depths = None

    @property
    def depth_dimensions(self):
        return ['siglev', 'siglay']

    @property
    def depths(self):
        if self.__depths is None:
            self.__depths = np.array([0])
            self.__depths.flags.writeable = False

        return self.__depths

    @property
    def timestamps(self):
        if self.__timestamp_cache.get("timestamps") is None:
            for v in ['Times']:
                if v in self._dataset.variables:
                    var = self._dataset.variables[v]
                    break

            tz = pytz.timezone(var.time_zone)
            timestamps = np.array(
                [dateutil.parser.parse(datestr).replace(tzinfo=tz) for datestr in chartostring(var[:])]
            )
            timestamps.flags.writeable = False
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")

    @property
    def variables(self):
        l = []
        for name in self._dataset.variables:
            var = self._dataset.variables[name]
            if 'coordinates' not in var.ncattrs():
                continue

            if 'long_name' in var.ncattrs():
                long_name = var.long_name
            else:
                long_name = name

            if 'units' in var.ncattrs():
                units = var.units
            else:
                units = None

            if 'valid_min' in var.ncattrs():
                valid_min = float(re.sub(r"[^0-9\.\+,eE]", "",
                                         str(var.valid_min)))
                valid_max = float(re.sub(r"[^0-9\,\+,eE]", "",
                                         str(var.valid_max)))
            else:
                valid_min = None
                valid_max = None

            l.append(Variable(name, long_name, units, var.dimensions,
                              valid_min, valid_max))

        return VariableList(l)

    def __find_var(self, candidates):
        for c in candidates:
            if c in self._dataset.variables:
                return self._dataset.variables[c]

        return None

    def __find_index(self, lat, lon, element=False, n=10):
        index = int(element)

        if element:
            latvar = self._dataset.variables['latc']
            lonvar = self._dataset.variables['lonc']
        else:
            latvar = self._dataset.variables['lat']
            lonvar = self._dataset.variables['lon']

        if self._kdt[index] is None:
            latvals = latvar[:] * RAD_FACTOR
            lonvals = lonvar[:] * RAD_FACTOR
            clat, clon = np.cos(latvals), np.cos(lonvals)
            slat, slon = np.sin(latvals), np.sin(lonvals)
            triples = np.array([np.ravel(clat * clon), np.ravel(clat * slon),
                                np.ravel(slat)]).transpose()
            self._kdt[index] = KDTree(triples)
            del clat, clon
            del slat, slon
            del triples

        if not hasattr(lat, "__len__"):
            lat = [lat]
            lon = [lon]

        lat = np.array(lat)
        lon = np.array(lon)

        lat_rad = lat * RAD_FACTOR
        lon_rad = lon * RAD_FACTOR
        clat, clon = np.cos(lat_rad), np.cos(lon_rad)
        slat, slon = np.sin(lat_rad), np.sin(lon_rad)
        q = np.array([clat * clon, clat * slon, slat]).transpose()

        dist_sq_min, minindex_1d = self._kdt[index].query(np.float32(q), k=n)
        return np.squeeze(minindex_1d), dist_sq_min * EARTH_RADIUS

    def __bounding_box(self, lat, lon, element=False, n=10):
        index, d = self.__find_index(lat, lon, element, n)

        def fix_limits(data, limit):
            mx = np.amax(data)
            mn = np.amin(data)
            d = mx - mn

            if d < 2:
                mn -= 2
                mx += 2

            mn = int(mn - d / 4.0)
            mx = int(mx + d / 4.0)

            mn = np.clip(mn, 0, limit)
            mx = np.clip(mx, 0, limit)

            return mn, mx

        if element:
            latvar = self._dataset.variables['latc']
        else:
            latvar = self._dataset.variables['lat']
        mini, maxi = fix_limits(index, latvar.shape)

        return mini[0], maxi[0], np.clip(np.amax(d), 5000, 50000)

    def __latlon_vars(self, data_var):
        var = self._dataset.variables[data_var]
        if 'latc' in var.coordinates:
            latvar = self._dataset.variables['latc']
            lonvar = self._dataset.variables['lonc']
        else:
            latvar = self._dataset.variables['lat']
            lonvar = self._dataset.variables['lon']

        return latvar, lonvar

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var, radius=50000):
        if len(var.shape) == 2:
            var = np.rollaxis(var, 0, 2)
        elif len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)
            var = np.rollaxis(var, 0, 3)

        origshape = var.shape
        var = var.reshape([var.shape[0], -1])

        def weight(r):
            r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
            return 1. / r ** 2

        data = np.squeeze(var[:])

        masked_lon_in = np.ma.array(lon_in)
        masked_lat_in = np.ma.array(lat_in)

        output_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_out),
            lats=np.ma.array(lat_out)
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)

            if len(data.shape) == 2 and data.shape[1] != 1:
                output = []
                # multiple depths
                for d in range(0, data.shape[1]):
                    masked_lon_in.mask = masked_lat_in.mask = \
                        data[:, d].view(np.ma.MaskedArray).mask
                    input_def = pyresample.geometry.SwathDefinition(
                        lons=masked_lon_in,
                        lats=masked_lat_in
                    )
                    output.append(pyresample.kd_tree.resample_custom(
                        input_def, data[:, d], output_def,
                        radius_of_influence=float(radius),
                        neighbours=10,
                        weight_funcs=weight,
                        fill_value=None, nprocs=4
                    ))

                output = np.ma.array(output).transpose()
            else:
                masked_lon_in.mask = masked_lat_in.mask = \
                    var[:].view(np.ma.MaskedArray).mask
                input_def = pyresample.geometry.SwathDefinition(
                    lons=masked_lon_in,
                    lats=masked_lat_in
                )
                output = pyresample.kd_tree.resample_custom(
                    input_def, data, output_def,
                    radius_of_influence=float(radius),
                    neighbours=10,
                    weight_funcs=weight,
                    fill_value=None, nprocs=4
                )

        if len(origshape) == 3:
            output = output.reshape(origshape[1:])

        return np.squeeze(output)

    def __init__(self, url):
        self._kdt = [None, None]
        self.__timestamp_cache = TTLCache(1, 3600)
        super(Fvcom, self).__init__(url)

    def __enter__(self):
        super(Fvcom, self).__enter__()

        return self

    def get_raw_point(self, latitude, longitude, depth, time, variable):
        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude, False, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]
        latvar, lonvar = self.__latlon_vars(variable)

        if depth == 'bottom':
            depth = -1

        if len(var.shape) == 3:
            data = var[time, depth, min_i:max_i]
        else:
            data = var[time, min_i:max_i]

        return (
            latvar[min_i:max_i],
            lonvar[min_i:max_i],
            data
        )

    def get_point(self, latitude, longitude, depth, time, variable,
                  return_depth=False):
        var = self._dataset.variables[variable]
        latvar, lonvar = self.__latlon_vars(variable)

        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude,
            'nele' in self._dataset.variables[variable].dimensions,
            10
        )

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        if depth == 'bottom':
            depth = -1

        if len(var.shape) == 3:
            data = var[time, depth, min_i:max_i]
        else:
            data = var[time, min_i:max_i]

        res = self.__resample(
            latvar[min_i:max_i],
            lonvar[min_i:max_i],
            latitude, longitude,
            data,
            radius
        )

        if return_depth:
            d = self.__get_depths(variable, time, min_i, max_i)

            res_d = self.__resample(
                latvar[min_i:max_i],
                lonvar[min_i:max_i],
                latitude, longitude,
                d,
                radius
            )

            if len(latitude) > 1:
                dep = res_d[:, depth]
            else:
                dep = res_d[depth]

            return res, dep
        else:
            return res

    def __get_depths(self, variable, time, min_i, max_i):
        var = self._dataset.variables[variable]

        if 'nele' in var.dimensions:
            # First, find indicies to cover the nodes
            nv = self._dataset.variables['nv'][:, min_i:max_i]
            min_n, max_n = np.amin(nv), np.amax(nv)

            if 'siglay' in var.dimensions:
                sigma_var = 'siglay'
            elif 'siglev' in var.dimensions:
                sigma_var = 'siglev'
            else:
                return np.zeros(max_i - min_i)

            radius = 50000

            lat_in = self._dataset.variables['lat'][min_n:max_n]
            lon_in = self._dataset.variables['lon'][min_n:max_n]
            lat_out = self._dataset.variables['latc'][min_i:max_i]
            lon_out = self._dataset.variables['lonc'][min_i:max_i]

            sigma = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self._dataset.variables[sigma_var][:, min_n:max_n],
                radius
            ).transpose()
            bath = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self._dataset.variables['h'][min_n:max_n],
                radius
            )
            surf = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self._dataset.variables['zeta'][time, min_n:max_n],
                radius
            ).transpose()

            if hasattr(time, "__len__"):
                sigma = np.tile(sigma, (len(time), 1, 1))
                sigma = np.rollaxis(sigma, 1, 0)

            z = -1 * (sigma * (bath + surf) + surf)
            return z
        else:
            if 'siglay' in var.dimensions:
                sigma = self._dataset.variables['siglay'][:, min_i:max_i]
            elif 'siglev' in var.dimensions:
                sigma = self._dataset.variables['siglev'][:, min_i:max_i]
            else:
                return np.array([0] * (max_i - min_i))

            bath = self._dataset.variables['h'][min_i:max_i]
            surf = self._dataset.variables['zeta'][time, min_i:max_i]

            if hasattr(time, "__len__"):
                sigma = np.tile(sigma, (len(time), 1, 1))
                sigma = np.rollaxis(sigma, 1, 0)

            z = -1 * (sigma * (bath + surf) + surf)
            return z

    def get_profile(self, latitude, longitude, time, variable):
        latvar, lonvar = self.__latlon_vars(variable)

        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude,
            'nele' in self._dataset.variables[variable].dimensions,
            10
        )

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        data = self._dataset.variables[variable][time, :, min_i:max_i]
        res = self.__resample(
            latvar[min_i:max_i],
            lonvar[min_i:max_i],
            [latitude], [longitude],
            data,
            radius
        )

        d = self.__get_depths(variable, time, min_i, max_i)

        res_d = self.__resample(
            latvar[min_i:max_i],
            lonvar[min_i:max_i],
            [latitude], [longitude],
            d,
            radius
        )

        dep = res_d

        return res, dep
