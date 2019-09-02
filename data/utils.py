#!/usr/bin/env python

import datetime
import itertools
import json

import cftime
import numpy as np
import pytz


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
