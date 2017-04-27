import unittest
import geopy
import geo


class TestGeo(unittest.TestCase):

    def test_bearing(self):
        self.assertAlmostEqual(
            geo.bearing(
                40.0167, -105.2833,
                -33.9333, 137.65
            ),
            -104.04,
            places=2
        )

    def test_points_between(self):
        start = geopy.Point("47N, 50W")
        end = geopy.Point("48N, 52W")
        dist, la, lo, b = geo.points_between(start, end, 10)

        self.assertEqual(len(dist), 10)
        self.assertTrue((la > 46.99).all())
        self.assertTrue((la < 48.01).all())
        self.assertTrue((lo > -52.01).all())
        self.assertTrue((lo < -49.99).all())

        # Test with constant lat
        start = geopy.Point("47N, 50W")
        end = geopy.Point("47N, 52W")
        dist, la, lo, b = geo.points_between(start, end, 10, True)

        self.assertEqual(len(dist), 10)
        self.assertTrue((la == 47).all())
        self.assertTrue((lo > -52.01).all())
        self.assertTrue((lo < -49.99).all())

        # Test with constant lon
        start = geopy.Point("47N, 50W")
        end = geopy.Point("40N, 50W")
        dist, la, lo, b = geo.points_between(start, end, 10, True)

        self.assertEqual(len(dist), 10)
        self.assertTrue((lo == -50).all())
        self.assertTrue((la > 39.99).all())
        self.assertTrue((la < 47.01).all())

    def test_path_to_points(self):
        points = [[1, 1], [10, 10]]
        dist, t, lat, lon, b = geo.path_to_points(points, n=10, times=None)
        self.assertAlmostEqual(b[0], 44.5, places=1)
        self.assertAlmostEqual(lat[4], 5.0, places=1)
        self.assertAlmostEqual(lon[4], 5.0, places=1)

        points = [[0, 0], [10, 10], [20, 20]]
        dist, t, lat, lon, b = geo.path_to_points(points, n=10, times=None)
        self.assertAlmostEqual(lat[-1], 20.0, places=1)
        self.assertAlmostEqual(lon[-1], 20.0, places=1)

        points = [[0, 0], [10, 10], [20, 20]]
        dist, t, lat, lon, b = geo.path_to_points(points, n=10, times=[0, 1])
        self.assertAlmostEqual(lat[-1], 20.0, places=1)
        self.assertAlmostEqual(lon[-1], 20.0, places=1)
