import re
import warnings

import dateutil.parser
import netCDF4 as netcdf
import numpy as np
import pyresample
import pytz
from cachetools import TTLCache
from pykdtree.kdtree import KDTree

from data.calculated import CalculatedData
from data.variable import Variable
from data.variable_list import VariableList
from utils.errors import ServerError

RAD_FACTOR = np.pi / 180.0
EARTH_RADIUS = 6378137.0


class Fvcom(CalculatedData):

    """
        FVCOM datasets have a non-uniform grid,
        so xArray can't handle it/
    """

    __depths = None

    def __init__(self, url: str, **kwargs):
        self._kdt: KDTree = [None, None]
        self.__timestamp_cache: TTLCache = TTLCache(1, 3600)

        super(Fvcom, self).__init__(url, **kwargs)

    def __enter__(self):
        if self._nc_files:
            self._dataset = netcdf.MFDataset(self._nc_files)
        else:
            self._dataset = netcdf.Dataset(self.url, 'r')

        return self

    """
        Returns the possible names of the depth dimension in the dataset
    """
    @property
    def depth_dimensions(self):
        return ['siglev', 'siglay']

    def subset(self, query):
        raise ServerError(
            "Subsetting FVCOM datasets is currently not supported.")

    def timestamp_to_time_index(self, timestamp: int):
        """Converts a given timestamp (e.g. 2031436800) into the corresponding
        time index for the time dimension. Overloaded for Fvcom to handle
        floating-point time indices.

        Arguments:
            timestamp {int} -- Raw timestamp.

        Returns:
            [int] -- Time index.
        """

        time_var = self.time_variable

        # https: // stackoverflow.com/a/41022847/2231969
        # We use 1.e-7 since the default 1.e-5 doesn't provide enough precision
        return next(i for i, _ in enumerate(time_var) if np.isclose(_, timestamp, 1.e-7))

    @property
    def depths(self):
        if self.__depths is None:
            self.__depths = np.array([0])
            self.__depths.setflags(write=False)  # Make immutable

        return self.__depths

    """
        Loads, caches, and returns the time dimension from a dataset.
    """
    @property
    def timestamps(self):
        if self.__timestamp_cache.get("timestamps") is None:
            for v in ['Times']:
                if v in self._dataset.variables:
                    var = self.get_dataset_variable(v)
                    break

            tz = pytz.timezone(var.time_zone)
            time_list = list(map(
                lambda dateStr:
                dateutil.parser.parse(dateStr).replace(tzinfo=tz),
                netcdf.chartostring(var[:])
            ))
            timestamps = np.array(time_list)
            timestamps.setflags(write=False)  # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")

    def __find_var(self, candidates):
        for c in candidates:
            if c in self._dataset.variables:
                return self.get_dataset_variable(c)

        return None

    def __find_index(self, lat, lon, element=False, n=10):
        index = int(element)

        if element:
            latvar = self.get_dataset_variable('latc')
            lonvar = self.get_dataset_variable('lonc')
        else:
            latvar = self.get_dataset_variable('lat')
            lonvar = self.get_dataset_variable('lon')

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
            latvar = self.get_dataset_variable('latc')
        else:
            latvar = self.get_dataset_variable('lat')
        mini, maxi = fix_limits(index, latvar.shape)

        return mini[0], maxi[0], np.clip(np.amax(d), 5000, 50000)

    def __latlon_vars(self, data_var):
        var = self.get_dataset_variable(data_var)
        if 'latc' in var.coordinates:
            latvar = self.get_dataset_variable('latc')
            lonvar = self.get_dataset_variable('lonc')
        else:
            latvar = self.get_dataset_variable('lat')
            lonvar = self.get_dataset_variable('lon')

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
            return 1. / r  # ** 2

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

    def get_raw_point(self, latitude, longitude, depth, timestamp, variable):
        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude, False, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self.get_dataset_variable(variable)
        time = self.timestamp_to_time_index(timestamp)
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

    def get_point(self, latitude, longitude, depth, timestamp, variable,
                  return_depth=False):
        var = self.get_dataset_variable(variable)
        time = self.timestamp_to_time_index(timestamp)
        latvar, lonvar = self.__latlon_vars(variable)

        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude,
            'nele' in self.get_dataset_variable(variable).dimensions,
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

    def __get_depths(self, variable, timestamp, min_i, max_i):
        var = self.get_dataset_variable(variable)
        time = self.timestamp_to_time_index(timestamp)

        if 'nele' in var.dimensions:
            # First, find indicies to cover the nodes
            nv = self.get_dataset_variable('nv')[:, min_i:max_i]
            min_n, max_n = np.amin(nv), np.amax(nv)

            if 'siglay' in var.dimensions:
                sigma_var = 'siglay'
            elif 'siglev' in var.dimensions:
                sigma_var = 'siglev'
            else:
                return np.zeros(max_i - min_i)

            radius = 50000

            lat_in = self.get_dataset_variable('lat')[min_n:max_n]
            lon_in = self.get_dataset_variable('lon')[min_n:max_n]
            lat_out = self.get_dataset_variable('latc')[min_i:max_i]
            lon_out = self.get_dataset_variable('lonc')[min_i:max_i]

            sigma = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self.get_dataset_variable(sigma_var)[:, min_n:max_n],
                radius
            ).transpose()
            bath = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self.get_dataset_variable('h')[min_n:max_n],
                radius
            )
            surf = self.__resample(
                lat_in, lon_in,
                lat_out, lon_out,
                self.get_dataset_variable('zeta')[time, min_n:max_n],
                radius
            ).transpose()

            if hasattr(time, "__len__"):
                sigma = np.tile(sigma, (len(time), 1, 1))
                sigma = np.rollaxis(sigma, 1, 0)

            z = -1 * (sigma * (bath + surf) + surf)
            return z
        else:
            if 'siglay' in var.dimensions:
                sigma = self.get_dataset_variable('siglay')[:, min_i:max_i]
            elif 'siglev' in var.dimensions:
                sigma = self.get_dataset_variable('siglev')[:, min_i:max_i]
            else:
                return np.array([0] * (max_i - min_i))

            bath = self.get_dataset_variable('h')[min_i:max_i]
            surf = self.get_dataset_variable('zeta')[time, min_i:max_i]

            if hasattr(time, "__len__"):
                sigma = np.tile(sigma, (len(time), 1, 1))
                sigma = np.rollaxis(sigma, 1, 0)

            z = -1 * (sigma * (bath + surf) + surf)
            return z

    def get_profile(self, latitude, longitude, timestamp, variable):
        latvar, lonvar = self.__latlon_vars(variable)
        time = self.timestamp_to_time_index(timestamp)

        min_i, max_i, radius = self.__bounding_box(
            latitude, longitude,
            'nele' in self.get_dataset_variable(variable).dimensions,
            10
        )

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        data = self.get_dataset_variable(variable)[time, :, min_i:max_i]
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
