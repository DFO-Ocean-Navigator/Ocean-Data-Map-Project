#!/usr/bin/env python

import re
from typing import List

from netCDF4 import Dataset

from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo
from data.sqlite_database import SQLiteDatabase
from data.utils import find_le, roll_time, get_data_vars_from_equation

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
        args['meta_only'] = __meta_only(**kwargs)

        if not args['meta_only']:
            if __is_sqlite_database(url):
                __check_kwargs(**kwargs)
                # Get required NC files from database and add to args
                args['nc_files'] = __get_nc_file_list(url, dataset, **kwargs)
                args['grid_angle_file_url'] = __get_grid_angle_file_url(dataset)

        if __is_mercator(variable_list):
            return Mercator(url, **args)
        elif __is_fvcom(variable_list):
            return Fvcom(url, **args)
        else:
            return Nemo(url, **args)

    raise TypeError("Dataset url is None.")


def __is_datasetconfig_object(obj: object) -> bool:
    return hasattr(obj, "url")


def __is_aggregated_or_raw_netcdf(url: str) -> bool:
    return url.startswith("http") or url.endswith(".nc")


def __is_sqlite_database(url: str) -> bool:
    return url.endswith(".sqlite3")


def __meta_only(**kwargs) -> bool:
    return kwargs.get('meta_only', False)


def __check_kwargs(**kwargs):
    if 'variable' not in kwargs:
        raise RuntimeError(
            "Opening a dataset via sqlite requires the 'variable' keyword argument.")
    if 'timestamp' not in kwargs:
        raise RuntimeError(
            "Opening a dataset via sqlite requires the 'timestamp' keyword argument.")


def __get_nc_file_list(url: str, datasetconfig, **kwargs) -> List[str]:

    with SQLiteDatabase(url) as db:

        variable = kwargs['variable']
        if not isinstance(variable, list):
            variable = [variable]

        calculated_variables = datasetconfig.calculated_variables
        if variable[0] in calculated_variables:
            equation = calculated_variables[variable[0]]['equation']
            
            variable = get_data_vars_from_equation(
                equation, [v.key for v in db.get_data_variables()])

        timestamp = __get_requested_timestamps(
            db, variable[0], kwargs['timestamp'], kwargs.get('endtime'), kwargs.get('nearest_timestamp', False))

        file_list = db.get_netcdf_files(
            timestamp, variable)

        return file_list

def __get_grid_angle_file_url(datasetconfig) -> str:
    return datasetconfig.grid_angle_file_url

def __get_requested_timestamps(db: SQLiteDatabase, variable: str, timestamp, endtime, nearest_timestamp) -> List[int]:

    # We assume timestamp and/or endtime have been converted
    # to the same time units as the requested dataset. Otherwise
    # this won't work.
    if nearest_timestamp:
        all_timestamps = db.get_timestamps(variable)

        start = find_le(all_timestamps, timestamp)
        if not endtime:
            return [start]

        end = find_le(all_timestamps, endtime)
        return db.get_timestamp_range(start, end, variable)

    if timestamp > 0 and endtime is None:
        # We've received a specific timestamp (e.g. 21100345)
        if not isinstance(timestamp, list):
            return [timestamp]
        return timestamp

    if timestamp < 0 and endtime is None:
        all_timestamps = db.get_timestamps(variable)
        return [all_timestamps[timestamp]]

    if timestamp > 0 and endtime > 0:
        # We've received a request for a time range
        # with specific timestamps given
        return db.get_timestamp_range(
            timestamp, endtime, variable)

    # Otherwise assume negative values are indices into timestamp list
    all_timestamps = db.get_timestamps(variable)
    len_timestamps = len(all_timestamps)
    if timestamp < 0 and endtime > 0:
        idx = roll_time(timestamp, len_timestamps)
        return db.get_timestamp_range(all_timestamps[idx], endtime, variable)

    if timestamp > 0 and endtime < 0:
        idx = roll_time(endtime, len_timestamps)
        return db.get_timestamp_range(timestamp, all_timestamps[idx], variable)


def __is_mercator(variable_list: list) -> bool:
    return 'latitude_longitude' in variable_list or 'LatLon_Projection' in variable_list


def __is_fvcom(variable_list: list) -> bool:
    return 'siglay' in variable_list


def __get_variables(url: str) -> List[str]:

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
