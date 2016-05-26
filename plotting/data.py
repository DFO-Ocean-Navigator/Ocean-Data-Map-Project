import numpy as np
from grid import Grid
from pyresample.geometry import SwathDefinition
from pyresample.kd_tree import resample_custom
from cachetools import LRUCache
from hashlib import sha1
from threading import Thread
from oceannavigator import app

_data_cache = LRUCache(maxsize=1024 * 1024 * 1024, getsizeof=len)


def load_interpolated(basemap, gridsize, dataset, variable, depth, time):
    CACHE_DIR = app.config['CACHE_DIR']
    hashed = sha1(basemap.filename +
                  dataset.filepath() +
                  str(gridsize) +
                  variable +
                  str(depth) +
                  str(time)).hexdigest()

    target_lon, target_lat = basemap.makegrid(gridsize, gridsize)

    if _data_cache.get(hashed) is None:
        try:
            resampled = np.load(CACHE_DIR + "/" + hashed + ".npy")
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

            t = Thread(target=do_save, args=(
                CACHE_DIR + "/" + hashed + ".npy", resampled))
            t.daemon = True
            t.start()

        _data_cache[hashed] = resampled
    else:
        return target_lat, target_lon, _data_cache.get(hashed)

    return target_lat, target_lon, resampled
