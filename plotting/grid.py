from math import pi, radians, degrees
import numpy as np
# from scipy.spatial import cKDTree as KDTree
from pykdtree.kdtree import KDTree
import geopy
from geopy.distance import VincentyDistance
import scipy.interpolate
import itertools
from pyresample.geometry import SwathDefinition
from pyresample.kd_tree import resample_custom


class Grid(object):

    def __init__(self, ncfile, latvarname, lonvarname):
        """Initialization function

        Arguments:
            latvar -- the netCDF latitude variable
            lonvar -- the netCDF longitude variable
        """
        self.latvar = ncfile.variables[latvarname]
        self.lonvar = ncfile.variables[lonvarname]
        rad_factor = pi / 180.0
        latvals = self.latvar[:] * rad_factor
        lonvals = self.lonvar[:] * rad_factor
        clat, clon = np.cos(latvals), np.cos(lonvals)
        slat, slon = np.sin(latvals), np.sin(lonvals)
        triples = np.array(list(zip(np.ravel(clat * clon),
                           np.ravel(clat * slon),
                           np.ravel(slat))))

        self.kdt = KDTree(triples)

        self._shape = ncfile.variables[latvarname].shape

    def find_index(self, lat0, lon0, n=1):
        """Finds the y,x indicies that are closest to a latitude, longitude
        pair.

        Arguments:
            lat0 -- the target latitude
            lon0 -- the target longitude
            n -- the number of indicies to return

        Returns:
            y, x indicies
        """
        if hasattr(lat0, "__len__"):
            lat0 = np.array(lat0)
            lon0 = np.array(lon0)
            multiple = True
        else:
            multiple = False
        rad_factor = pi / 180.0
        lat0_rad = lat0 * rad_factor
        lon0_rad = lon0 * rad_factor
        clat0, clon0 = np.cos(lat0_rad), np.cos(lon0_rad)
        slat0, slon0 = np.sin(lat0_rad), np.sin(lon0_rad)
        q = [clat0 * clon0, clat0 * slon0, slat0]
        if multiple:
            q = np.array(q).transpose()
        dist_sq_min, minindex_1d = self.kdt.query(np.float32(q), k=n)
        iy_min, ix_min = np.unravel_index(minindex_1d, self._shape)
        return iy_min, ix_min

    def bounding_box(self, basemap):
        lon, lat = basemap.makegrid(100, 100)
        y, x = self.find_index(lat.ravel(), lon.ravel())
        miny, maxy = np.amin(y), np.amax(y)
        minx, maxx = np.amin(x), np.amax(x)
        return miny, maxy, minx, maxx

    def transect(self, variable, start, end, timestep, n=100):
        p0 = geopy.Point(start)
        p1 = geopy.Point(end)

        distances, target_lat, target_lon, b = points_between(p0, p1, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]
        data = variable[timestep,:, miny:maxy, minx:maxx]
        data = np.rollaxis(data, 0, 3)

        masked_lon = lon.view(np.ma.MaskedArray)
        masked_lat = lat.view(np.ma.MaskedArray)
        masked_lon.mask = masked_lat.mask = data.view(np.ma.MaskedArray).mask

        orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
        target_def = SwathDefinition(lons=np.array(target_lon),
                                     lats=np.array(target_lat))

        self._fill_invalid_shift(data)

        resampled = resample_custom(
            orig_def, data, target_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=np.tile([lambda r: 1 / r ** 2],
                                 data.shape[-1]).tolist(),
            fill_value=None, nprocs=4).transpose()

        return np.array([target_lat, target_lon]), distances, resampled

    def surfacetransect(self, variable, start, end, timestep, n=100):
        p0 = geopy.Point(start)
        p1 = geopy.Point(end)

        distances, target_lat, target_lon, b = points_between(p0, p1, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]
        if len(variable.shape) == 4:
            data = variable[timestep, 0, miny:maxy, minx:maxx]
        else:
            data = variable[timestep, miny:maxy, minx:maxx]

        masked_lon = lon.view(np.ma.MaskedArray)
        masked_lat = lat.view(np.ma.MaskedArray)
        masked_lon.mask = masked_lat.mask = data.view(np.ma.MaskedArray).mask

        orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
        target_def = SwathDefinition(lons=np.array(target_lon),
                                     lats=np.array(target_lat))

        resampled = resample_custom(
            orig_def, data, target_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=lambda r: 1 / r ** 2,
            fill_value=None, nprocs=4)

        return np.array([target_lat, target_lon]), distances, resampled

    def velocitytransect(self, variablex, variabley,
                         start, end, timestep, n=100):
        p0 = geopy.Point(start)
        p1 = geopy.Point(end)

        distances, target_lat, target_lon, b = points_between(p0, p1, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]

        r = radians(90 - b)
        xmag = variablex[timestep,:, miny:maxy, minx:maxx]
        ymag = variabley[timestep,:, miny:maxy, minx:maxx]
        theta = np.arctan2(ymag, xmag) - r
        mag = np.sqrt(xmag.filled() ** 2 + ymag.filled() ** 2)
        invalid = np.sqrt(xmag.fill_value ** 2 + ymag.fill_value ** 2)
        mag = np.ma.masked_values(mag, invalid)

        parallel = np.rollaxis(mag * np.cos(theta), 0, 3)
        perpendicular = np.rollaxis(mag * np.sin(theta), 0, 3)

        masked_lon = lon.view(np.ma.MaskedArray)
        masked_lat = lat.view(np.ma.MaskedArray)
        masked_lon.mask = masked_lat.mask = xmag.view(np.ma.MaskedArray).mask

        orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
        target_def = SwathDefinition(lons=np.array(target_lon),
                                     lats=np.array(target_lat))

        self._fill_invalid_shift(parallel)
        self._fill_invalid_shift(perpendicular)

        parallel_res = resample_custom(
            orig_def, parallel, target_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=np.tile([lambda r: 1 / r ** 2],
                                 parallel.shape[-1]).tolist(),
            fill_value=None, nprocs=4).transpose()
        perpendicular_res = resample_custom(
            orig_def, perpendicular, target_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=np.tile([lambda r: 1 / r ** 2],
                                 perpendicular.shape[-1]).tolist(),
            fill_value=None, nprocs=4).transpose()

        return np.array([target_lat, target_lon]), \
            distances, parallel_res, perpendicular_res

    def _fill_invalid_shift(self, z):
        # extend values down 1 depth step, but keep the mask from nearest
        # neighbour
        for shift in range(1, z.shape[-1]):
            if not z.mask.any():
                break
            z_shifted = np.roll(z, shift=shift, axis=1)
            idx = ~z_shifted.mask * z.mask
            z[idx] = z_shifted[idx]

        for shift in range(1, z.shape[0] / 2):
            if not z.mask.any():
                break
            for d in [-shift, shift]:
                z_shifted = np.roll(z, shift=d, axis=0)
                idx = ~z_shifted.mask * z.mask
                z[idx] = z_shifted[idx]


