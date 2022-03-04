"""Unit tests for data.geojson
"""
import unittest

import xarray as xr
from geojson import FeatureCollection

from data.transformers.geojson import data_array_to_geojson


class GeoJSONTest(unittest.TestCase):
    def setUp(self) -> None:
        self.data_array: xr.Dataset = xr.open_dataset(
            "tests/testdata/giops_test.nc", decode_times=False
        )

    def tearDown(self) -> None:
        self.data_array.close()

    def test_data_array_to_geojson_builds_correct_feature_collection(self) -> None:
        result = data_array_to_geojson(
            self.data_array.votemper[0, 0, :5, :5],
            None,
            self.data_array["latitude"][:5],
            self.data_array["longitude"][:5],
        )

        self.assertIsInstance(result, FeatureCollection)
        self.assertEqual(25, len(result["features"]))

    def test_data_array_to_geojson_raises_when_data_not_2d(self) -> None:
        with self.assertRaises(ValueError):
            data_array_to_geojson(
                self.data_array.votemper[:, 0, :5, :5],
                None,
                self.data_array["latitude"][:5],
                self.data_array["longitude"][:5],
            )
