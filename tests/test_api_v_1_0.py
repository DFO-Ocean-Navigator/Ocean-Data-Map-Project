#!/usr/bin/env python

import json
import unittest
from unittest.mock import patch

from flask import Flask

from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator import DatasetConfig
from routes.api_v1_0 import bp_v1_0

app = Flask(__name__)
app.register_blueprint(bp_v1_0)


class TestAPIv1(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_variables(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = VariableList([
            Variable('votemper', 'Water temperature at CMC',
                     'Kelvins', sorted(["deptht", "time_counter", "y", "x"]))
        ])

        patch_get_dataset_config.return_value = {
            "giops": {
                "enabled": True,
                "url": "tests/testdata/nemo_test.nc",
                "variables": {
                    "votemper": {"name": "Temperature", "scale": [-5, 30], "units": "Kelvins"},
                }
            }
        }

        res = self.app.get('/api/v1.0/variables/?dataset=giops')

        self.assertEqual(res.status_code, 200)

        resp_data = json.loads(res.get_data(as_text=True))[0]
        self.assertEqual(resp_data['id'], 'votemper')
        self.assertEqual(resp_data['scale'], [-5, 30])
        self.assertEqual(resp_data['value'], 'Temperature')


if __name__ == '__main__':
    unittest.main()
