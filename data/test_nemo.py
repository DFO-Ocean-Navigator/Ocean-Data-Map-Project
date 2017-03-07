import unittest
import nemo
import numpy as np
import datetime


class TestNemo(unittest.TestCase):

    def test_init(self):
        nemo.Nemo(None)

    def test_open(self):
        with nemo.Nemo('data/testdata/nemo_test.nc'):
            pass

    def test_get_point(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 0, 0, 'votemper'),
                299.19, places=2
            )

    def test_get_profile(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            p = n.get_profile(13.0, -149.0, 0, 'votemper')
            self.assertAlmostEqual(p[0], 299.19, places=2)
            self.assertAlmostEqual(p[10], 299.17, places=2)
            self.assertAlmostEqual(p[20], 296.46, places=2)
            self.assertTrue(np.ma.is_masked(p[49]))

    def test_bottom_point(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(13.0, -149.0, 'bottom', 0, 'votemper'),
                274.13, places=2
            )

    def test_get_area(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            a = np.array(
                np.meshgrid(
                    np.linspace(5, 10, 10),
                    np.linspace(-150, -160, 10)
                )
            )
            r = n.get_area(a, 0, 0, 'votemper')
            self.assertAlmostEqual(r[5, 5], 301.28, places=2)

    def test_get_path_profile(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            r = n.get_path_profile(
                [[13, -149], [14, -140], [15, -130]], 0, 'votemper', 10)

            self.assertGreater(r.shape[0], 10)
            self.assertEqual(r.shape[1], 50)

    def test_get_timeseries_point(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            r = n.get_timeseries_point(13.0, -149.0, 0, 0, 1, 'votemper')
            self.assertAlmostEqual(r[0], 299.19, places=2)
            self.assertAlmostEqual(r[1], 299.72, places=2)

    def test_get_timeseries_profile(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            r = n.get_timeseries_profile(13.0, -149.0, 0, 1, 'votemper')
            self.assertAlmostEqual(r[0, 0], 299.19, places=2)
            self.assertAlmostEqual(r[0, 10], 299.17, places=2)
            self.assertAlmostEqual(r[0, 20], 296.46, places=2)
            self.assertTrue(np.ma.is_masked(r[0, 49]))

            self.assertNotEqual(r[0, 0], r[1, 0])
            self.assertTrue(np.ma.is_masked(r[1, 49]))

    def test_timestamps(self):
        with nemo.Nemo('data/testdata/nemo_test.nc') as n:
            self.assertEqual(len(n.timestamps), 2)
            self.assertEqual(n.timestamps[0],
                             datetime.datetime(2014, 5, 17, 0, 0))

            # Property is read-only
            with self.assertRaises(AttributeError):
                n.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                n.timestamps[0] = 0
