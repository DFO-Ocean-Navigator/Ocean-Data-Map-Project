from math import pi, radians, degrees
import numpy as np
from pykdtree.kdtree import KDTree
import geopy
from geopy.distance import VincentyDistance
import scipy.interpolate
import itertools
from pyresample.geometry import SwathDefinition
from pyresample.kd_tree import resample_custom, resample_nearest
from cachetools import LRUCache
import pytz
from netCDF4 import netcdftime
from bisect import bisect_left

_data_cache = LRUCache(maxsize=16)


class Grid(object):

    def __init__(self, ncfile, latvarname, lonvarname):
        """Initialization function

        Arguments:
            latvar -- the netCDF latitude variable
            lonvar -- the netCDF longitude variable
        """
        self.latvar = ncfile.variables[latvarname]
        self.lonvar = ncfile.variables[lonvarname]

        if 'time_counter' in ncfile.variables:
            self.timevar = ncfile.variables['time_counter']
        elif 'time' in ncfile.variables:
            self.timevar = ncfile.variables['time']
        else:
            self.timevar = None

        self.kdt = _data_cache.get(ncfile.filepath())
        if self.kdt is None:
            rad_factor = pi / 180.0
            latvals = self.latvar[:] * rad_factor
            lonvals = self.lonvar[:] * rad_factor
            clat, clon = np.cos(latvals), np.cos(lonvals)
            slat, slon = np.sin(latvals), np.sin(lonvals)
            triples = np.array(list(zip(np.ravel(clat * clon),
                                        np.ravel(clat * slon),
                                        np.ravel(slat))))

            self.kdt = KDTree(triples)
            _data_cache[ncfile.filepath()] = self.kdt

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
        return self.bounding_box_grid(lat, lon)

    def bounding_box_grid(self, lat, lon):
        y, x = self.find_index(lat.ravel(), lon.ravel())
        miny, maxy = np.amin(y), np.amax(y)
        minx, maxx = np.amin(x), np.amax(x)

        dy = maxy - miny
        if dy < 2:
            miny -= 2
            maxy += 2

        miny = int(miny - dy / 4.0)
        if miny < 0:
            miny = 0
        maxy = int(maxy + dy / 4.0)
        if maxy >= self.latvar.shape[0]:
            maxy = self.latvar.shape[0] - 1

        dx = maxx - minx
        if dx < 2:
            minx -= 2
            maxx += 2

        minx = int(minx - dx / 4.0)
        if minx < 0:
            minx = 0
        maxx = int(maxx + dx / 4.0)
        if maxx >= self.latvar.shape[1]:
            maxx = self.latvar.shape[1] - 1

        return miny, maxy, minx, maxx

    def interpolation_radius(self, lat, lon):
        distance = VincentyDistance()
        d = distance.measure(
            (np.amin(lat), np.amin(lon)),
            (np.amax(lat), np.amax(lon))
        ) * 1000 / 1.5
        if d == 0:
            d = 50000
        return d

    def transect(self, variable, points, timestep, n=100,
                 interpolation={'method': 'inv_square', 'neighbours': 8}):
        distances, target_lat, target_lon, b = _path_to_points(points, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]
        data = variable[timestep, :, miny:maxy, minx:maxx]
        data = np.rollaxis(data, 0, 3)

        _fill_invalid_shift(data)

        method = interpolation.get('method')
        neighbours = interpolation.get('neighbours')
        if neighbours < 1:
            neighbours = 1

        radius = self.interpolation_radius(np.median(target_lat),
                                           np.median(target_lon))
        resampled = []
        for d in range(0, data.shape[-1]):
            resampled.append(resample(lat,
                                      lon,
                                      np.array(target_lat),
                             np.array(target_lon),
                                      data[:, :, d],
                                      method=method,
                                      neighbours=neighbours,
                                      radius_of_influence=radius,
                                      nprocs=4))
        resampled = np.ma.vstack(resampled)

        return np.array([target_lat, target_lon]), distances, resampled

    def surfacetransect(self, variable, points, timestep, n=100,
                        interpolation={
                            'method': 'inv_square',
                            'neighbours': 8
                        }):
        distances, target_lat, target_lon, b = _path_to_points(points, n)

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

        if interpolation is not None:
            method = interpolation.get('method')
            neighbours = interpolation.get('neighbours')
            if neighbours < 1:
                neighbours = 1

        radius = self.interpolation_radius(np.median(target_lat),
                                           np.median(target_lon))
        resampled = resample(lat,
                             lon,
                             np.array(target_lat),
                             np.array(target_lon),
                             data,
                             method=method,
                             neighbours=neighbours,
                             radius_of_influence=radius,
                             nprocs=4)

        return np.array([target_lat, target_lon]), distances, resampled

    def velocitytransect(self, variablex, variabley,
                         points, timestep, n=100,
                         interpolation={
                             'method': 'inv_square',
                             'neighbours': 8
                         }):

        distances, target_lat, target_lon, b = _path_to_points(points, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 20)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]

        r = np.radians(np.subtract(90, b))
        xmag = variablex[timestep, :, miny:maxy, minx:maxx]
        ymag = variabley[timestep, :, miny:maxy, minx:maxx]

        xmag = np.rollaxis(xmag, 0, 3)
        ymag = np.rollaxis(ymag, 0, 3)

        _fill_invalid_shift(xmag)
        _fill_invalid_shift(ymag)

        method = interpolation.get('method')
        neighbours = interpolation.get('neighbours')
        if neighbours < 1:
            neighbours = 1

        x = []
        y = []
        radius = self.interpolation_radius(np.median(target_lat),
                                           np.median(target_lon))
        for d in range(0, xmag.shape[-1]):
            x.append(resample(lat,
                              lon,
                              np.array(target_lat),
                     np.array(target_lon),
                              xmag[:, :, d],
                              method=method,
                              neighbours=neighbours,
                              radius_of_influence=radius,
                              nprocs=4
                              ))
            y.append(resample(lat,
                              lon,
                              np.array(target_lat),
                     np.array(target_lon),
                              ymag[:, :, d],
                              method=method,
                              neighbours=neighbours,
                              radius_of_influence=radius,
                              nprocs=4
                              ))

        x_resampled = np.ma.vstack(x)
        y_resampled = np.ma.vstack(y)

        theta = np.arctan2(y_resampled, x_resampled) - r
        mag = np.sqrt(x_resampled ** 2 + y_resampled ** 2)

        parallel = mag * np.cos(theta)
        perpendicular = mag * np.sin(theta)

        return np.array([target_lat, target_lon]), \
            distances, parallel, perpendicular

    def hovmoller(self, variable, points, timestep, depth, n=100,
                  interpolation={'method': 'inv_square',
                                 'neighbours': 8
                                 }):
        distances, target_lat, target_lon, b = _path_to_points(points, n)

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]
        if len(variable.shape) == 3:
            data = variable[
                timestep[0]:(timestep[-1] + 1), miny:maxy, minx:maxx]
        elif depth == 'bottom':
            data = []
            for t in timestep:
                fulldata = variable[t, :, miny:maxy, minx:maxx]

                reshaped = fulldata.reshape([fulldata.shape[0], -1])
                edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))

                depths = edges[1, 0, :]
                indices = edges[1, 1, :]

                data_t = np.ma.MaskedArray(np.zeros([fulldata.shape[1],
                                                     fulldata.shape[2]]),
                                           mask=True,
                                           dtype=fulldata.dtype)

                data_t[np.unravel_index(indices, data_t.shape)] = \
                    fulldata.reshape([fulldata.shape[0], -1])[depths, indices]

                data.append(data_t)
            data = np.ma.MaskedArray(data)
        else:
            data = variable[timestep[0]:(timestep[
                -1] + 1), int(depth), miny:maxy, minx:maxx]

        masked_lon = lon.view(np.ma.MaskedArray)
        masked_lat = lat.view(np.ma.MaskedArray)
        masked_lon.mask = masked_lat.mask = data.view(np.ma.MaskedArray).mask

        if interpolation is not None:
            method = interpolation.get('method')
            neighbours = interpolation.get('neighbours')
            if neighbours < 1:
                neighbours = 1

        radius = self.interpolation_radius(np.median(target_lat),
                                           np.median(target_lon))
        resampled = []
        for t in range(0, data.shape[0]):
            resampled.append(resample(lat,
                                      lon,
                                      np.array(target_lat),
                             np.array(target_lon),
                                      data[t, :, :],
                                      method=method,
                                      neighbours=neighbours,
                                      radius_of_influence=radius,
                                      nprocs=4))

        resampled = np.ma.vstack(resampled)

        return np.array([target_lat, target_lon]), distances, resampled

    def path(self, variable, depth, points, times, n=100,
             interpolation={'method': 'inv_square', 'neighbours': 8}):
        # distances, times, target_lat, target_lon, b = \
            # _path_to_points_time(points, times, n)

        target_lat = points[:, 0]
        target_lon = points[:, 1]

        idx_y, idx_x = self.find_index(target_lat, target_lon, 10)

        miny = np.amin(idx_y)
        maxy = np.amax(idx_y)
        minx = np.amin(idx_x)
        maxx = np.amax(idx_x)
        if minx == maxx:
            maxx += 1
        if miny == maxy:
            maxy += 1

        lat = self.latvar[miny:maxy, minx:maxx]
        lon = self.lonvar[miny:maxy, minx:maxx]

        method = interpolation.get('method')
        neighbours = interpolation.get('neighbours')
        if neighbours < 1:
            neighbours = 1

        radius = self.interpolation_radius(np.median(target_lat),
                                           np.median(target_lon))
        ts = [
            t.replace(tzinfo=pytz.UTC)
            for t in
            netcdftime.utime(self.timevar.units).num2date(self.timevar[:])
        ]

        mintime, x = _take_surrounding(ts, times[0])
        x, maxtime = _take_surrounding(ts, times[-1])
        maxtime += 1
        uniquetimes = range(mintime, maxtime + 1)

        combined = []
        for t in range(mintime, maxtime):
            if len(variable.shape) == 3:
                data = variable[t, miny:maxy, minx:maxx]
            else:
                data = variable[t, depth, miny:maxy, minx:maxx]
            _fill_invalid_shift(np.ma.array(data))
            combined.append(resample(lat,
                                     lon,
                                     np.array(target_lat),
                            np.array(target_lon),
                                     data,
                                     method=method,
                                     neighbours=neighbours,
                                     radius_of_influence=radius,
                                     nprocs=4))
        combined = np.ma.array(combined)

        if mintime + 1 >= len(ts):
            result = combined[0]
        else:
            t0 = ts[mintime]
            td = (ts[mintime + 1] - t0).total_seconds()

            deltas = np.ma.masked_array([t.total_seconds() / td
                                        for t in np.subtract(times, t0)])

            model_td = ts[1] - ts[0]

            deltas[
                np.where(np.array(times) > ts[-1] + model_td / 2)
            ] = np.ma.masked
            deltas[
                np.where(np.array(times) < ts[0] - model_td / 2)
            ] = np.ma.masked

            # This is a slight modification on scipy's interp1d
            # https://github.com/scipy/scipy/blob/v0.17.1/scipy/interpolate/interpolate.py#L534-L561
            x = np.array(range(0, len(uniquetimes) - 1))
            new_idx = np.searchsorted(x, deltas)
            new_idx = new_idx.clip(1, len(x) - 1).astype(int)
            low = new_idx - 1
            high = new_idx
            if (high >= len(x)).any():
                result = combined[0]
                # result[:, np.where(deltas.mask)] = np.ma.masked
                result[np.where(deltas.mask)] = np.ma.masked
            else:
                x_low = x[low]
                x_high = x[high]
                y_low = combined[low, range(0, len(times))]
                y_high = combined[high, range(0, len(times))]
                slope = (y_high - y_low) / (x_high - x_low)[None]
                y_new = slope * (deltas - x_low)[None] + y_low
                result = y_new[0]

        return result


