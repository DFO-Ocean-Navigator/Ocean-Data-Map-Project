import datetime
import unittest
from unittest.mock import patch

import numpy as np
import pytz

from data.mercator import Mercator
from data.variable import Variable
from data.variable_list import VariableList


class TestMercator(unittest.TestCase):

    def setUp(self):
        self.variable_list_mock = VariableList([
            Variable('votemper', 'Sea water potential temperature',
                     'Kelvin', sorted(['time', 'depth', 'latitude', 'longitude']))
        ])

    def test_init(self):
        Mercator(None)

    def test_open(self):
        with Mercator('tests/testdata/mercator_test.nc'):
            pass

    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_variables(self, mock_query_func):
        mock_query_func.return_value = self.variable_list_mock

        with Mercator('tests/testdata/mercator_test.nc') as n:
            variables = n.variables

            self.assertEqual(len(variables), 1)
            self.assertTrue('votemper' in variables)
            self.assertEqual(variables['votemper'].name,
                             'Sea water potential temperature')
            self.assertEqual(variables['votemper'].unit, 'Kelvin')
            self.assertEqual(sorted(variables['votemper'].dimensions), sorted(
                ['time', 'depth', 'latitude', 'longitude']))

    def test_timestamp_to_time_index(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            idx = n.timestamp_to_time_index(2119651200)

            self.assertEqual(idx, 0)

    def test_timestamp_to_time_index(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            idx = n.timestamp_to_time_index(2119651200)

            self.assertEqual(idx, 0)

    def test_time_variable(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            time_var = n.time_variable

            self.assertEqual(time_var.attrs["standard_name"], "time")
            self.assertEqual(time_var.attrs["long_name"], "Validity time")

    def test_latlon_variables(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            lat, lon = n.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lat.attrs["standard_name"], "latitude")

            self.assertEqual(lon.attrs["long_name"], "Longitude")
            self.assertEqual(lon.attrs["standard_name"], "longitude")

    def test_get_point(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 0, 2119651200, 'votemper'),
                298.426, places=3
            )
            self.assertAlmostEqual(
                n.get_point(47.0, -47.0, 0, 2119651200, 'votemper'),
                273.66, places=2
            )

            p = n.get_point([13.0, 47.0], [-149.0, -47.0], 0,
                            2119651200, 'votemper')
            self.assertAlmostEqual(p[0], 298.426, places=3)
            self.assertAlmostEqual(p[1], 273.66, places=2)

    def test_get_raw_point(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            lat, lon, data = n.get_raw_point(
                13.0, -149.0, 0, 2119651200, 'votemper'
            )

        self.assertEqual(len(lat.ravel()), 156)
        self.assertEqual(len(lon.ravel()), 156)
        self.assertEqual(len(data.values.ravel()), 156)
        self.assertAlmostEqual(data.values[4, 4], 298.8, places=1)

    def test_get_profile(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            p, d = n.get_profile(13.0, -149.0, 2119651200, 'votemper')
            self.assertAlmostEqual(p[0], 298.426, places=3)
            self.assertAlmostEqual(p[10], 298.426, places=3)
            self.assertTrue(np.ma.is_masked(p[49]))

    @unittest.skip("Bottom is bugged atm")
    def test_bottom_point(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.01, -149.0, 'bottom', 2119651200, 'votemper'),
                273.95, places=2
            )

    def test_timestamps(self):
        with Mercator('tests/testdata/mercator_test.nc') as n:
            self.assertEqual(len(n.timestamps), 1)
            self.assertEqual(n.timestamps[0],
                             datetime.datetime(2017, 3, 3, 0, 0, 0, 0,
                                               pytz.UTC))

            # Property is read-only
            with self.assertRaises(AttributeError):
                n.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                n.timestamps[0] = 0
