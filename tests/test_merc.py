import datetime
import unittest
from unittest.mock import patch

import numpy as np
import pytz

from data.mercator import Mercator
from data.netcdf_data import NetCDFData
from data.variable import Variable
from data.variable_list import VariableList


class TestMercator(unittest.TestCase):

    def setUp(self):
        self.variable_list_mock = VariableList([
            Variable('votemper', 'Sea water potential temperature',
                     'Kelvin', sorted(['time', 'depth', 'latitude', 'longitude']))
        ])

    def test_init(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        ds = Mercator(nc_data)
        self.assertIsNone(ds.latvar)
        self.assertIsNone(ds.lonvar)
        self.assertIs(ds.nc_data, nc_data)
        self.assertIs(ds._dataset, nc_data.dataset)
        self.assertIs(ds._meta_only, nc_data.meta_only)
        self.assertEqual(ds.variables, nc_data.variables)
        self.assertEqual(ds.timestamp_to_time_index, nc_data.timestamp_to_time_index)

    def test_open_meta_only(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc', **{"meta_only": True})
        with Mercator(nc_data) as ds:
            self.assertIs(ds._dataset, nc_data.dataset)

    def test_open_not_meta_only(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            self.assertIsNotNone(ds.time_variable)
            self.assertIsNotNone(ds.timestamps)
            self.assertIsNotNone(ds.latvar)
            self.assertIsNotNone(ds.lonvar)

    def test_depths(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            expected = np.array([
                0.494025, 1.54138, 2.64567, 3.81949, 5.07822, 6.44061, 7.92956,
                9.573, 11.405, 13.4671, 15.8101, 18.4956, 21.5988, 25.2114, 29.4447,
                34.4342, 40.3441, 47.3737, 55.7643, 65.8073, 77.8539, 92.3261, 109.729,
                130.666, 155.851, 186.126, 222.475, 266.04, 318.127, 380.213, 453.938,
                541.089, 643.567, 763.333, 902.339, 1062.44, 1245.29, 1452.25, 1684.28,
                1941.89, 2225.08, 2533.34, 2865.7, 3220.82, 3597.03, 3992.48, 4405.22,
                4833.29, 5274.78, 5727.92],
                dtype=np.float32)
            np.testing.assert_array_equal(ds.depths, expected)

    @patch("tests.test_merc.NetCDFData")
    def test_no_depth_variable(self, patch_netcdfdata):
        # This is a hack to trigger the no depth variable edge case
        patch_netcdfdata.depth_dimensions.return_value = []

        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            np.testing.assert_array_equal(ds.depths, np.array([0]))

    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_variables(self, mock_query_func):
        mock_query_func.return_value = self.variable_list_mock

        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            variables = ds.variables

            self.assertEqual(len(variables), 1)
            self.assertTrue('votemper' in variables)
            self.assertEqual(variables['votemper'].name,
                             'Sea water potential temperature')
            self.assertEqual(variables['votemper'].unit, 'Kelvin')
            self.assertEqual(sorted(variables['votemper'].dimensions), sorted(
                ['time', 'depth', 'latitude', 'longitude']))

    def test_timestamp_to_time_index(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            idx = ds.timestamp_to_time_index(2119651200)

            self.assertEqual(idx, 0)

    def test_time_variable(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            time_var = ds.time_variable

            self.assertEqual(time_var.attrs["standard_name"], "time")
            self.assertEqual(time_var.attrs["long_name"], "Validity time")

    ## TODO: Need to write this test.
    def test_get_path(self):
        assert False

    def test_get_point(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            self.assertAlmostEqual(
                ds.get_point(13.0, -149.0, 0, 2119651200, 'votemper'),
                298.426, places=3
            )
            self.assertAlmostEqual(
                ds.get_point(47.0, -47.0, 0, 2119651200, 'votemper'),
                273.66, places=2
            )

            p = ds.get_point([13.0, 47.0], [-149.0, -47.0], 0,
                            2119651200, 'votemper')
            self.assertAlmostEqual(p[0], 298.426, places=3)
            self.assertAlmostEqual(p[1], 273.66, places=2)

    def test_get_raw_point(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            lat, lon, data = ds.get_raw_point(
                13.0, -149.0, 0, 2119651200, 'votemper'
            )

        self.assertEqual(len(lat.ravel()), 156)
        self.assertEqual(len(lon.ravel()), 156)
        self.assertEqual(len(data.values.ravel()), 156)
        self.assertAlmostEqual(data.values[4, 4], 298.8, places=1)

    ## TODO: Need to write this test.
    def test_get_raw_bottom_point(self):
        assert False

    def test_get_profile(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            p, d = ds.get_profile(13.0, -149.0, 2119651200, 'votemper')
            self.assertAlmostEqual(p[0], 298.426, places=3)
            self.assertAlmostEqual(p[10], 298.426, places=3)
            self.assertTrue(np.ma.is_masked(p[49]))

    ## TODO: This test passes now. Has the bug been resolved?
    @unittest.skip("Bottom is bugged atm")
    def test_bottom_point(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            self.assertAlmostEqual(
                ds.get_point(13.01, -149.0, 'bottom', 2119651200, 'votemper'),
                273.95, places=2
            )

    def test_timestamps(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            self.assertEqual(len(ds.timestamps), 1)
            self.assertEqual(ds.timestamps[0],
                             datetime.datetime(2017, 3, 3, 0, 0, 0, 0,
                                               pytz.UTC))

            # Property is read-only
            ## TODO: This assertion fails because Mercator.timestanps is an attr that exposes
            ##       nc_data.timestamps. It can be assigned, but it is immutable (assertion below)
            with self.assertRaises(AttributeError):
                ds.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                ds.timestamps[0] = 0

    def test_get_area(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            a = np.array(
                np.meshgrid(
                    np.linspace(5, 10, 10),
                    np.linspace(-150, -160, 10)
                )
            )

            ## TODO: Need to figure out what expected values should be
            r = ds.get_area(a, 0, 2119651200, 'votemper', "gaussian", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.285, places=3)

            r = ds.get_area(a, 0, 2119651200, 'votemper', "bilinear", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.269, places=3)

            r = ds.get_area(a, 0, 2119651200, 'votemper', "nearest", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.28986, places=5)

            r = ds.get_area(a, 0, 2119651200, 'votemper', "inverse", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.2795, places=4)

    def test_get_path_profile(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            p, d, r, dep = ds.get_path_profile(
                [[13, -149], [14, -140], [15, -130]], 2119651200, 'votemper', 10)

            self.assertEqual(r.shape[0], 50)
            self.assertGreater(r.shape[1], 10)
            self.assertEqual(r.shape[1], p.shape[1])
            self.assertEqual(r.shape[1], len(d))
            self.assertEqual(d[0], 0)

    def test_get_profile_depths(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            p = ds.get_profile_depths(
                13.0,
                -149.0,
                2119651200,
                'votemper',
                [0, 10, 25, 50, 100, 200, 500, 1000]
            )
            self.assertTrue(np.ma.is_masked(p[0]))
            ## TODO: Need to verify these expected values
            self.assertAlmostEqual(p[1], 298.43, places=2)
            self.assertAlmostEqual(p[4], 294.37, places=2)
            self.assertAlmostEqual(p[7], 277.46, places=2)

    ## TODO: Need testdata/mercator_test.nc to have more than 1 time value
    def test_get_timeseries_point(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            r = ds.get_timeseries_point(
                13.0, -149.0, 0, 2119651200, 2122286400, 'votemper')
            self.assertAlmostEqual(r[0], 299.17, places=2)
            self.assertAlmostEqual(r[1], 299.72, places=2)

    ## TODO: Need testdata/mercator_test.nc to have more than 1 time value
    def test_get_timeseries_profile(self):
        nc_data = NetCDFData('tests/testdata/mercator_test.nc')
        with Mercator(nc_data) as ds:
            r, d = ds.get_timeseries_profile(
                13.0, -149.0, 2119651200, 2122286400, 'votemper')
            self.assertAlmostEqual(r[0, 0], 299.17, places=2)
            self.assertAlmostEqual(r[0, 10], 299.15, places=2)
            self.assertAlmostEqual(r[0, 20], 296.466766, places=6)
            self.assertTrue(np.ma.is_masked(r[0, 49]))

            self.assertNotEqual(r[0, 0], r[1, 0])
            self.assertTrue(np.ma.is_masked(r[1, 49]))
