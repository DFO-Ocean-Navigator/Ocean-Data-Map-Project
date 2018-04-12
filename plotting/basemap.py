from mpl_toolkits.basemap import Basemap
import pickle
import hashlib
import threading
from cachetools import LRUCache
from oceannavigator import app
import os

_loaded_maps = {}
_maps_cache = LRUCache(maxsize=64)


def load_map(projection, center, height, width):
    CACHE_DIR = app.config['CACHE_DIR']
    filename = _get_filename(projection, center, height, width)

    def get_resulation(h, w):
        area_km=(h*w)/(1000*1000)
        if area_km < 10000:
            res='f'         #full resolution
        elif area_km < 100000:
            res='h'         #high resolution
        elif area_km < 1000000:
            res='i'         #intermediate resolution
        elif area_km < 10000000:
            res='l'         #low resolution
        else:
            res='c'         #crude resolution
        return res

    if _maps_cache.get(filename) is None or True:
        try:
            basemap = pickle.load(open(CACHE_DIR + "/" + filename))
        except:
            if projection in ['npstere', 'spstere']:
                basemap = Basemap(
                    resolution=get_resulation(height, width),
                    area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    boundinglat=center[0]*.95,
                    lon_0=center[1],
                )
            elif projection == 'merc':
                basemap = Basemap(
                    resolution=get_resulation(height, width),
                    area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    llcrnrlat=height[0],
                    llcrnrlon=height[1],
                    urcrnrlat=width[0],
                    urcrnrlon=width[1],
                )
            else:
                basemap = Basemap(
                    resolution=get_resulation(height, width),
                    area_thresh=((height*width)/(1000*1000))*0.00001 , #display islands whose area is 0.001% of displayed area 
                    ellps='WGS84',
                    projection=projection,
                    lat_0=center[0],
                    lon_0=center[1],
                    height=height,
                    width=width
                )
            basemap.filename = filename

            def do_pickle(basemap, filename):
                pickle.dump(basemap, open(filename, 'wb'), -1)

            if not os.path.isdir(CACHE_DIR):
                os.makedirs(CACHE_DIR)

            t = threading.Thread(target=do_pickle, args=(basemap, CACHE_DIR +
                                                         "/" + filename))
            t.daemon = True
            t.start()
        _maps_cache[filename] = basemap
    else:
        basemap = _maps_cache[filename]

    return basemap


def load_nwatlantic():
    return load_map('lcc', (55, -60), 5e6, 3.5e6)


def load_arctic():
    return load_map('npstere', (65, 0), None, None)


def load_pacific():
    return load_map('lcc', (53, -137), 2e6, 2.5e6)


def load_nwpassage():
    return load_map('lcc', (74, -95), 1.5e6, 2.5e6)


def _get_filename(projection, center, height, width):
    hash = hashlib.sha1(";".join(
        str(x) for x in [projection, center, height, width])
    ).hexdigest()
    return hash + ".pickle"
