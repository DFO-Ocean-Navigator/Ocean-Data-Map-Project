import unittest
import fvcom
import datetime
import pytz


class TestFvcom(unittest.TestCase):

    def test_init(self):
        fvcom.Fvcom(None)

    def test_open(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc'):
            pass

    def test_get_point(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc') as n:
            data, depth = n.get_point(45.3, -64.0, 0, 0, 'temp',
                                      return_depth=True)

            self.assertAlmostEqual(data, 6.76, places=2)
            self.assertAlmostEqual(depth, 6.50, places=2)

    def test_get_raw_point(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc') as n:
            lat, lon, data = n.get_raw_point(
                45.3, -64.0, 0, 0, 'temp'
            )

        self.assertEqual(len(lat.ravel()), 156)
        self.assertEqual(len(lon.ravel()), 156)
        self.assertEqual(len(data.ravel()), 156)
        self.assertAlmostEqual(data[75], 6.90, places=1)

    def test_get_profile(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc') as n:
            p, d = n.get_profile(45.3, -64.0, 0, 'temp')
            self.assertAlmostEqual(p[0], 6.76, places=2)
            self.assertAlmostEqual(p[10], 6.76, places=2)

    def test_bottom_point(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc') as n:
            self.assertAlmostEqual(
                n.get_point(45.3, -64.0, 'bottom', 0, 'temp'),
                6.76, places=2
            )

    def test_timestamps(self):
        with fvcom.Fvcom('data/testdata/fvcom_test.nc') as n:
            self.assertEqual(len(n.timestamps), 2)
            self.assertEqual(n.timestamps[0],
                             datetime.datetime(2015, 7, 6, 0, 0, 0, 0,
                                               pytz.UTC))

            # Property is read-only
            with self.assertRaises(AttributeError):
                n.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                n.timestamps[0] = 0
