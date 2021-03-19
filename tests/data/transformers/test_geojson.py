"""Unit tests for data.geojson
"""
import unittest

import xarray as xr
from data.transformers.geojson import (WrongNumberOfDimensionsError,
                                       data_array_to_geojson)
from geojson import FeatureCollection
from numpy.testing._private.utils import assert_raises


class GeoJSONTest(unittest.TestCase):

    def setUp(self) -> None:
        self.data_array = xr.open_dataset(
            'tests/testdata/giops_test.nc', decode_times=False)

    def tearDown(self) -> None:
        self.data_array.close()

    def test_data_array_to_geojson_builds_correct_feature_collection(self) -> None:
        expected = {"features": [{"geometry": {"coordinates": [56.799999, 310.399994], "type": "Point"}, "properties": {"data": 3.1, "long_name": "Temperature", "short_name": "votemper", "units": "degrees_C"}, "type": "Feature"}, {"geometry": {"coordinates": [57.0, 310.600006], "type": "Point"}, "properties": {"data": 3.084, "long_name": "Temperature", "short_name": "votemper", "units": "degrees_C"}, "type": "Feature"}, {"geometry": {"coordinates": [57.200001, 310.799988], "type": "Point"}, "properties": {
            "data": 3.193, "long_name": "Temperature", "short_name": "votemper", "units": "degrees_C"}, "type": "Feature"}, {"geometry": {"coordinates": [57.400002, 311.0], "type": "Point"}, "properties": {"data": 3.357, "long_name": "Temperature", "short_name": "votemper", "units": "degrees_C"}, "type": "Feature"}, {"geometry": {"coordinates": [57.599998, 311.200012], "type": "Point"}, "properties": {"data": 3.459, "long_name": "Temperature", "short_name": "votemper", "units": "degrees_C"}, "type": "Feature"}], "type": "FeatureCollection"}

        result = data_array_to_geojson(self.data_array.votemper[0, 0, :5, :5], "latitude", "longitude")

        self.assertEqual(FeatureCollection, type(result))
        self.assertEqual(expected, result)

    def test_data_array_to_geojson_raises_when_data_not_2d(self) -> None:
        with self.assertRaises(WrongNumberOfDimensionsError):
            data_array_to_geojson(self.data_array.votemper[:, 0, :5, :5], "latitude", "longitude")
