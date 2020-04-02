#!/usr/bin/env python

import datetime
import itertools
import json
import re
from bisect import bisect_left, bisect_right
from typing import List

import cftime
import numpy as np
import pytz


def find_le(a, x):
    """
    Find right-most value in `a` that is <= x.

    `a` MUST be sorted in ascending order for
    this to perform optimally in O(log(n)).

    If `x` is < all values in `a`, `a[0]` is returned.
    """
    i = bisect_right(a, x)
    if i:
        return a[i-1]
    return a[0]


def find_ge(a, x):
    """
    Find left-most value in `a` that is >= x.

    `a` MUST be sorted in ascending order for
    this to perform optimally in O(log(n)).

    If `x` is > all values in `a`, `a[-1]` is returned.
    """
    i = bisect_left(a, x)
    if i != len(a):
        return a[i]
    return a[-1]


def get_data_vars_from_equation(equation: str, data_variables: List[str]) -> List[str]:
    """Extracts the data variables (i.e. variables that exist in netcdf files, as opposed to
        "calculated variables") from an equation string for a calculated variable.

        We perform a regex to match all variable keys, and then a set-intersection to
        filter out the "calculated" variables.

    Arguments:
        equation {str} -- equation string of a calculated variable.
        data_variables {List[str]} -- list of non-calculated varaible keys in the dataset.

    Returns:
        List[str] -- List of strings containing the variable keys
            present in the dataset's netcdf file.
    """

    regex = re.compile(r'[a-zA-Z][a-zA-Z_0-9]*')

    variables = set(re.findall(regex, equation))
    data_vars = set(data_variables)

    return list(variables & data_vars)


def datetime_to_timestamp(datetime: datetime.datetime, time_units: str):
    """Converts a given datetime object and time units string
    into a netcdf timestamp integer with UTC encoding.

    Arguments:
        datetime {datetime.datetime} -- some datetime object
        time_units {str} -- time units (e.g. 'seconds since 1950-01-01 00:00:00')

    Returns:
        [int] -- timestamp integer
    """

    t = cftime.utime(time_units)

    datetime = datetime.replace(tzinfo=pytz.UTC)
    return t.date2num(datetime)


def time_index_to_datetime(timestamps, time_units: str):

    if isinstance(timestamps, np.ndarray):
        timestamps = timestamps.tolist()

    if not isinstance(timestamps, list):
        timestamps = [timestamps]

    result = [cftime.num2date(timestamp, time_units).replace(tzinfo=pytz.UTC) for timestamp in timestamps]

    if isinstance(result[0], list):
        return list(itertools.chain(*result))

    return result


def roll_time(requested_index: int, len_timestamp_dim: int):
    if abs(requested_index) > len_timestamp_dim:
        return -1

    return requested_index


class DateTimeEncoder(json.JSONEncoder):

    def default(self, o):
        if isinstance(o, datetime.datetime):
            return o.isoformat()

        return json.JSONEncoder.default(self, o)
