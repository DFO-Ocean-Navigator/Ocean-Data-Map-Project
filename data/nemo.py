from pykdtree.kdtree import KDTree
import pyresample
import numpy as np
import warnings
from netcdf_data import NetCDFData
from pint import UnitRegistry
from data import Variable, VariableList

RAD_FACTOR = np.pi / 180.0
EARTH_RADIUS = 6378137.0


class Nemo(NetCDFData):
    __depths = None

    @property
    def depth_dimensions(self):
        return ['depth', 'deptht']

    @property
    def depths(self):
        if self.__depths is None:
            var = None
            for v in ['depth', 'deptht']:
                if v in self._dataset.variables:
                    var = self._dataset.variables[v]
                    break

            ureg = UnitRegistry()
            unit = ureg.parse_units(var.units.lower())
            self.__depths = ureg.Quantity(
                var[:], unit
            ).to(ureg.meters).magnitude
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

    def __find_index(self, lat, lon, latvar, lonvar, n=1):
        if self._kdt.get(latvar.name) is None:
            latvals = latvar[:] * RAD_FACTOR
            lonvals = lonvar[:] * RAD_FACTOR
            clat, clon = np.cos(latvals), np.cos(lonvals)
            slat, slon = np.sin(latvals), np.sin(lonvals)
            triples = np.array(list(zip(np.ravel(clat * clon),
                                        np.ravel(clat * slon),
                                        np.ravel(slat))))
            self._kdt[latvar.name] = KDTree(triples)
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

        dist_sq_min, minindex_1d = self._kdt[latvar.name].query(
            np.float32(q),
            k=n
        )
        iy_min, ix_min = np.unravel_index(minindex_1d, latvar.shape)
        return iy_min, ix_min, dist_sq_min * EARTH_RADIUS

    def __bounding_box(self, lat, lon, latvar, lonvar, n=10):
        y, x, d = self.__find_index(lat, lon, latvar, lonvar, n)

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

        miny, maxy = fix_limits(y, latvar.shape[0])
        minx, maxx = fix_limits(x, latvar.shape[1])

        return miny, maxy, minx, maxx, np.clip(np.amax(d), 5000, 50000)

    def __resample(self, lat_in, lon_in, lat_out, lon_out, var, radius=50000):
        if len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)
        elif len(var.shape) == 4:
            var = np.rollaxis(var, 0, 4)
            var = np.rollaxis(var, 0, 4)

        origshape = var.shape
        var = var.reshape([var.shape[0], var.shape[1], -1])

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
                    masked_lon_in.mask = masked_lat_in.mask = \
                        data[:, :, d].view(np.ma.MaskedArray).mask
                    input_def = pyresample.geometry.SwathDefinition(
                        lons=masked_lon_in,
                        lats=masked_lat_in
                    )
                    output.append(pyresample.kd_tree.resample_custom(
                        input_def, data[:, :, d], output_def,
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

        if len(origshape) == 4:
            output = output.reshape(origshape[2:])

        return np.squeeze(output)

    def __init__(self, url):
        super(Nemo, self).__init__(url)
        self._kdt = {}

    def __enter__(self):
        super(Nemo, self).__enter__()

        return self

    def __latlon_vars(self, variable):
        var = self._dataset.variables[variable]

        pairs = [
            ['nav_lat_u', 'nav_lon_u'],
            ['nav_lat_v', 'nav_lon_v'],
            ['nav_lat', 'nav_lon'],
            ['latitude_u', 'longitude_u'],
            ['latitude_v', 'longitude_v'],
            ['latitude', 'longitude'],
        ]

        if 'coordinates' in var.ncattrs():
            coordinates = var.coordinates.split()
            for p in pairs:
                if p[0] in coordinates:
                    return (
                        self._dataset.variables[p[0]],
                        self._dataset.variables[p[1]]
                    )
        else:
            for p in pairs:
                if p[0] in self._dataset.variables:
                    return (
                        self._dataset.variables[p[0]],
                        self._dataset.variables[p[1]]
                    )

        raise LookupError("Cannot find latitude & longitude variables")

    def get_raw_point(self, latitude, longitude, depth, time, variable):
        latvar, lonvar = self.__latlon_vars(variable)
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

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

        return (
            latvar[miny:maxy, minx:maxx],
            lonvar[miny:maxy, minx:maxx],
            data
        )

    def get_point(self, latitude, longitude, depth, time, variable,
                  return_depth=False):
        latvar, lonvar = self.__latlon_vars(variable)
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

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
                latvar[miny:maxy, minx:maxx],
                lonvar[miny:maxy, minx:maxx],
                [latitude], [longitude],
                data,
                radius
            )

            if return_depth:
                d = self.depths[depths]
                d = np.zeros(data.shape)
                d[np.unravel_index(indices, d.shape)] = self.depths[depths]
                if hasattr(time, "__len__"):
                    d = [d] * len(time)

                dep = self.__resample(
                    latvar[miny:maxy, minx:maxx],
                    lonvar[miny:maxy, minx:maxx],
                    [latitude], [longitude],
                    np.reshape(d, data.shape),
                    radius
                )

        else:
            if len(var.shape) == 4:
                data = var[time, depth, miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]
            res = self.__resample(
                latvar[miny:maxy, minx:maxx],
                lonvar[miny:maxy, minx:maxx],
                [latitude], [longitude],
                data,
                radius
            )

            if return_depth:
                dep = self.depths[depth]
                if hasattr(time, "__len__"):
                    dep = np.array([dep] * len(time))

        if return_depth:
            return res, dep
        else:
            return res

    def get_profile(self, latitude, longitude, time, variable):
        latvar, lonvar = self.__latlon_vars(variable)
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]
        res = self.__resample(
            latvar[miny:maxy, minx:maxx],
            lonvar[miny:maxy, minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx],
            radius
        )

        return res, np.squeeze([self.depths] * len(latitude))
