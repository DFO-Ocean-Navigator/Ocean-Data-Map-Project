from data.calculated import CalculatedData
from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo
from utils.decorators import hashable_lru


@hashable_lru
def open_dataset(dataset, **kwargs):
    """Open a dataset.

    Creates a CalculatedData (derived from NetCDFData) instance to handle dataset file
    access and calculation layer operations.
    Then, determines the type of model the dataset is from and returns the appropriate
    Model-derived instance (Nemo, Mercator, Fvcom) with the calculation layer instance
    as an attribute.

    Note: the returned model object will be LRU-cached internally so frequent calls
    to open the "same" dataset will have minimal overhead.

    Params:
        * dataset -- Either a DatasetConfig object, or a string URL for the dataset

    Optional Keyword Arguments:
        * variable {str or list} -- String or list of strings of variable keys to be loaded
            (e.g. 'votemper' or ['votemper', 'vosaline']).
        * timestamp {int} -- Integer value of date/time for requested data (e.g. 2128723200).
            When loading a range of timestamps, this argument serves as the starting time.
        * endtime {int} -- Integer value of date/time. This argument is only used when
            loading a range of timestamps, and should hold the ending time.
        * nearest_timestamp {bool} -- When true, open_dataset will assume the given
            starttime (and endtime) do not exactly correspond to a timestamp integer
            in the dataset, and will perform a binary search to find the nearest timestamp
            that is less-than-or-equal-to the given starttime (and endtime).
        * meta_only {bool} -- Skip some dataset access operations in order to speed up
            response.
    """

    if not dataset:
        raise ValueError("Unknown dataset.")

    try:
        url = dataset.url
        calculated_vars = dataset.calculated_variables
    except AttributeError:
        url = dataset
        calculated_vars = {}

    if url is None:
        raise ValueError("Dataset url is None.")

    args = {
        "calculated": calculated_vars,
        "meta_only": kwargs.get("meta_only", False),
        "grid_angle_file_url": getattr(dataset, "grid_angle_file_url", ""),
        "bathymetry_file_url": getattr(dataset, "bathymetry_file_url", ""),
        "dataset_key": getattr(dataset, "key", ""),
    }

    nc_data = CalculatedData(url, **args)
    if not args["meta_only"]:
        # Get required NC files from database and add to args
        nc_data.get_nc_file_list(dataset, **kwargs)

    dimension_list = nc_data.dimensions
    if not dimension_list:
        raise RuntimeError(f"Dataset not supported: {url}.")

    if 'longitude' in dimension_list or 'latitude' in dimension_list:
        return Mercator(nc_data)
    if 'siglay' in dimension_list:
        return Fvcom(nc_data)
    return Nemo(nc_data)
