from mpl_toolkits.basemap import Basemap
import pickle
import hashlib
import threading
from cachetools import LRUCache
from flask import current_app
import os
import math
from utils import return_type

_maps_cache = LRUCache(maxsize=64)

def _convert_to_bounded_lon(lon: float) -> float:

    return math.fmod(lon, 360.0)

def load_map(projection: str, center: tuple, height: float, width: float, min_lat: float=0) -> Basemap:

    CACHE_DIR = current_app.config['CACHE_DIR']
    filename = _get_filename(projection, center, height, width)

    def get_resolution(h: float, w: float) -> str:
        area_km=(h*w)/(1000*1000)
        
        if area_km < 10000:
            return 'f'         # full resolution
        elif area_km < 100000:
            return 'h'         # high resolution
        elif area_km < 1000000:
            return 'i'         # intermediate resolution
        elif area_km < 10000000:
            return 'l'         # low resolution
        else:
            return 'c'         # crude resolution

    if _maps_cache.get(filename) is None or True:
        filename = "".join([CACHE_DIR, "/", filename])

        try:
            basemap = pickle.load(open(filename))
        except:
            if projection in ['npstere', 'spstere']:
                basemap = Basemap(
                    resolution=get_resolution(height, width),
                    area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    boundinglat=min_lat,
                    lon_0=center[1],
                )
            elif projection == 'merc':
                basemap = Basemap(
                    resolution='c',
                    #area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    llcrnrlat=height[0],
                    llcrnrlon=width[0],
                    urcrnrlat=height[1],
                    urcrnrlon=width[1]
                )
            else:
                basemap = Basemap(
                    resolution=get_resolution(height, width),
                    area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    lat_0=center[0],
                    lon_0=_convert_to_bounded_lon(center[1]),
                    height=height,
                    width=width
                )
            basemap.filename = filename

            def do_pickle(basemap: Basemap, filename: str) -> None:
                pickle.dump(basemap, open(filename, 'wb'), -1)

            if not os.path.isdir(CACHE_DIR):
                os.makedirs(CACHE_DIR)

            t = threading.Thread(target=do_pickle, args=(basemap, filename))
            t.daemon = True
            t.start()

        _maps_cache[filename] = basemap
    else:
        basemap = _maps_cache[filename]

    return basemap


def load_nwatlantic() -> return_type(load_map):
    return load_map('lcc', (55, -60), 5e6, 3.5e6)


def load_arctic() -> return_type(load_map):
    return load_map('npstere', (65, 0), None, None)


def load_pacific() -> return_type(load_map):
    return load_map('lcc', (53, -137), 2e6, 2.5e6)


def load_nwpassage() -> return_type(load_map):
    return load_map('lcc', (74, -95), 1.5e6, 2.5e6)


def _get_filename(projection: str, center: tuple, height: float, width: float) -> str:
    hash = hashlib.sha1(";".join(
        str(x) for x in [projection, center, height, width]).encode()
    ).hexdigest()
    return hash + ".pickle"
