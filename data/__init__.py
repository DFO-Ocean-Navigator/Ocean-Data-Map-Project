from data import Data
import nemo
from cachetools import LRUCache

__dataset_cache = LRUCache(maxsize=10, getsizeof=lambda x: 1)


def open_dataset(url):
    if __dataset_cache.get(url) is None:
        __dataset_cache[url] = nemo.Nemo(url)

    return __dataset_cache.get(url)
