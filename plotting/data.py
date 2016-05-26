import numpy as np
from grid import Grid
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


def load_interpolated(basemap, gridsize, dataset, variable, depth, time):
    CACHE_DIR = app.config['CACHE_DIR']
    hashed = sha1(basemap.filename +
                  dataset.filepath() +
                  str(gridsize) +
                  variable +
                  str(depth) +
                  str(time)).hexdigest()

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

            masked_lon = lon.view(np.ma.MaskedArray)
            masked_lat = lat.view(np.ma.MaskedArray)
            masked_lon.mask = masked_lat.mask = data.view(
                np.ma.MaskedArray).mask

            orig_def = SwathDefinition(lons=masked_lon, lats=masked_lat)
            target_def = SwathDefinition(lons=target_lon, lats=target_lat)

            resampled = resample_custom(
                orig_def, data, target_def,
                radius_of_influence=500000,
                neighbours=10,
                weight_funcs=lambda r: 1 / r ** 2,
                fill_value=None, nprocs=4)

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

    if _timeseries_cache.get(hashed) is None:
        path = os.path.join(CACHE_DIR, "ts_" + hashed + ".npy")
        try:
            d = np.load(path)
        except:
            grid = Grid(dataset, 'nav_lat', 'nav_lon')
            y, x = grid.find_index([lat], [lon])
            var = dataset.variables[variable]
            if 'deptht' in var.dimensions:
                if depth == 'all':
                    d = var[time, :, y, x]
                else:
                    d = var[time, int(depth), y[0], x[0]]
            else:
                d = var[time, y[0], x[0]]

            def do_save(filename, data):
                d.dump(filename)

            t = Thread(target=do_save, args=(path, d))
            t.daemon = True
            t.start()

        _timeseries_cache[hashed] = d
    else:
        d = _timeseries_cache[hashed]

    t = netcdftime.utime(dataset.variables["time_counter"].units)
    times = t.num2date(dataset.variables["time_counter"][time])

    return np.squeeze(d), times
