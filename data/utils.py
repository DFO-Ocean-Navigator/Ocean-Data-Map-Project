#!/usr/bin/env python

import datetime
import json

import cftime
import pytz


def time_index_to_datetime(time_indices, time_units):
    t = cftime.utime(time_units)

    return list(map(
        lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
        time_indices
    ))


class DateTimeEncoder(json.JSONEncoder):

    def default(self, o):
        if isinstance(o, datetime.datetime):
            return o.isoformat()

        return json.JSONEncoder.default(self, o)
