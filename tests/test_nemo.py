import unittest
from unittest.mock import patch

import numpy as np
from fastapi.exceptions import HTTPException
from pytest import raises

from data.nemo import Nemo
from data.netcdf_data import NetCDFData
from data.variable import Variable
from data.variable_list import VariableList


class TestNemo(unittest.TestCase):
    def setUp(self):
        self.variable_list_mock = VariableList(
            [
                Variable(
                    "votemper",
                    "Water temperature at CMC",
                    "Kelvins",
                    sorted(["deptht", "time_counter", "y", "x"]),
                )
            ]
        )

    def test_init(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        ds = Nemo(nc_data)
        self.assertIs(ds.nc_data, nc_data)
        self.assertEqual(ds.variables, nc_data.variables)

    def test_depths(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            expected = np.array(
                [
                    0.494025,
                    1.54138,
                    2.64567,
                    3.81949,
                    5.07822,
                    6.44061,
                    7.92956,
                    9.573,
                    11.405,
                    13.4671,
                    15.8101,
                    18.4956,
                    21.5988,
                    25.2114,
                    29.4447,
                    34.4342,
                    40.3441,
                    47.3737,
                    55.7643,
                    65.8073,
                    77.8539,
                    92.3261,
                    109.729,
                    130.666,
                    155.851,
                    186.126,
                    222.475,
                    266.04,
                    318.127,
                    380.213,
                    453.938,
                    541.089,
                    643.567,
                    763.333,
                    902.339,
                    1062.44,
                    1245.29,
                    1452.25,
                    1684.28,
                    1941.89,
                    2225.08,
                    2533.34,
                    2865.7,
                    3220.82,
                    3597.03,
                    3992.48,
                    4405.22,
                    4833.29,
                    5274.78,
                    5727.92,
                ],
                dtype=np.float32,
            )
            np.testing.assert_array_equal(ds.depths, expected)

    @patch("tests.test_nemo.NetCDFData")
    def test_no_depth_variable(self, patch_netcdfdata):
        # This is a hack to trigger the no depth variable edge case
        patch_netcdfdata.depth_dimensions.return_value = []

        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            np.testing.assert_array_equal(ds.depths, np.array([0]))

    def test_variables(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            variables = ds.variables

            self.assertEqual(len(variables), 3)
            self.assertTrue("votemper" in variables)
            self.assertEqual(variables["votemper"].name, "Water temperature at CMC")
            self.assertEqual(variables["votemper"].unit, "Kelvins")
            self.assertEqual(
                sorted(variables["votemper"].dimensions),
                sorted(["deptht", "time_counter", "y", "x"]),
            )

    def test_get_point(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            self.assertAlmostEqual(
                ds.get_point(13.0, -149.0, 0, "votemper", 2031436800), 299.17, places=2
            )

    def test_get_raw_point(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            lat, lon, data = ds.get_raw_point(13.0, -149.0, 0, 2031436800, "votemper")

        self.assertEqual(len(lat.values.ravel()), 12)
        self.assertEqual(len(lon.values.ravel()), 12)
        self.assertEqual(len(data.values.ravel()), 12)
        self.assertAlmostEqual(data.values[1, 1], 299.3, places=1)

    def test_get_profile(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            p, d = ds.get_profile(13.0, -149.0, "votemper", 2031436800)
            self.assertAlmostEqual(p[0], 299.17, places=2)
            self.assertAlmostEqual(p[10], 299.15, places=2)
            self.assertAlmostEqual(p[20], 296.466766, places=4)
            self.assertTrue(np.ma.is_masked(p[49]))

    def test_get_profile_depths(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            p = ds.get_profile_depths(
                13.0,
                -149.0,
                2031436800,
                "votemper",
                [0, 10, 25, 50, 100, 200, 500, 1000],
            )
            self.assertTrue(np.ma.is_masked(p[0]))
            self.assertAlmostEqual(p[1], 299.15, places=2)
            self.assertAlmostEqual(p[4], 292.48, places=2)
            self.assertAlmostEqual(p[7], 277.90, places=2)

    def test_bottom_point(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            self.assertAlmostEqual(
                ds.get_point(13.0, -149.0, "bottom", "votemper", 2031436800),
                274.13,
                places=2,
            )

    def test_get_area(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            a = np.array(
                np.meshgrid(np.linspace(5, 10, 10), np.linspace(-150, -160, 10))
            )

            r = ds.get_area(a, 0, 2031436800, "votemper", "gaussian", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.285, places=3)

            r = ds.get_area(a, 0, 2031436800, "votemper", "bilinear", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.269, places=3)

            r = ds.get_area(a, 0, 2031436800, "votemper", "nearest", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.28986, places=5)

            r = ds.get_area(a, 0, 2031436800, "votemper", "inverse", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.2795, places=4)

    @unittest.skip("IndexError: index 0 is out of bounds for axis 0 with size 0")
    def test_get_path_profile(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            p, d, r, dep = ds.get_path_profile(
                [[13, -149], [14, -140], [15, -130]], "votemper", 2031436800, 10
            )

            self.assertEqual(r.shape[0], 50)
            self.assertGreater(r.shape[1], 10)
            self.assertEqual(r.shape[1], p.shape[1])
            self.assertEqual(r.shape[1], len(d))
            self.assertEqual(d[0], 0)

    def test_get_timeseries_point(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            r = ds.get_timeseries_point(
                13.0, -149.0, 0, 2031436800, 2034072000, "votemper"
            )
            self.assertAlmostEqual(r[0], 299.17, places=2)
            self.assertAlmostEqual(r[1], 299.72, places=2)

    def test_get_timeseries_profile(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        with Nemo(nc_data) as ds:
            r, d = ds.get_timeseries_profile(
                13.0, -149.0, 2031436800, 2034072000, "votemper"
            )
            self.assertAlmostEqual(r[0, 0], 299.17, places=2)
            self.assertAlmostEqual(r[0, 10], 299.15, places=2)
            self.assertAlmostEqual(r[0, 20], 296.466766, places=4)
            self.assertTrue(np.ma.is_masked(r[0, 49]))

            self.assertNotEqual(r[0, 0], r[1, 0])
            self.assertTrue(np.ma.is_masked(r[1, 49]))

    def test_get_profile_raises_when_surface_variable_requested(self):
        nc_data = NetCDFData("tests/testdata/salishseacast_ssh_test.nc")
        with Nemo(nc_data) as ds:
            with raises(HTTPException):
                ds.get_profile(None, None, "ssh", None, None)