def points_between(start, end, numpoints):
    distance = VincentyDistance()

    distances = []
    latitudes = []
    longitudes = []

    lat0 = start.latitude
    lon0 = start.longitude
    lat1 = end.latitude
    lon1 = end.longitude

    if np.isclose(lat0, lat1):
        # Constant latitude
        latitudes = np.ones(numpoints) * lat0
        longitudes = np.linspace(lon0, lon1, num=numpoints)
        for lon in longitudes:
            distances.append(distance.measure(start, geopy.Point(lat0, lon)))
        if lon1 > lon0:
            b = 90
        else:
            b = -90
    elif np.isclose(lon0, lon1):
        # Constant longitude
        latitudes = np.linspace(lat0, lat1, num=numpoints)
        longitudes = np.ones(numpoints) * lon0
        for lat in latitudes:
            distances.append(distance.measure(start, geopy.Point(lat, lon0)))
        if lat1 > lat0:
            b = 0
        else:
            b = 180
    else:
        # Great Circle
        total_distance = distance.measure(start, end)
        distances = np.linspace(0, total_distance, num=numpoints)
        b = bearing(lat0, lon0, lat1, lon1)

        for d in distances:
            p = distance.destination(start, b, d)
            latitudes.append(p.latitude)
            longitudes.append(p.longitude)

    return distances, latitudes, longitudes, b


def bearing(lat0, lon0, lat1, lon1):
    lat0_rad = radians(lat0)
    lat1_rad = radians(lat1)
    diff_rad = radians(lon1 - lon0)

    x = np.cos(lat1_rad) * np.sin(diff_rad)
    y = np.cos(lat0_rad) * np.sin(lat1_rad) - np.sin(
        lat0_rad) * np.cos(lat1_rad) * np.cos(diff_rad)
    bearing = np.arctan2(x, y)

    return degrees(bearing)


def bathymetry(latvar, lonvar, depthvar, start, end, n=200):
    p0 = geopy.Point(start)
    p1 = geopy.Point(end)
    lat_to_idx = (latvar.shape[0] - 1) / (latvar[-1] - latvar[0])
    lon_to_idx = (lonvar.shape[0] - 1) / (lonvar[-1] - lonvar[0])

    distances, lat, lon, b = points_between(p0, p1, n)

    idx_x = np.round((lon - lonvar[0]) * lon_to_idx).astype(int)
    idx_y = np.round((lat - latvar[0]) * lat_to_idx).astype(int)
    idx_y = np.unique(idx_y.ravel())
    idx_x = np.unique(idx_x.ravel())

    x = latvar[idx_y].ravel()
    y = lonvar[idx_x].ravel()
    z = depthvar[idx_y, idx_x]

    coords = np.array(zip(itertools.product(x, y)))
    coords = coords.reshape(-1, 2)

    f = interpolator(coords, z.ravel())
    nn = scipy.interpolate.NearestNDInterpolator(coords, z.ravel())

    res = np.array(f(lat, lon))
    nans = np.where(np.isnan(res))
    res[nans] = np.array(nn(lat, lon))[nans]

    return distances, res


def interpolator(coords, z):
    if np.unique(coords[:, 0]).size == 1:
        c = coords[:, 1]

        if c[-1] > c[0]:
            g = scipy.interpolate.interp1d(c, z.ravel(),
                                           fill_value='extrapolate')
        else:
            g = scipy.interpolate.interp1d(c[::-1], z.ravel()[::-1],
                                           fill_value='extrapolate')

        def interp(x, y):
            return g(y)

        return interp
    elif np.unique(coords[:, 1]).size == 1:
        c = coords[:, 0]

        if c[-1] > c[0]:
            g = scipy.interpolate.interp1d(c, z.ravel(),
                                           fill_value='extrapolate')
        else:
            g = scipy.interpolate.interp1d(c[::-1], z.ravel()[::-1],
                                           fill_value='extrapolate')

        def interp(x, y):
            return g(x)

        return interp
    else:
        return scipy.interpolate.LinearNDInterpolator(coords, z)
