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
    Find left-most value in `a` that is <= x.
    `a` MUST be sorted in ascending order for
    this to perform optimally in O(log(n)).
    If `x` is > all values in `a`, `a[-1]` is returned.
    """
    i = bisect_left(a, x)
    if i != len(a):
        return a[i]
    return a[-1]


def get_data_vars_from_equation(equation: str, data_variables: List[str]) -> List[str]:
    regex = re.compile(r'[a-zA-Z][a-zA-Z_0-9]*')

    variables = set(re.findall(regex, equation))
    data_vars = set(data_variables)

    return list(variables & data_vars)


def datetime_to_timestamp(datetime: datetime.datetime, time_units: str):

    t = cftime.utime(time_units)

    datetime = datetime.replace(tzinfo=pytz.UTC)
    return t.date2num(datetime)


def time_index_to_datetime(timestamps, time_units: str):

    if isinstance(timestamps, np.ndarray):
        timestamps = timestamps.tolist()

    if not isinstance(timestamps, list):
        timestamps = [timestamps]

    t = cftime.utime(time_units)

    result = list(map(
        lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
        timestamps
    ))

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