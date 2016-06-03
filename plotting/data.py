import numpy as np
from grid import Grid, resample
from pyresample.geometry import SwathDefinition
from pyresample.kd_tree import resample_custom
from cachetools import LRUCache
from hashlib import sha1
from threading import Thread
from oceannavigator import app
from netCDF4 import netcdftime
import os

_interpolated_cache = LRUCache(maxsize=1024 * 1024 * 1024, getsizeof=len)
_timeseries_cache = LRUCache(maxsize=1024 * 1024 * 256, getsizeof=len)


def load_interpolated(basemap, gridsize, dataset, variable, depth, time,
                      interpolation={'method': 'inv_square', 'neighbours': 8}):
    CACHE_DIR = app.config['CACHE_DIR']
    hashed = sha1(basemap.filename +
                  dataset.filepath() +
                  str(gridsize) +
                  variable +
                  str(depth) +
                  str(time) +
                  str(interpolation)).hexdigest()

    target_lon, target_lat = basemap.makegrid(gridsize, gridsize)

    if _interpolated_cache.get(hashed) is None:
        path = os.path.join(CACHE_DIR, "interp_" + hashed + ".npy")
        try:
            resampled = np.load(path)
        except:
            grid = Grid(dataset, 'nav_lat', 'nav_lon')

            miny, maxy, minx, maxx = grid.bounding_box(basemap)
            lat = dataset.variables['nav_lat'][miny:maxy, minx:maxx]
            lon = dataset.variables['nav_lon'][miny:maxy, minx:maxx]

            var = dataset.variables[variable]

            if len(var.shape) == 3:
                data = var[time, miny:maxy, minx:maxx]
            else:
                data = var[time, depth, miny:maxy, minx:maxx]

            method = interpolation.get('method')
            neighbours = interpolation.get('neighbours')
            if neighbours < 1:
                neighbours = 1

            resampled = resample(lat, lon, target_lat.astype('float64'),
                                 target_lon.astype('float64'), data,
                                 method=method, neighbours=neighbours)

            def do_save(filename, data):
                data.view(np.ma.MaskedArray).dump(filename)

            t = Thread(target=do_save, args=(path, resampled))
            t.daemon = True
            t.start()

        _interpolated_cache[hashed] = resampled
    else:
        return target_lat, target_lon, _interpolated_cache.get(hashed)

    return target_lat, target_lon, resampled


def load_timeseries(dataset, variable, time, depth, lat, lon):
    CACHE_DIR = app.config['CACHE_DIR']
    hashed = sha1(dataset.filepath() +
                  variable +
                  str(depth) +
                  str(time) +
                  str(lat) +
                  str(lon)).hexdigest()

    timestep = int(np.ceil(len(time) / 100.0))
    if _timeseries_cache.get(hashed) is None:
        path = os.path.join(CACHE_DIR, "ts_" + hashed + ".npy")
        try:
            d = np.load(path)
        except:
            grid = Grid(dataset, 'nav_lat', 'nav_lon')
            y, x = grid.find_index([lat], [lon], 10)

            miny = np.amin(y)
            maxy = np.amax(y)
            minx = np.amin(x)
            maxx = np.amax(x)

            depthall = False
            var = dataset.variables[variable]
            if 'deptht' in var.dimensions:
                if depth == 'all':
                    depthall = True
                    d = var[time[0]:(time[-1] + 1):timestep,
                            :,
                            miny:maxy, minx:maxx]
                    d = np.rollaxis(d, 0, 4)
                    d = np.rollaxis(d, 0, 4)
                else:
                    d = var[time[0]:(time[-1] + 1):timestep,
                            int(depth),
                            miny:maxy, minx:maxx]
                    d = np.rollaxis(d, 0, 3)
            else:
                d = var[time[0]:(time[-1] + 1):timestep, miny:maxy, minx:maxx]
                d = np.rollaxis(d, 0, 3)

            lons = dataset.variables['nav_lon'][miny:maxy, minx:maxx]
            lats = dataset.variables['nav_lat'][miny:maxy, minx:maxx]

            masked_lon = lons.view(np.ma.MaskedArray)
            masked_lat = lats.view(np.ma.MaskedArray)

            if 'deptht' in var.dimensions:
                mask_data = var[time[-1], 0, miny:maxy, minx:maxx]
            else:
                mask_data = var[time[-1], miny:maxy, minx:maxx]

            masked_lon.mask = masked_lat.mask = mask_data.view(
                np.ma.MaskedArray).mask

            orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
            target_def = SwathDefinition(lons=np.array([lon]),
                                         lats=np.array([lat]))

            if depthall:
                origshape = d.shape
                d = d.reshape([d.shape[0], d.shape[1], -1])
            wf = [lambda r: 1 / r ** 2] * d.shape[-1]
            resampled = resample_custom(
                orig_def, d, target_def,
                radius_of_influence=500000,
                neighbours=10,
                weight_funcs=wf,
                # weight_funcs=lambda r: 1 / r ** 2,
                fill_value=None, nprocs=4)

            if depthall:
                resampled = resampled.reshape([origshape[2], origshape[3]])

            d = resampled

            def do_save(filename, data):
                d.dump(filename)

            t = Thread(target=do_save, args=(path, d))
            t.daemon = True
            t.start()

        _timeseries_cache[hashed] = d
    else:
        d = _timeseries_cache[hashed]

    t = netcdftime.utime(dataset.variables["time_counter"].units)
    times = t.num2date(
        dataset.variables["time_counter"][time[0]:(time[-1] + 1):timestep])

    return np.squeeze(d), times
