#!/usr/bin/env python

import cftime
import pytz


def time_index_to_datetime(time_indices, time_units):
    t = cftime.utime(time_units)

    return list(map(
        lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
        time_indices
    ))
