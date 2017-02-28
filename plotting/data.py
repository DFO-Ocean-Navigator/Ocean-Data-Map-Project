import numpy as np
# from grid import Grid, resample
import grid as g
from pyresample.geometry import SwathDefinition
from pyresample.kd_tree import resample_custom
from cachetools import LRUCache
from hashlib import sha1
from threading import Thread
from oceannavigator import app
from netCDF4 import netcdftime
import os
import utils

_interpolated_cache = LRUCache(maxsize=1024 * 1024 * 1024, getsizeof=len)
_timeseries_cache = LRUCache(maxsize=1024 * 1024 * 256, getsizeof=len)


def load_interpolated(basemap, gridsize, dataset, variable, depth, time,
                      interpolation):
    CACHE_DIR = app.config['CACHE_DIR']

    if basemap.aspect < 1:
        gridx = gridsize
        gridy = int(gridsize * basemap.aspect)
    else:
        gridy = gridsize
        gridx = int(gridsize / basemap.aspect)

    target_lon, target_lat = basemap.makegrid(gridx, gridy)

    lat_hash = str(target_lat[0, 0]) + str(
        target_lat[-1, -1]) + str(np.median(target_lat.ravel()))
    lon_hash = str(target_lon[0, 0]) + str(
        target_lon[-1, -1]) + str(np.median(target_lon.ravel()))

    hashed = sha1(dataset.filepath() +
                  lat_hash +
                  lon_hash +
                  variable +
                  str(depth) +
                  str(time) +
                  str(interpolation)).hexdigest()

    if _interpolated_cache.get(hashed) is None:
        path = os.path.join(CACHE_DIR, "interp_" + hashed + ".npy")
        try:
            resampled = np.load(path)
        except:
            resampled = load_interpolated_grid(
                target_lat,
                target_lon,
                dataset,
                variable,
                depth,
                time,
                interpolation)

            def do_save(filename, data):
                data.view(np.ma.MaskedArray).dump(filename)

            if not os.path.isdir(CACHE_DIR):
                os.makedirs(CACHE_DIR)

            t = Thread(target=do_save, args=(path, resampled))
            t.daemon = True
            t.start()

        _interpolated_cache[hashed] = resampled
    else:
        resampled = _interpolated_cache.get(hashed)

    return target_lat, target_lon, resampled


def load_interpolated_grid(lat, lon, dataset, variable, depth, time,
                           interpolation):
    lat_hash = str(lat[0, 0]) + str(lat[-1, -1]) + str(np.median(lat.ravel()))
    lon_hash = str(lon[0, 0]) + str(lon[-1, -1]) + str(np.median(lon.ravel()))
    hashed = sha1(dataset.filepath() +
                  lat_hash +
                  lon_hash +
                  variable +
                  str(depth) +
                  str(time) +
                  str(interpolation)).hexdigest()

    if _interpolated_cache.get(hashed) is None or True:
        latvar, lonvar = utils.get_latlon_vars(dataset)
        # if 'nav_lat' in dataset.variables:
        #     latvarname = 'nav_lat'
        #     lonvarname = 'nav_lon'
        # elif 'latitude' in dataset.variables:
        #     latvarname = 'latitude'
        #     lonvarname = 'longitude'

        grid = g.Grid(dataset, latvar.name, lonvar.name)

        miny, maxy, minx, maxx = grid.bounding_box(lat, lon)
        lat_in = latvar[miny:maxy, minx:maxx]
        lon_in = lonvar[miny:maxy, minx:maxx]

        var = dataset.variables[variable]

        data = get_data_depth(
            var, time, time + 1, depth, miny, maxy, minx, maxx)

        method = interpolation.get('method')
        neighbours = interpolation.get('neighbours')
        if neighbours < 1:
            neighbours = 1

        radius = grid.interpolation_radius(
            [
                lat[0, 0],
                lat[-1, -1],
            ],
            [
                lon[0, 0],
                lon[-1, -1],
            ]
        )

        resampled = g.resample(lat_in, lon_in, lat.astype('float64'),
                               lon.astype('float64'), data,
                               method=method, neighbours=neighbours,
                               radius_of_influence=radius)

        _interpolated_cache[hashed] = resampled
    else:
        resampled = _interpolated_cache.get(hashed)

    return resampled


