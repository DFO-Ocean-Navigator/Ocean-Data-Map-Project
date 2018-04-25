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
                
                # Open dataset (can't use xarray here since it doesn't like FVCOM files)
                dataset = Dataset(url, 'r')
                # Get variable names from dataset
                variable_list = [var for var in dataset.variables]

                # Figure out which wrapper we need and cache it by URL
                if 'latitude_longitude' in variable_list or \
                        'LatLon_Projection' in variable_list:

                    __dataset_cache[url] = mercator.Mercator(url)
                elif 'siglay' in variable_list:
                    
                    __dataset_cache[url] = fvcom.Fvcom(url)
                elif 'polar_stereographic' in variable_list:
                    
                    __dataset_cache[url] = nemo.Nemo(url)
                else:
                    
                    __dataset_cache[url] = nemo.Nemo(url)

                # Clean up
                dataset.close()

    return __dataset_cache.get(url)
