import fcntl
import os
import pickle as pickle
import time
from pathlib import Path
from typing import List

import cftime
import numpy as np
import pyproj
import xarray as xr
from flask import current_app
from shapely.geometry import Point
from shapely.geometry.polygon import LinearRing

from scripts import generate_class4_list


def list_class4_files():
    """Return the list of Class 4 files.

    For performance reasons, this function reads the list of Class 4 files
    from a cache file containing the predetermined list. If the cache file is
    not accessible, this function falls back to the slow method of generating
    the list on the fly.
    """
    cache_file_name = os.path.join(current_app.config['CACHE_DIR'],
                                   'class4_files.pickle')
    try:
        fp = open(cache_file_name, 'rb')
    except IOError as e:
        msg = f"""Warning: Unable to open cache list of Class 4 files: {str(e)}.
               Falling back to slow method for generating the list of 
               Class 4 files on the fly.
               """
        print(msg)
        return _list_class4_files_slowly()

    # We need to read from the cache file. To ensure another process is not
    # currently *writing* to the cache file, first acquire a shared lock (i.e.,
    # a read lock) on the file. We make at most "max_tries" attempts to acquire
    # the lock.
    num_tries, max_tries = 0, 10
    attempt_lock, lock_acquired = True, False
    attempt_lock = True
    while attempt_lock:
        try:
            fcntl.lockf(fp, fcntl.LOCK_SH | fcntl.LOCK_NB)
        except IOError:
            num_tries += 1
            if num_tries == max_tries:
                lock_acquired = False
                attempt_lock = False
            else:
                time.sleep(1)
        else:
            lock_acquired = True
            attempt_lock = False

    if lock_acquired:
        result = pickle.load(fp)
        fcntl.lockf(fp, fcntl.LOCK_UN)
    else:
        msg = """"Warning: Unable to acquire read lock on Class 4 cache file.
               Falling back to slow method for generating the list of 
               Class 4 files on the fly.
               """
        print(msg)
        result = _list_class4_files_slowly()
    fp.close()

    return result


def _list_class4_files_slowly():
    class4_path = current_app.config['CLASS4_PATH']
    return generate_class4_list.list_class4_files(class4_path)


def list_class4(d):
    # Expecting specific class4 ID format: "class4_YYYMMDD_*.nc"
    dataset_url = current_app.config["CLASS4_FNAME_PATTERN"] % (d[7:11], d)

    with xr.open_dataset(dataset_url) as ds:
        lats = ds['latitude'][:]
        lons = ds['longitude'][:]
        ids = np.char.decode(ds['id'][:].values, 'UTF-8')
        rmse = []

        for i in range(0, lats.shape[0]):
            best = ds['best_estimate'][i, 0, :]
            obsv = ds['observation'][i, 0, :]
            rmse.append(np.ma.sqrt(((best - obsv) ** 2).mean()))

    rmse = np.ma.hstack(rmse)
    maxval = rmse.mean() + 2 * rmse.std()
    rmse_norm = rmse / maxval

    points = []
    for idx, (lat, lon) in enumerate(zip(lats, lons)):
        if np.ma.is_masked(rmse[idx]):
            continue
        points.append({
            'name': f"{ids[idx]}",
            'loc': f"{lat.item():.6f},{lon.item():.6f}",
            'id': f"{d}/{idx}",
            'rmse': float(rmse[idx]),
            'rmse_norm': float(rmse_norm[idx]),
        })
        points = sorted(points, key=lambda k: k['id'])

    return points


def get_view_from_extent(extent):
    extent = list(map(float, extent.split(",")))
    view = LinearRing([
        (extent[1], extent[0]),
        (extent[3], extent[0]),
        (extent[3], extent[2]),
        (extent[1], extent[2])
    ])
    return view


def class4(class4_id, projection, resolution, extent):
    # Expecting specific class4 ID format: "class4_YYYMMDD_*.nc"
    dataset_url = current_app.config["CLASS4_FNAME_PATTERN"] % (
        class4_id[7:11], class4_id)

    proj = pyproj.Proj(init=projection)
    view = get_view_from_extent(extent)

    rmse = []
    lat = []
    lon = []
    point_id = []
    identifiers = []
    with xr.open_dataset(dataset_url) as ds:
        lat_in = ds['latitude'][:]
        lon_in = ds['longitude'][:]
        ids = np.char.decode(ds['id'][:].values, 'UTF-8')
        for i in range(0, lat_in.shape[0]):
            x, y = proj(lon_in[i], lat_in[i])
            p = Point(y, x)
            if view.envelope.intersects(p):
                lat.append(float(lat_in[i]))
                lon.append(float(lon_in[i]))
                identifiers.append(ids[i])
                best = ds['best_estimate'][i, 0, :]
                obsv = ds['observation'][i, 0, :]
                point_id.append(i)
                rmse.append(np.ma.sqrt(((best - obsv) ** 2).mean()))

    rmse = np.ma.hstack(rmse)
    rmse_norm = np.clip(rmse / 1.5, 0, 1)

    loc = list(zip(lon, lat))

    points = []

    for idx, ll in enumerate(loc):
        if np.ma.is_masked(rmse[idx]):
            continue
        points.append({
            'type': "Feature",
            'geometry': {
                'type': "Point",
                'coordinates': ll,
            },
            'properties': {
                'name': f"{identifiers[idx]}",
                'id': f"{class4_id}/{point_id[idx]}",
                'error': float(rmse[idx]),
                'error_norm': float(rmse_norm[idx]),
                'type': 'class4',
                'resolution': 0,
            },
        })

    result = {
        'type': "FeatureCollection",
        'features': points,
    }

    return result


def list_class4_forecasts(class4_id: str) -> List[dict]:
    """Get list of all forecasts for a given class4 id.

    Arguments:

        * `class4_id` -- {str} Class4 ID (e.g. `class4_20190501_GIOPS_CONCEPTS_2.3_profile_343`)

    Returns:

        List of dictionaries with `id` and `name` fields.
    """
    dataset_url = current_app.config["CLASS4_FNAME_PATTERN"] % (
        class4_id[7:11], class4_id.rsplit('_', maxsplit=1)[0])
    with xr.open_dataset(dataset_url, decode_times=False) as ds:
        forecast_date = [
            f"{d:%d %B %Y}" for d in cftime.utime(ds.modeljuld.units).num2date(ds.modeljuld)
        ]

    result = [{
        'id': 'best',
        'name': 'Best Estimate',
    }]

    if len(set(forecast_date)) > 1:
        for idx, date in enumerate(forecast_date):
            if result[-1]['name'] == date:
                continue
            result.append({
                'id': idx,
                'name': date
            })

    return result


def list_class4_models(class4_id: str) -> List[dict]:
    """Get list of all ocean models for a given class4 id.

    Arguments:

        * `class4_id` -- {str} Class4 ID (e.g. `class4_20190501_GIOPS_CONCEPTS_2.3_profile_343`)

    Returns:

        List of dictionaries with `id` and `value` fields.
    """

    yyyymmdd = class4_id[7:15]
    yyyy = yyyymmdd[:4]
    path = Path(current_app.config["CLASS4_PATH"], yyyy, yyyymmdd)

    result = []
    # file pattern globbing != regex
    for f in path.glob("*_profile.nc"):
        model = f.name.split("_")[2]  # e.g get FOAM from class4_20190501_FOAM_orca025_14.1_profile.nc
        if model != "GIOPS":
            result.append({
                'id': f.stem,  # chop off .nc extension
                'value': model
            })

    return result