def load_timeseries(dataset, variable, time, depth, lat, lon):
    CACHE_DIR = app.config['CACHE_DIR']
    hashed = sha1(dataset.filepath() +
                  variable +
                  str(depth) +
                  str(time) +
                  str(lat) +
                  str(lon)).hexdigest()

    if _timeseries_cache.get(hashed) is None:
        path = os.path.join(CACHE_DIR, "ts_" + hashed + ".npy")
        try:
            d = np.load(path)
        except:
            latvar, lonvar = utils.get_latlon_vars(dataset)

            grid = g.Grid(dataset, latvar.name, lonvar.name)
            y, x = grid.find_index([lat], [lon], 10)

            miny = np.amin(y)
            maxy = np.amax(y)
            minx = np.amin(x)
            maxx = np.amax(x)

            var = dataset.variables[variable]

            if depth == 'bottom':
                bdata = var[time[0], :, miny:maxy, minx:maxx]
                blats = dataset.variables[latvar.name][miny:maxy, minx:maxx]
                blons = dataset.variables[lonvar.name][miny:maxy, minx:maxx]

                reshaped = bdata.reshape([bdata.shape[0], -1])
                edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))

                depths = edges[1, 0, :]
                indices = edges[1, 1, :]

                from geopy.distance import VincentyDistance
                distance = VincentyDistance()

                weighted = 0
                totalweight = 0
                for i, index in enumerate(indices):
                    dist = distance.measure((lat, lon),
                                            (blats.ravel()[index],
                                             blons.ravel()[index]))
                    weight = 1 / (dist ** 2)
                    totalweight += weight
                    weighted = depths[i] * weight
                weighted /= totalweight

                depth = int(np.round(weighted))

            depthall = False
            if 'deptht' in var.dimensions or 'depth' in var.dimensions:
                if depth == 'all':
                    depthall = True
                    d = var[time[0]:(time[-1] + 1),
                            :,
                            miny:maxy, minx:maxx]
                    d = np.rollaxis(d, 0, 4)
                    d = np.rollaxis(d, 0, 4)
                else:
                    d = var[time[0]:(time[-1] + 1),
                            int(depth),
                            miny:maxy, minx:maxx]
                    d = np.rollaxis(d, 0, 3)
            else:
                d = var[time[0]:(time[-1] + 1), miny:maxy, minx:maxx]
                d = np.rollaxis(d, 0, 3)

            lons = dataset.variables[lonvar.name][miny:maxy, minx:maxx]
            lats = dataset.variables[latvar.name][miny:maxy, minx:maxx]

            masked_lon = lons.view(np.ma.MaskedArray)
            masked_lat = lats.view(np.ma.MaskedArray)

            if 'deptht' in var.dimensions or 'depth' in var.dimensions:
                mask_data = var[time[-1], 0, miny:maxy, minx:maxx]
            else:
                mask_data = var[time[-1], miny:maxy, minx:maxx]

            masked_lon.mask = masked_lat.mask = mask_data.view(
                np.ma.MaskedArray).mask

            orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
            target_def = SwathDefinition(lons=np.array([lon]),
                                         lats=np.array([lat]))

            radius = grid.interpolation_radius(lat, lon)
            if depthall:
                origshape = d.shape
                d = d.reshape([d.shape[0], d.shape[1], -1])

            wf = [lambda r: 1 / r ** 2] * d.shape[-1]
            resampled = resample_custom(
                orig_def, d, target_def,
                radius_of_influence=radius,
                neighbours=10,
                weight_funcs=wf,
                fill_value=None, nprocs=4)

            if depthall:
                resampled = resampled.reshape([origshape[2], origshape[3]])

            d = resampled

            def do_save(filename, data):
                d.dump(filename)

            if not os.path.isdir(CACHE_DIR):
                os.makedirs(CACHE_DIR)

            t = Thread(target=do_save, args=(path, d))
            t.daemon = True
            t.start()

        _timeseries_cache[hashed] = d
    else:
        d = _timeseries_cache[hashed]

    time_var = utils.get_time_var(dataset)

    t = netcdftime.utime(time_var.units)
    times = t.num2date(time_var[time[0]:(time[-1] + 1)])

    return np.squeeze(d), times


def get_data_depth(variable, mintime, maxtime, depth, miny, maxy, minx, maxx):
    if len(variable.shape) == 3:
        return variable[mintime:maxtime, miny:maxy, minx:maxx]
    elif depth == 'bottom':
        data = []
        for t in range(mintime, maxtime):
            fulldata = variable[t, :, miny:maxy, minx:maxx]
            reshaped = fulldata.reshape([fulldata.shape[0], -1])
            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))

            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            d = np.ma.MaskedArray(np.zeros([fulldata.shape[1],
                                            fulldata.shape[2]]),
                                  mask=True,
                                  dtype=fulldata.dtype)

            d[np.unravel_index(indices, d.shape)] = fulldata.reshape(
                [fulldata.shape[0], -1])[depths, indices]
            data.append(d)
        return np.ma.MaskedArray(data)
    else:
        return variable[mintime:maxtime, depth, miny:maxy, minx:maxx]
