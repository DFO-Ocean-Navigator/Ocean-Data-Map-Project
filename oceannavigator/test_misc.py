import unittest
import mock
import numpy as np
from oceannavigator import misc


class TestMisc(unittest.TestCase):

    @mock.patch("oceannavigator.misc._get_kml")
    def test_points(self, m):
        m.return_value = mock.MagicMock(), None
        result = misc.points("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 0)

        folder = mock.MagicMock(Placemark=[
            mock.MagicMock(),
            mock.MagicMock(),
        ])
        folder.Placemark[0].Point.coordinates.text = "0,0"
        folder.Placemark[0].name.text = "Place 1"
        folder.Placemark[1].Point.coordinates.text = "1,2"

        m.return_value = folder, None
        result = misc.points("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 1)
        self.assertEqual(
            result['features'][0],
            {
                'geometry': {
                    'type': 'Point',
                    'coordinates': [0.0, 0.0]
                },
                'type': 'Feature',
                'properties': {
                    'resolution': 0,
                    'type': 'point',
                    'name': 'Place 1'
                }
            }
        )

    @mock.patch("oceannavigator.misc._get_kml")
    def test_lines(self, m):
        m.return_value = mock.MagicMock(), None
        result = misc.lines("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 0)

        folder = mock.MagicMock(Placemark=[
            mock.MagicMock(),
            mock.MagicMock(),
        ])
        folder.Placemark[0].LineString.coordinates.text = "0,0 0.0001,0.0001"
        folder.Placemark[0].name.text = "Line 1"
        folder.Placemark[1].LineString.coordinates.text = "1,2 3,4"

        m.return_value = folder, None
        result = misc.lines("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 1)
        self.assertEqual(
            result['features'][0],
            {
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [[0.0, 0.0], [0.0001, 0.0001]]
                },
                'type': 'Feature',
                'properties': {
                    'resolution': 0,
                    'type': 'line',
                    'name': 'Line 1'
                }
            }
        )

    @mock.patch("oceannavigator.misc._get_kml")
    def test_areas(self, m):
        m.return_value = mock.MagicMock(), None
        result = misc.areas("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 0)

        folder = mock.MagicMock(Placemark=[
            mock.MagicMock(),
            mock.MagicMock(),
        ])
        poly0 = mock.Mock()
        poly0.outerBoundaryIs.LinearRing.coordinates.text = \
            "0,0 0,0.0001 0.0001,0.0001 0.0001,0"
        folder.Placemark[0].iterfind.return_value = [poly0]
        poly0.iterfind.return_value = []
        folder.Placemark[0].Point.coordinates.text = "0,0"
        folder.Placemark[0].name.text = "Place 1"
        folder.Placemark[1].Point.coordinates.text = "1,2"

        m.return_value = folder, None
        result = misc.areas("fid", "EPSG:3857", 0, "-10,-10,10,10")

        self.assertTrue(result['type'], 'FeatureCollection')
        self.assertEqual(len(result['features']), 1)
        self.maxDiff = None
        coordinates = np.array(
            result['features'][0]['geometry']['coordinates'])
        centroid = result['features'][0]['properties']['centroid']
        self.assertTrue(len(coordinates), 5)
        self.assertTrue(len(np.where(coordinates[:, 0] >= 0)[0]), 5)
        self.assertTrue(len(np.where(coordinates[:, 0] <= 0.0001)[0]), 5)
        self.assertAlmostEqual(centroid[0], 5e-5)
        self.assertAlmostEqual(centroid[1], 5e-5)
        result['features'][0]['geometry']['coordinates'] = None
        result['features'][0]['properties']['centroid'] = None

        self.assertEqual(
            result['features'][0],
            {
                'geometry': {
                    'type': 'MultiPolygon',
                    'coordinates': None,
                },
                'type': 'Feature',
                'properties': {
                    'key': 'fid/Place 1',
                    'resolution': 0,
                    'type': 'area',
                    'name': 'Place 1',
                    'centroid': None,
                }
            }
        )
