"""Unit tests for routes.schemas.generate_script_schema
"""
import unittest

from routes.schemas.generate_script_schema import GenerateScriptSchema


class GenerateScriptSchemaTest(unittest.TestCase):

    def test_generate_script_schema_validate_input(self) -> None:
        valid_inputs = {
            "query": "adsfasdf",
            "lang": "python",
            "scriptType": "PLOT"
        }

        errors = GenerateScriptSchema().validate(valid_inputs)

        self.assertFalse(errors)

    def test_generate_script_schema_returns_errors_with_missing_args(self) -> None:

        errors = GenerateScriptSchema().validate({})

        self.assertTrue(errors)
        self.assertEqual(3, len(errors))
    
    def test_generate_script_schema_returns_errors_with_wrong_values(self) -> None:
        args = {
            "query": "asddasf",
            "lang": "c++",
            "scriptType": "stats_table"
        }

        errors = GenerateScriptSchema().validate(args)

        self.assertTrue(errors)
        self.assertEqual(2, len(errors))
        self.assertTrue('lang' in errors)
        self.assertTrue('scriptType' in errors)
