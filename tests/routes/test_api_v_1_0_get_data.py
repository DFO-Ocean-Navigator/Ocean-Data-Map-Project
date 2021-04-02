import json
import unittest
from unittest.mock import patch

from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator import DatasetConfig, create_app

app = create_app(testing=True)


class TestAPIv1GetData(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()

        with open('tests/testdata/datasetconfigpatch.json') as dataPatch:
            self.patch_dataset_config_ret_val = json.load(dataPatch)

        self.patch_data_vars_ret_val = VariableList([
            Variable('votemper', 'Water temperature at CMC',
                     'Kelvins', sorted(["deptht", "time_counter", "y", "x"]))
        ])

    @unittest.skip("NotImplementedError: 'item' is not yet a valid method on dask arrays")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_data_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/data/', query_string={
            'dataset': 'giops_real',
            'variable': 'votemper',
            'time': 0,
            'depth': 0,
            'geometry_type': 'area'
        })

        self.assertEqual(res.status_code, 200)
