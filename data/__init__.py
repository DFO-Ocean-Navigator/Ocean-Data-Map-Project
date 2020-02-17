from data.calculated import CalculatedData
from data.mercator import Mercator
from data.nemo import Nemo
from utils.decorators import hashable_lru


@hashable_lru
def open_dataset(dataset, **kwargs):
    """
    Opens a dataset.

    Determines the type of model the dataset is from and opens the appropriate
    data object (Nemo, Mercator, Fvcom).

    Note: the returned dataset object will be LRU-cached internally so frequent calls
    to open the "same" dataset will have minimal overhead.

    Params:
        * dataset -- Either a string URL for the dataset, or a DatasetConfig object

    TODO: Not accurate - fix; see routes/api_v1_0.py:118 open_dataset(config, meta_only=True)
    Required Keyword Arguments:
        * variable {str or list} -- String or list of strings of variable keys to be loaded
            (e.g. 'votemper' or ['votemper', 'vosaline']).
        * timestamp {int} -- Integer value of date/time for requested data (e.g. 2128723200).
            When loading a range of timestamps, this argument serves as the starting time.

    Optional Keywork Arguments:
        * endtime {int} -- Integer value of date/time. This argument is only used when
            loading a range of timestamps, and should hold the ending time.
        * nearest_timestamp {bool} -- When true, open_dataset will assume the given
            starttime (and endtime) do not exactly correspond to a timestamp integer
            in the dataset, and will perform a binary search to find the nearest timestamp
            that is less-than-or-equal-to the given starttime (and endtime).
        * meta_only {bool} --
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
    }
    try:
        args["dataset_key"] = dataset.key
    except AttributeError:
        pass

    ## TODO: Eventually we need to decide whether to create NetCDFData or future CSVData, GribData, S100Data
    nc_data = CalculatedData(url, **args)
    if not args["meta_only"]:
        # Get required NC files from database and add to args
        nc_data.get_nc_file_list(dataset, **kwargs)

    dimension_list = nc_data.dimensions
    if not dimension_list:
        raise RuntimeError("Dataset not supported: %s." % url)

    if 'longitude' in dimension_list or 'latitude' in dimension_list:
        return Mercator(nc_data)
    return Nemo(nc_data)
