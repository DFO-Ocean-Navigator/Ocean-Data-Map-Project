from netCDF4 import Dataset
import data.nemo
import data.fvcom
import data.mercator
from cachetools import LRUCache

__dataset_cache = LRUCache(maxsize=10, getsizeof=lambda x: 1)

def open_dataset(dataset):
    """Opens a dataset.

    Determines the type of model the dataset is from and opens the appropriate
    data object.

    Params:
    dataset -- Either a string URL for the dataset, or a DatasetConfig object
    """
    if hasattr(dataset, "url"):
        url = dataset.url
        calculated = dataset.calculated_variables
    else:
        url = dataset
        calculated = {}

    if url is not None:
        if __dataset_cache.get(url) is None:
            if url.startswith("http") or url.endswith(".nc"):
                
                # Open dataset (can't use xarray here since it doesn't like FVCOM files)
                ds = Dataset(url, 'r')
                # Get variable names from dataset
                variable_list = [var for var in ds.variables]

                # Figure out which wrapper we need and cache it by URL
                if 'latitude_longitude' in variable_list or \
                        'LatLon_Projection' in variable_list:

                    __dataset_cache[url] = mercator.Mercator(url,
                            calculated=calculated)
                elif 'siglay' in variable_list:
                    
                    __dataset_cache[url] = fvcom.Fvcom(url,
                            calculated=calculated)
                elif 'polar_stereographic' in variable_list:
                    
                    __dataset_cache[url] = nemo.Nemo(url,
                            calculated=calculated)
                else:
                    
                    __dataset_cache[url] = nemo.Nemo(url,
                            calculated=calculated)

                # Clean up
                ds.close()

    return __dataset_cache.get(url)
