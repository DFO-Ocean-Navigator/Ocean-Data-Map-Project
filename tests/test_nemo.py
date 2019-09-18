#!/usr/bin/env python

import datetime
import unittest
from unittest.mock import patch

import numpy as np
import pytz

from data.nemo import Nemo
from data.variable import Variable
from data.variable_list import VariableList


class TestNemo(unittest.TestCase):

    def setUp(self):
        self.variable_list_mock = VariableList([
            Variable('votemper', 'Water temperature at CMC',
                     'Kelvins', sorted(["deptht", "time_counter", "y", "x"]))
        ])

    def test_init(self):
        Nemo(None)

    def test_open(self):
        with Nemo('tests/testdata/nemo_test.nc'):
            pass

    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_variables(self, mock_query_func):
        mock_query_func.return_value = self.variable_list_mock

        with Nemo('tests/testdata/nemo_test.nc') as n:
            variables = n.variables

            self.assertEqual(len(variables), 1)
            self.assertTrue('votemper' in variables)
            self.assertEqual(variables['votemper'].name,
                             'Water temperature at CMC')
            self.assertEqual(variables['votemper'].unit, 'Kelvins')
            self.assertEqual(sorted(variables['votemper'].dimensions), sorted(
                ["deptht", "time_counter", "y", "x"]))

    def test_timestamp_to_time_index(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:

            idx = n.timestamp_to_time_index(2031436800)

            self.assertEqual(idx, 0)

    def test_timestamp_to_time_index(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:

            idx = n.timestamp_to_time_index(2031436800)

            self.assertEqual(idx, 0)

    def test_time_variable(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            time_var = n.time_variable

            self.assertEqual(time_var.attrs["title"], "Time")

    def test_latlon_variables(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            lat, lon = n.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lon.attrs["long_name"], "Longitude")

    def test_get_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 0, 2031436800, 'votemper'),
                299.17, places=2
            )

    def test_get_raw_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            lat, lon, data = n.get_raw_point(
                13.0, -149.0, 0, 2031436800, 'votemper'
            )

        self.assertEqual(len(lat.values.ravel()), 12)
        self.assertEqual(len(lon.values.ravel()), 12)
        self.assertEqual(len(data.values.ravel()), 12)
        self.assertAlmostEqual(data.values[1, 1], 299.3, places=1)

    def test_get_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p, d = n.get_profile(13.0, -149.0, 2031436800, 'votemper')
            self.assertAlmostEqual(p[0], 299.17, places=2)
            self.assertAlmostEqual(p[10], 299.15, places=2)
            self.assertAlmostEqual(p[20], 296.466766, places=6)
            self.assertTrue(np.ma.is_masked(p[49]))

    def test_get_profile_depths(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p = n.get_profile_depths(
                13.0,
                -149.0,
                2031436800,
                'votemper',
                [0, 10, 25, 50, 100, 200, 500, 1000]
            )
            self.assertTrue(np.ma.is_masked(p[0]))
            self.assertAlmostEqual(p[1], 299.15, places=2)
            self.assertAlmostEqual(p[4], 292.48, places=2)
            self.assertAlmostEqual(p[7], 277.90, places=2)

    def test_bottom_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 'bottom', 2031436800, 'votemper'),
                274.13, places=2
            )

    def test_get_area(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            a = np.array(
                np.meshgrid(
                    np.linspace(5, 10, 10),
                    np.linspace(-150, -160, 10)
                )
            )

            r = n.get_area(a, 0, 2031436800, 'votemper', "gaussian", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.285, places=3)

            r = n.get_area(a, 0, 2031436800, 'votemper', "bilinear", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.269, places=3)

            r = n.get_area(a, 0, 2031436800, 'votemper', "nearest", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.28986, places=5)

            r = n.get_area(a, 0, 2031436800, 'votemper', "inverse", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.2795, places=4)

    def test_get_path_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p, d, r, dep = n.get_path_profile(
                [[13, -149], [14, -140], [15, -130]], 2031436800, 'votemper', 10)

            self.assertEqual(r.shape[0], 50)
            self.assertGreater(r.shape[1], 10)
            self.assertEqual(r.shape[1], p.shape[1])
            self.assertEqual(r.shape[1], len(d))
            self.assertEqual(d[0], 0)

    def test_get_timeseries_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            r = n.get_timeseries_point(
                13.0, -149.0, 0, 2031436800, 2034072000, 'votemper')
            self.assertAlmostEqual(r[0], 299.17, places=2)
            self.assertAlmostEqual(r[1], 299.72, places=2)

    def test_get_timeseries_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            r, d = n.get_timeseries_profile(
                13.0, -149.0, 2031436800, 2034072000, 'votemper')
            self.assertAlmostEqual(r[0, 0], 299.17, places=2)
            self.assertAlmostEqual(r[0, 10], 299.15, places=2)
            self.assertAlmostEqual(r[0, 20], 296.466766, places=6)
            self.assertTrue(np.ma.is_masked(r[0, 49]))

            self.assertNotEqual(r[0, 0], r[1, 0])
            self.assertTrue(np.ma.is_masked(r[1, 49]))

    def test_timestamps(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            self.assertEqual(len(n.timestamps), 2)
            self.assertEqual(n.timestamps[0],
                             datetime.datetime(2014, 5, 17, 0, 0, 0, 0,
                                               pytz.UTC))

            # Property is read-only
            with self.assertRaises(AttributeError):
                n.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                n.timestamps[0] = 0
