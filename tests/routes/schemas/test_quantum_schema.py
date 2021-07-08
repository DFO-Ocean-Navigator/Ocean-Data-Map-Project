"""Unit tests for routes.schemas.get_data_schema
"""
import unittest
from operator import le

from routes.schemas.quantum_schema import QuantumSchema


class QuantumSchemaTest(unittest.TestCase):

    def test_quantum_schema_validates_inputs(self) -> None:
        valid_inputs = {
            "dataset": "some_dataset"
        }

        errors = QuantumSchema().validate(valid_inputs)

        self.assertFalse(errors)

    def test_quantum_schema_returns_errors_with_missing_args(self) -> None:

        errors = QuantumSchema().validate({})

        self.assertTrue(errors)
        self.assertEqual(1, len(errors))
