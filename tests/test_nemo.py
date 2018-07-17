import unittest
from data.nemo import Nemo
import numpy as np
import datetime
import pytz

class TestNemo(unittest.TestCase):

    def test_init(self):
        Nemo(None)

    def test_open(self):
        with Nemo('tests/testdata/nemo_test.nc'):
            pass

    def test_variables(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            variables = n.variables

            self.assertEqual(len(variables), 3)
            self.assertTrue('votemper' in variables)
            self.assertEqual(variables['votemper'].name,
                             'Water temperature at CMC')
            self.assertEqual(variables['votemper'].unit, 'Kelvins')

    def test_get_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 0, 0, 'votemper'),
                299.17, places=2
            )

    def test_get_raw_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            lat, lon, data = n.get_raw_point(
                13.0, -149.0, 0, 0, 'votemper'
            )

        self.assertEqual(len(lat.values.ravel()), 12)
        self.assertEqual(len(lon.values.ravel()), 12)
        self.assertEqual(len(data.values.ravel()), 12)
        self.assertAlmostEqual(data.values[1, 1], 299.3, places=1)

    def test_get_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p, d = n.get_profile(13.0, -149.0, 0, 'votemper')
            self.assertAlmostEqual(p[0], 299.17, places=2)
            self.assertAlmostEqual(p[10], 299.15, places=2)
            self.assertAlmostEqual(p[20], 296.466766, places=6)
            self.assertTrue(np.ma.is_masked(p[49]))

    def test_get_profile_depths(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p = n.get_profile_depths(
                13.0,
                -149.0,
                0,
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
                n.get_point(13.0, -149.0, 'bottom', 0, 'votemper'),
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

            r = n.get_area(a, 0, 0, 'votemper', "gaussian", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.285, places=3)

            r = n.get_area(a, 0, 0, 'votemper', "bilinear", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.269, places=3)

            r = n.get_area(a, 0, 0, 'votemper', "nearest", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.28986, places=5)

            r = n.get_area(a, 0, 0, 'votemper', "inverse", 25000, 10)
            self.assertAlmostEqual(r[5, 5], 301.2795, places=4)

    def test_get_path_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            p, d, r, dep = n.get_path_profile(
                [[13, -149], [14, -140], [15, -130]], 0, 'votemper', 10)

            self.assertEqual(r.shape[0], 50)
            self.assertGreater(r.shape[1], 10)
            self.assertEqual(r.shape[1], p.shape[1])
            self.assertEqual(r.shape[1], len(d))
            self.assertEqual(d[0], 0)

    def test_get_timeseries_point(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            r = n.get_timeseries_point(13.0, -149.0, 0, 0, 1, 'votemper')
            self.assertAlmostEqual(r[0], 299.17, places=2)
            self.assertAlmostEqual(r[1], 299.72, places=2)

    def test_get_timeseries_profile(self):
        with Nemo('tests/testdata/nemo_test.nc') as n:
            r, d = n.get_timeseries_profile(13.0, -149.0, 0, 1, 'votemper')
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
