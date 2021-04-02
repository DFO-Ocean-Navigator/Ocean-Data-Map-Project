"""Unit tests for routes.schemas.get_data_schema
"""
import unittest

from routes.schemas.get_data_schema import GetDataSchema


class GetDataSchemaTest(unittest.TestCase):

    def test_get_data_schema_validates_inputs(self) -> None:
        all_valid_inputs = {
            "variable": "some_variable",
            "time": 0,
            "depth": 0,
            "dataset": "my_dataset",
            "geometry_type": "area"
        }

        errors = GetDataSchema().validate(all_valid_inputs)

        self.assertFalse(errors)

    def test_get_data_schema_returns_errors_with_missing_args(self) -> None:

        errors = GetDataSchema().validate({})

        self.assertTrue(errors)
        self.assertEqual(5, len(errors))

    def test_get_data_schema_returns_errors_with_wrong_values(self) -> None:
        args = {
            "variable": "some_variable",
            "time": 0,
            "depth": -420,
            "dataset": "my_dataset",
            "geometry_type": "fake_geometry_type"
        }

        errors = GetDataSchema().validate(args)

        self.assertTrue(errors)
        self.assertEqual(2, len(errors))
        self.assertTrue('geometry_type' in errors)
        self.assertTrue('depth' in errors)