def _fill_invalid_shift(z):
    # extend values down 1 depth step
    if z.mask.any():
        z_shifted = np.roll(z, shift=1, axis=-1)
        idx = ~z_shifted.mask * z.mask
        z[idx] = z_shifted[idx]


def resample(in_lat, in_lon, out_lat, out_lon, data, method='inv_square',
             neighbours=8, radius_of_influence=500000, nprocs=4):
    masked_lat = in_lat.view(np.ma.MaskedArray)
    masked_lon = in_lon.view(np.ma.MaskedArray)
    masked_lon.mask = masked_lat.mask = data.view(np.ma.MaskedArray).mask

    input_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
    target_def = SwathDefinition(lons=out_lon, lats=out_lat)

    if method == 'inv_square':
        res = resample_custom(
            input_def,
            data,
            target_def,
            radius_of_influence=radius_of_influence,
            neighbours=neighbours,
            weight_funcs=lambda r: 1 / np.clip(r, 0.0625,
                                               np.finfo(r.dtype).max) ** 2,
            fill_value=None,
            nprocs=nprocs)
    elif method == 'bilinear':
        res = resample_custom(
            input_def,
            data,
            target_def,
            radius_of_influence=radius_of_influence,
            neighbours=4,
            weight_funcs=lambda r: 1 / np.clip(r, 0.0625,
                                               np.finfo(r.dtype).max),
            fill_value=None,
            nprocs=nprocs)
    elif method == 'nn':
        res = resample_nearest(
            input_def,
            data,
            target_def,
            radius_of_influence=radius_of_influence,
            fill_value=None,
            nprocs=nprocs)
    else:
        raise ValueError("Unknown resample method: %s", method)

    if type(res.mask) == bool:
        res.mask = np.tile(res.mask, len(res))
    return res


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


