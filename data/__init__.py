from typing import Union

from data.calculated import CalculatedData
from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo
from oceannavigator.dataset_config import DatasetConfig

from utils.decorators import hashable_lru


@hashable_lru
def open_dataset(dataset: Union[DatasetConfig, str], **kwargs):
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
        * variable {str or list} -- String or list of strings of variable keys to be
            loaded (e.g. 'votemper' or ['votemper', 'vosaline']).
        * timestamp {int} -- Integer value of date/time for requested data (e.g.
            2128723200). When loading a range of timestamps, this argument serves as
            the starting time.
        * endtime {int} -- Integer value of date/time. This argument is only used when
            loading a range of timestamps, and should hold the ending time.
        * nearest_timestamp {bool} -- When true, open_dataset will assume the given
            starttime (and endtime) do not exactly correspond to a timestamp integer
            in the dataset, and will perform a binary search to find the nearest
            timestamp that is less-than-or-equal-to the given starttime (and endtime).
    """
    MODEL_CLASSES = {
        "mercator": Mercator,
        "nemo": Nemo,
        "fvcom": Fvcom,
    }

    if not dataset:
        raise ValueError(f"Unknown dataset: {dataset}")

    try:
        url = dataset.url
        calculated_vars = dataset.calculated_variables
    except AttributeError:
        url = dataset
        calculated_vars = {}

    if url is None:
        raise ValueError("Dataset url is None.")

    try:
        model_class = MODEL_CLASSES[getattr(dataset, "model_class", "").lower()]
    except (AttributeError, KeyError):
        raise ValueError(
            "Missing or unrecongized model_class "
            f"attribute in config for dataset {dataset}"
        )

    kwargs.update(
        {
            "calculated": calculated_vars,
            "grid_angle_file_url": getattr(dataset, "grid_angle_file_url", ""),
            "bathymetry_file_url": getattr(dataset, "bathymetry_file_url", ""),
            "dataset_key": getattr(dataset, "key", ""),
        }
    )

    nc_data = CalculatedData(url, **kwargs)
    return model_class(nc_data)
