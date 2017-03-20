from data import Data
import nemo
import fvcom
from cachetools import LRUCache

__dataset_cache = LRUCache(maxsize=10, getsizeof=lambda x: 1)


def open_dataset(url):
    if __dataset_cache.get(url) is None:
        if "sfm5m" in url:
            __dataset_cache[url] = fvcom.Fvcom(url)
        else:
            __dataset_cache[url] = nemo.Nemo(url)

    return __dataset_cache.get(url)
