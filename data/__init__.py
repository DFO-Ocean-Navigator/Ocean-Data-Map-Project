#!/usr/bin/env python

from netCDF4 import Dataset

import data.fvcom
import data.mercator
import data.nemo
from data.sqlite_database import SQLiteDatabase

# We cannot cache by URL anymore since with the sqlite approach it points to a database
# and the original cache system wasn't aware which individual NC files were opened.

def open_dataset(dataset, **kwargs):
    """
    Opens a dataset.

    Determines the type of model the dataset is from and opens the appropriate
    data object.

    Params:
    dataset -- Either a string URL for the dataset, or a DatasetConfig object
    """

    url = None
    if __is_datasetconfig_object(dataset):
        url = dataset.url
        calculated = dataset.calculated_variables
    else:
        url = dataset
        calculated = {}

    if url is not None:

        variable_list = __get_variables(url)
        if not variable_list:
            raise RuntimeError("Dataset not supported: " + url)

        args = {}
        args['calculated'] = calculated

        if __is_sqlite_database(url):
            __check_kwargs(**kwargs)
            # Get required NC files from database and add to args
            args['nc_files'] = __get_nc_file_list(url, **kwargs)

        if __is_mercator(variable_list):
            return mercator.Mercator(url, **args)
        elif __is_fvcom(variable_list):
            return fvcom.Fvcom(url, **args)
        else:
            return nemo.Nemo(url, **args)

    raise TypeError("Dataset url is None.")


def __is_datasetconfig_object(obj: object):
    return hasattr(obj, "url")


def __is_aggregated_or_raw_netcdf(url: str):
    return url.startswith("http") or url.endswith(".nc")


def __is_sqlite_database(url: str):
    return url.endswith(".sqlite3")


def __check_kwargs(**kwargs):
    if 'variable' not in kwargs:
        raise RuntimeError(
            "Opening a dataset via sqlite requires the 'variable' keyword argument.")
    if 'timestamp' not in kwargs:
        raise RuntimeError(
            "Opening a dataset via sqlite requires the 'timestamp' keyword argument.")


def __get_nc_file_list(url: str, **kwargs):
    with SQLiteDatabase(url) as db:

        variable = kwargs['variable']
        if not isinstance(variable, list):
            variable = list(variable)

        timestamp = kwargs['timestamp']
        if 'endtime' in kwargs:
            timestamp = db.get_timestamp_range(
                timestamp, kwargs['endtime'], variable[0])

        if not isinstance(timestamp, list):
            timestamp = list(timestamp)

        return db.get_netcdf_files(
            timestamp, variable)


def __is_mercator(variable_list: list):
    return 'latitude_longitude' in variable_list or \
        'LatLon_Projection' in variable_list


def __is_fvcom(variable_list: list):
    return 'siglay' in variable_list


def __get_variables(url: str):

    variable_list = []

    if __is_sqlite_database(url):

        with SQLiteDatabase(url) as db:
            variable_list.append(db.get_all_variables())

    elif __is_aggregated_or_raw_netcdf(url):
        # Open dataset (can't use xarray here since it doesn't like FVCOM files)
        ds = Dataset(url, 'r')

        variable_list = [var for var in ds.variables]

        ds.close()

    return variable_list
