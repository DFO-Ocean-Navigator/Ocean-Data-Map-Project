#from data import Data
from netCDF4 import Dataset
import data.nemo
import data.fvcom
import data.mercator
from cachetools import LRUCache

__dataset_cache = LRUCache(maxsize=10, getsizeof=lambda x: 1)


def open_dataset(url):
    if url is not None:
        if __dataset_cache.get(url) is None:
            if url.startswith("http") or url.endswith(".nc"):
                with Dataset(url, 'r') as ds:
                    if 'latitude_longitude' in ds.variables or \
                            'LatLon_Projection' in ds.variables:
                        __dataset_cache[url] = mercator.Mercator(url)
                    elif 'siglay' in ds.variables:
                        __dataset_cache[url] = fvcom.Fvcom(url)
                    elif 'polar_stereographic' in ds.variables:
                        __dataset_cache[url] = nemo.Nemo(url)
                    else:
                        __dataset_cache[url] = nemo.Nemo(url)

    return __dataset_cache.get(url)
