#!/usr/bin/env python

import json
import unittest
from unittest.mock import patch

from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator import DatasetConfig, create_app
from utils.errors import APIError

app = create_app(testing=True)

# Note that patches are applied in bottom-up order


class TestAPIv1(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()

        self.patch_dataset_config_ret_val = {
            "giops": {
                "enabled": True,
                "url": "tests/testdata/nemo_test.nc",
                "grid_angle_file_url": "tests/testdata/nemo_grid_angle.nc",
                "time_dim_units": "seconds since 1950-01-01 00:00:00",
                "quantum": "day",
                "name": "GIOPS",
                "help": "help",
                "attribution": "attrib",
                "variables": {
                    "votemper": {"name": "Temperature", "scale": [-5, 30], "units": "Kelvins", "equation": "votemper - 273.15"},
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

        res = self.app.get('/api/v1.0/variables/?dataset=giops&3d_only')

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 1)
        self.assertEqual(resp_data[0]['id'], 'votemper')
        self.assertEqual(resp_data[0]['scale'], [-5, 30])
        self.assertEqual(resp_data[0]['value'], 'Temperature')

        res = self.app.get('/api/v1.0/variables/?dataset=giops&vectors')

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 1)

        res = self.app.get('/api/v1.0/variables/?dataset=giops&vectors_only')

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 0)

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

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    @patch('data.sqlite_database.SQLiteDatabase.get_timestamps')
    def test_timestamps_endpoint(self, patch_get_all_timestamps, patch_get_data_variables, patch_get_dataset_config):

        patch_get_all_timestamps.return_value = sorted(
            [2031436800, 2034072000])
        patch_get_data_variables.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            '/api/v1.0/timestamps/?dataset=giops&variable=votemper')

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]['id'], 2031436800)
        self.assertEqual(res_data[0]['value'], '2014-05-17T00:00:00+00:00')

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_scale_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/scale/giops/votemper/-5,30.png')

        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, 'get_datasets')
    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_datasets_endpoint(self, patch_get_dataset_config, patch_get_datasets):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        patch_get_datasets = ["giops"]

        res = self.app.get('/api/v1.0/datasets/')

        self.assertEqual(res.status_code, 200)

    def test_colors_endpoint(self):

        res = self.app.get('/api/v1.0/colors/')

        self.assertEqual(res.status_code, 200)

    def test_colormaps_endpoint(self):
        res = self.app.get('/api/v1.0/colormaps/')

        self.assertEqual(res.status_code, 200)

    def test_colormaps_image_endpoint(self):
        res = self.app.get('/api/v1.0/colormaps.png')

        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_quantum_query(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/quantum/?dataset=giops')

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(res_data, "day")


if __name__ == '__main__':
    unittest.main()
