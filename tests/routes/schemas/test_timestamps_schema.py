"""Unit tests for routes.schemas.timestamps_schema
"""
import unittest

from routes.schemas.timestamps_schema import TimestampsSchema


class TimestampsSchemaTest(unittest.TestCase):

    def test_timestamps_schema_validates_inputs(self) -> None:
        valid_inputs = {
            "dataset": "some_dataset",
            "variable": "my_var"
        }

        errors = TimestampsSchema().validate(valid_inputs)

        self.assertFalse(errors)

    def test_timestamps_schema_returns_errors_with_missing_args(self) -> None:

        errors = TimestampsSchema().validate({})

        self.assertTrue(errors)
        self.assertEqual(2, len(errors))
