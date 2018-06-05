from netCDF4 import Dataset
import pyresample
from pyresample.utils import wrap_longitudes
import numpy as np
from scipy.ndimage.filters import gaussian_filter
import hashlib
from cachetools import LRUCache
import threading
from oceannavigator import app
import os

_bathymetry_cache = LRUCache(maxsize=256 * 1024 * 1024, getsizeof=len)


def bathymetry(basemap, target_lat, target_lon, blur=None):
    CACHE_DIR = app.config['CACHE_DIR']
    BATHYMETRY_FILE = app.config['BATHYMETRY_FILE']

    if basemap is None:
        fname = str(np.median(target_lat)) + "," + str(np.median(target_lon))
    else:
        fname = basemap.filename

    hashed = hashlib.sha1("".join(fname +
                          str(target_lat.shape) +
                          str(target_lon.shape)
                          ).encode()).hexdigest()
    if _bathymetry_cache.get(hashed) is None:
        try:
            data = np.load(CACHE_DIR + "/" + hashed + ".npy")
        except:
            with Dataset(BATHYMETRY_FILE, 'r') as ds:
                lat = ds.variables['y']
                lon = ds.variables['x']
                z = ds.variables['z']

                def lat_index(v):
                    return int(round((v - lat[0]) * 60.0))

                def lon_index(v):
                    return int(round((v - lon[0]) * 60.0))

                lon_idx_min = target_lon.argmin()
                lon_idx_max = target_lon.argmax()

                target_lon = wrap_longitudes(target_lon)

                minlat = lat_index(np.amin(target_lat))
                maxlat = lat_index(np.amax(target_lat))

                minlon = lon_index(target_lon.ravel()[lon_idx_min])
                maxlon = lon_index(target_lon.ravel()[lon_idx_max])

                if minlon > maxlon:
                    in_lon = np.concatenate((lon[minlon:], lon[0:maxlon]))
                    in_data = np.concatenate((z[minlat:maxlat, minlon:],
                                              z[minlat:maxlat, 0:maxlon]), 1)
                else:
                    in_lon = lon[minlon:maxlon]
                    in_data = z[minlat:maxlat, minlon:maxlon]

                res = in_data.transpose() * -1

                lats, lons = np.meshgrid(lat[minlat:maxlat], in_lon)

            orig_def = pyresample.geometry.SwathDefinition(
                lons=lons, lats=lats)
            target_def = pyresample.geometry.SwathDefinition(
                lons=target_lon.astype(np.float64),
                lats=target_lat.astype(np.float64))

            data = pyresample.kd_tree.resample_nearest(
                orig_def, res,
                target_def,
                radius_of_influence=500000,
                fill_value=None,
                nprocs=4)

            def do_save(filename, data):
                np.save(filename, data.filled())

            if not os.path.isdir(CACHE_DIR):
                os.makedirs(CACHE_DIR)

            t = threading.Thread(
                target=do_save, args=(CACHE_DIR + "/" + hashed, data))
            t.daemon = True
            t.start()

        _bathymetry_cache[hashed] = data
    else:
        data = _bathymetry_cache[hashed]

    if blur is not None:
        try:
            return gaussian_filter(data, sigma=float(blur))
        except:
            return data
    else:
        return data