def bathymetry(latvar, lonvar, depthvar, points, n=200):
    distances, lat, lon, b = _path_to_points(points, n)
    lat_to_idx = (latvar.shape[0] - 1) / (latvar[-1] - latvar[0])
    lon_to_idx = (lonvar.shape[0] - 1) / (lonvar[-1] - lonvar[0])

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


def _path_to_points(points, n):
    pairs = zip(points, points[1::])

    d = VincentyDistance()
    dist_between_pts = []
    for pair in pairs:
        dist_between_pts.append(d.measure(pair[0], pair[1]))

    total_distance = np.sum(dist_between_pts)
    distances = []
    target_lat = []
    target_lon = []
    bearings = []
    for idx, pair in enumerate(pairs):
        npts = int(np.ceil(n * (dist_between_pts[idx] /
                                total_distance)))
        if npts < 2:
            npts = 2
        p0 = geopy.Point(pair[0])
        p1 = geopy.Point(pair[1])

        p_dist, p_lat, p_lon, b = points_between(p0, p1, npts)
        if len(distances) > 0:
            distances.extend(np.add(p_dist, distances[-1]))
        else:
            distances.extend(p_dist)
        target_lat.extend(p_lat)
        target_lon.extend(p_lon)
        bearings.extend([b] * len(p_dist))

    return distances, target_lat, target_lon, bearings


