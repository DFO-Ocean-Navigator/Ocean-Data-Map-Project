from pykdtree.kdtree import KDTree
import pyresample
import numpy as np
import warnings
from netcdf_data import NetCDFData
from netCDF4 import netcdftime

RAD_FACTOR = np.pi / 180.0


class Nemo(NetCDFData):
    _timestamps = None

    @property
    def timestamps(self):
        if self._timestamps is None:
            var = None
            for v in ['time', 'time_counter']:
                if v in self._dataset.variables:
                    var = self._dataset.variables[v]
                    break

            t = netcdftime.utime(var.units)
            self._timestamps = np.array(map(t.num2date, var[:]))
            self._timestamps.flags.writeable = False

        return self._timestamps

    def __find_var(self, candidates):
        for c in candidates:
            if c in self._dataset.variables:
                return self._dataset.variables[c]

        return None

    def __find_index(self, lat, lon, n=1):
        if self.kdt is None:
            latvals = self.latvar[:] * RAD_FACTOR
            lonvals = self.lonvar[:] * RAD_FACTOR
            clat, clon = np.cos(latvals), np.cos(lonvals)
            slat, slon = np.sin(latvals), np.sin(lonvals)
            triples = np.array(list(zip(np.ravel(clat * clon),
                                        np.ravel(clat * slon),
                                        np.ravel(slat))))
            self.kdt = KDTree(triples)
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

        dist_sq_min, minindex_1d = self.kdt.query(np.float32(q), k=n)
        iy_min, ix_min = np.unravel_index(minindex_1d, self.latvar.shape)
        return iy_min, ix_min

    def __bounding_box(self, lat, lon, n=10):
        y, x = self.__find_index(lat, lon, n)

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

        miny, maxy = fix_limits(y, self.latvar.shape[0])
        minx, maxx = fix_limits(x, self.latvar.shape[1])

        return miny, maxy, minx, maxx

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var):
        input_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_in),
            lats=np.ma.array(lat_in)
        )
        output_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_out),
            lats=np.ma.array(lat_out)
        )

        if len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)
        elif len(var.shape) == 4:
            var = np.rollaxis(var, 0, 4)
            var = np.rollaxis(var, 0, 4)

        origshape = var.shape
        var = var.reshape([var.shape[0], var.shape[1], -1])

        radius = 500000
        wf = [lambda r: 1 / r ** 2] * var[:].shape[-1]
        wf = lambda r: 1.0 / r ** 2

        def weight(r):
            r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
            return 1. / r ** 2

        if len(var.shape) == 3:
            wf = [weight] * var.shape[-1]
        else:
            wf = weight

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            resampled = pyresample.kd_tree.resample_custom(
                input_def, var[:], output_def,
                radius_of_influence=radius,
                neighbours=10,
                weight_funcs=wf,
                fill_value=None, nprocs=4
            )

        if len(origshape) == 4:
            resampled = resampled.reshape(origshape[2:])

        return np.squeeze(resampled)

    def __init__(self, url):
        super(Nemo, self).__init__(url)
        self.kdt = None

    def __enter__(self):
        super(Nemo, self).__enter__()

        self.latvar = self.__find_var(['nav_lat', 'latitude'])
        self.lonvar = self.__find_var(['nav_lon', 'longitude'])

        return self

    def get_point(self, latitude, longitude, depth, time, variable):
        miny, maxy, minx, maxx = self.__bounding_box(latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]

        if depth == 'bottom':
            d = var[time, :, miny:maxy, minx:maxx]
            reshaped = d.reshape([d.shape[0], -1])
            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            data = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                     mask=True,
                                     dtype=d.dtype)
            data[np.unravel_index(indices, data.shape)] = d.reshape(
                [d.shape[0], -1])[depths, indices]

            res = self.__resample(
                self.latvar[miny:maxy, minx:maxx],
                self.lonvar[miny:maxy, minx:maxx],
                [latitude], [longitude],
                data
            )
        else:
            res = self.__resample(
                self.latvar[miny:maxy, minx:maxx],
                self.lonvar[miny:maxy, minx:maxx],
                [latitude], [longitude],
                var[time, depth, miny:maxy, minx:maxx]
            )

        return res

    def get_profile(self, latitude, longitude, time, variable):
        miny, maxy, minx, maxx = self.__bounding_box(latitude, longitude, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]
        res = self.__resample(
            self.latvar[miny:maxy, minx:maxx],
            self.lonvar[miny:maxy, minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx]
        )

        return res
