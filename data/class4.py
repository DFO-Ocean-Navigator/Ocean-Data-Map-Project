#!/usr/bin/env python

import datetime
import fcntl
import os
import pickle as pickle
import time

import cftime
import numpy as np
import pyproj
from flask import current_app
from netCDF4 import Dataset, chartostring
from shapely.geometry import Point
from shapely.geometry.polygon import LinearRing
from thredds_crawler.crawl import Crawl


def __list_class4_files_slowly():
    # This function has poor performance; only use as a fallback.
    c = Crawl(current_app.config["CLASS4_CATALOG_URL"], select=[".*_GIOPS_.*.nc$"],
              workers=16)

    result = []
    for dataset in c.datasets:
        value = dataset.name[:-3]
        date = datetime.datetime.strptime(value.split("_")[1], "%Y%m%d")
        result.append({
            'name': date.strftime("%Y-%m-%d"),
            'id': value
        })

    return result


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
        msg = ('Warning: Unable to open cache list of Class 4 files: %s\n'
               'Falling back to slow method for generating the list of '
               'Class 4 files on the fly')
        msg = msg % (str(e),)
        print(msg)
        return __list_class4_files_slowly()

    # We need to read from the cache file. To ensure another process is not
    # currently *writing* to the cache file, first acquire a shared lock (i.e.,
    # a read lock) on the file. We make at most "max_tries" attempts to acquire
    # the lock.
    max_tries = 10
    num_tries = 0
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
        msg = ('Warning: Unable to acquire read lock on cache file\n'
               'Falling back to slow method for generating list of Class 4 '
               'files on the fly')
        print(msg)
        result = __list_class4_files_slowly()
    fp.close()

    return result


def list_class4(d):
    dataset_url = current_app.config["CLASS4_URL"] % d

    with Dataset(dataset_url, 'r') as ds:
        lat = ds['latitude'][:]
        lon = ds['longitude'][:]
        ids = list(map(str.strip, chartostring(ds['id'][:])))
        rmse = []

        for i in range(0, lat.shape[0]):
            best = ds['best_estimate'][i, 0, :]
            obsv = ds['observation'][i, 0, :]
            rmse.append(np.ma.sqrt(((best - obsv) ** 2).mean()))

    rmse = np.ma.hstack(rmse)
    maxval = rmse.mean() + 2 * rmse.std()
    rmse_norm = rmse / maxval

    loc = list(zip(lat, lon))

    points = []
    for idx, ll in enumerate(loc):
        if np.ma.is_masked(rmse[idx]):
            continue
        points.append({
            'name': "%s" % ids[idx],
            'loc': "%f,%f" % ll,
            'id': "%s/%d" % (d, idx),
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
    dataset_url = current_app.config["CLASS4_URL"] % class4_id

    proj = pyproj.Proj(init=projection)
    view = get_view_from_extent(extent)

    rmse = []
    lat = []
    lon = []
    point_id = []
    identifiers = []
    with Dataset(dataset_url, 'r') as ds:
        lat_in = ds['latitude'][:]
        lon_in = ds['longitude'][:]
        ids = list(map(str.strip, chartostring(ds['id'][:])))

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
                'name': "%s" % identifiers[idx],
                'id': "%s/%d" % (class4_id, point_id[idx]),
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


def list_class4_forecasts(class4_id):
    dataset_url = current_app.config["CLASS4_URL"] % class4_id
    with Dataset(dataset_url, 'r') as ds:
        var = ds['modeljuld']
        forecast_date = [d.strftime("%d %B %Y") for d in
                         cftime.utime(var.units).num2date(var[:])]

    res = [{
        'id': 'best',
        'name': 'Best Estimate',
    }]

    if len(set(forecast_date)) > 1:
        for idx, date in enumerate(forecast_date):
            if res[-1]['name'] == date:
                continue
            res.append({
                'id': idx,
                'name': date
            })

    return res


def list_class4_models(class4_id):
    select = ["(.*/)?%s.*_profile.nc$" % class4_id[:16]]
    c = Crawl(current_app.config["CLASS4_CATALOG_URL"], select=select)

    result = []
    for dataset in c.datasets:
        value = dataset.name[:-3]
        model = value.split("_")[2]
        if model != "GIOPS":
            result.append({
                'value': value.split("_")[2],
                'id': value
            })

    return result