def _path_to_points_time(points, intimes, n):
    tuples = zip(points, points[1::], intimes, intimes[1::])

    d = VincentyDistance()
    dist_between_pts = []
    for pair in tuples:
        dist_between_pts.append(d.measure(pair[0], pair[1]))

    total_distance = np.sum(dist_between_pts)
    distances = []
    target_lat = []
    target_lon = []
    bearings = []
    times = []
    for idx, tup in enumerate(tuples):
        npts = int(np.ceil(n * (dist_between_pts[idx] /
                                total_distance)))
        if npts < 2:
            npts = 2
        p0 = geopy.Point(tup[0])
        p1 = geopy.Point(tup[1])

        p_dist, p_lat, p_lon, b = points_between(p0, p1, npts)
        if len(distances) > 0:
            distances.extend(np.add(p_dist, distances[-1]))
        else:
            distances.extend(p_dist)
        target_lat.extend(p_lat)
        target_lon.extend(p_lon)
        bearings.extend([b] * len(p_dist))
        times.extend([tup[2] + i * (tup[3] - tup[2]) / (npts - 1)
                     for i in range(0, npts)])

    return distances, times, target_lat, target_lon, bearings


def _take_surrounding(myList, mynum):
    pos = bisect_left(myList, mynum)
    if pos == 0:
        return 0, 0
    if pos == len(myList):
        return len(myList) - 1, len(myList) - 1
    return pos - 1, pos
