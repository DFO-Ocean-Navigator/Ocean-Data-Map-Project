from mpl_toolkits.basemap import Basemap
import pickle
import hashlib
import threading
from cachetools import LRUCache
from oceannavigator import app

_loaded_maps = {}
_maps_cache = LRUCache(maxsize=64)


def load_map(projection, center, height, width):
    CACHE_DIR = app.config['CACHE_DIR']
    filename = _get_filename(projection, center, height, width)

    if _maps_cache.get(filename) is None:
        try:
            basemap = pickle.load(open(CACHE_DIR + "/" + filename))
        except:
            if projection == 'npstere':
                basemap = Basemap(
                    resolution='i',
                    rsphere=(6378137.00, 6356752.3142),
                    projection=projection,
                    boundinglat=center[0],
                    lon_0=center[1])
            else:
                basemap = Basemap(
                    resolution='i',
                    rsphere=(6378137.00, 6356752.3142),
                    projection=projection,
                    lat_0=center[0],
                    lon_0=center[1],
                    height=height,
                    width=width)
            basemap.filename = filename

            def do_pickle(basemap, filename):
                pickle.dump(basemap, open(filename, 'wb'), -1)

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


def _get_filename(projection, center, height, width):
    hash = hashlib.sha1(";".join(
        str(x) for x in [projection, center, height, width])
    ).hexdigest()
    return hash + ".pickle"
