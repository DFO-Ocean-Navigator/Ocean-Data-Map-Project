"""Unit tests for routes.schemas.depth_schema
"""
import unittest

from routes.schemas.depth_schema import DepthSchema


class DepthSchemaTest(unittest.TestCase):
    def test_depth_schema_validates_inputs(self) -> None:
        valid_inputs = {"dataset": "some_dataset", "variable": "my_var", "all": "yes"}

        errors = DepthSchema().validate(valid_inputs)

        self.assertFalse(errors)

    def test_depth_schema_returns_errors_with_missing_args(self) -> None:

        errors = DepthSchema().validate({})

        self.assertTrue(errors)
        self.assertEqual(2, len(errors))
