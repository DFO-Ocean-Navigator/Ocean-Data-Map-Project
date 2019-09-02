#!/usr/bin/env python

import datetime
import unittest

import pytz
import numpy as np

from data.utils import roll_time, time_index_to_datetime


class TestDataUtils(unittest.TestCase):

    def test_roll_time(self):
        self.assertEqual(roll_time(2, 2), 2)
        self.assertEqual(roll_time(4, 2), -1)
        self.assertEqual(roll_time(-1, 2), -1)
        self.assertEqual(roll_time(-5, 2), -1)

    def test_time_index_to_datetime(self):
        raw_timestamps = sorted(np.array([2144966400,
                                 2145052800,
                                 2145139200,
                                 2145225600,
                                 2145312000,
                                 2145398400,
                                 2145484800]))

        time_units = 'seconds since 1950-01-01 00:00:00'

        res = time_index_to_datetime(raw_timestamps, time_units)
        self.assertEqual(len(res), 7)
        self.assertEqual(res[0], datetime.datetime(
            2017, 12, 21, 0, 0, tzinfo=pytz.UTC))

        raw_timestamp_not_list = 2144966400
        res_2 = time_index_to_datetime(raw_timestamp_not_list, time_units)

        self.assertEqual(res_2[0], datetime.datetime(
            2017, 12, 21, 0, 0, tzinfo=pytz.UTC))
