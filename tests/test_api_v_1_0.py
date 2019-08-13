#!/usr/bin/env python

import json
import unittest
from unittest.mock import patch

from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator import DatasetConfig, create_app

app = create_app()
app.testing = True

# Note that patches are applied in bottom-up order


class TestAPIv1(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()

        self.patch_dataset_config_ret_val = {
            "giops": {
                "enabled": True,
                "url": "tests/testdata/nemo_test.nc",
                "variables": {
                    "votemper": {"name": "Temperature", "scale": [-5, 30], "units": "Kelvins"},
                }
            }
        }

        self.patch_data_vars_ret_val = VariableList([
            Variable('votemper', 'Water temperature at CMC',
                     'Kelvins', sorted(["deptht", "time_counter", "y", "x"]))
        ])

    def __get_response_data(self, resp):
        return json.loads(resp.get_data(as_text=True))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_variables_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/variables/?dataset=giops')

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)[0]
        self.assertEqual(resp_data['id'], 'votemper')
        self.assertEqual(resp_data['scale'], [-5, 30])
        self.assertEqual(resp_data['value'], 'Temperature')

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_latest_timestamp')
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_depth_endpoint(self, patch_get_data_vars, patch_get_latest_timestamp, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_latest_timestamp.return_value = 2034072000
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/depth/?dataset=giops&variable=votemper')

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 51)
        self.assertEqual(res_data[0]['id'], 'bottom')
        self.assertEqual(res_data[0]['value'], 'Bottom')


if __name__ == '__main__':
    unittest.main()
