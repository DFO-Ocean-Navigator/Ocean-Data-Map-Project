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

        with open('tests/testdata/endpoints.json') as endpoints:
            self.apiLinks = json.load(endpoints)
        with open('tests/testdata/datasetconfigpatch.json') as dataPatch:
            self.patch_dataset_config_ret_val = json.load(dataPatch)

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

        res = self.app.get('/api/v1.0/variables/?dataset=giops')

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
    def test_timestamps_endpoint_sqlite(self, patch_get_all_timestamps, patch_get_data_variables, patch_get_dataset_config):

        patch_get_all_timestamps.return_value = sorted(
            [2031436800, 2034072000])
        patch_get_data_variables.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            '/api/v1.0/timestamps/?dataset=nemo_sqlite3&variable=votemper')

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]['id'], 2031436800)
        self.assertEqual(res_data[0]['value'], '2014-05-17T00:00:00+00:00')

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_timestamps_endpoint_xarray(self, patch_get_dataset_config):
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

    def test_api_info(self):
        res = self.app.get('/api/')
        self.assertEqual(res.status_code, 400)

        res = self.app.get('/api/v1.0/')
        self.assertEqual(res.status_code, 400)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_generatescript_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        res = self.app.get(self.apiLinks['generatescript'])
        self.assertEqual(res.status_code, 200)

    def test_observationvariables_endpoint(self):
        res = self.app.get('/api/v1.0/observationvariables/')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_range_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        res = self.app.get(self.apiLinks["range"])
        self.assertEqual(res.status_code, 200)


    # OverflowError: signed integer is greater than maximum
    @unittest.skip("Skipping api/data.. problem with timestamp conversion")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_data_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/data/giops_real/votemper/2212704000/0/60,-29.json')
        self.assertEqual(res.status_code, 200)


    @unittest.skip("Skipping api/class4.. needs re-write")
    def test_class4_query_endpoint(self):
        res = self.app.get('/api/v1.0/class4/models/class4_20190102_GIOPS_CONCEPTS_2.3_profile/')
        self.assertEqual(res.status_code, 200)


    def test_drifter_query_endpoint(self):
        res = self.app.get('/api/v1.0/drifters/vars/300234062853860')
        self.assertEqual(res.status_code, 200)

    # RuntimeError: Opening a dataset via sqlite requires the 'variable' keyword argument.
    @unittest.skip("Skipping api/stats.. needs re-write")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_stats_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(self.apiLinks["stats"])
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.netcdf_data.NetCDFData._get_xarray_data_variables')
    def test_subset_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(self.apiLinks["subset"])
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.netcdf_data.NetCDFData._get_xarray_data_variables')
    def test_plot_map_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # map (area)
        res = self.app.get(self.apiLinks["plot_map"])
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.netcdf_data.NetCDFData._get_xarray_data_variables')
    def test_plot_transect_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # transect (line)
        res = self.app.get(self.apiLinks["plot_transect"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/timeseries.. blame nabil")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_timeseries_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # timeseries (point, virtual mooring)
        # returns IndexError: index 0 is out of bounds for axis 0 with size 0
        res = self.app.get(self.apiLinks["plot_timeseries"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/ts.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_ts_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # ts (point, T/S Plot)
        # KeyError: 'vosaline'
        res = self.app.get(self.apiLinks["plot_ts"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/sound.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_sound_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # sound (point, Speed of Sound)
        # IndexError: list index out of range
        res = self.app.get(self.apiLinks[plot_sound])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.netcdf_data.NetCDFData._get_xarray_data_variables')
    def test_plot_profile_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # profile (point, profile)
        res = self.app.get(self.apiLinks["plot_profile"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/hovmoller.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_hovmoller_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # hovmoller (line, Hovmöller Diagram)
        # TypeError: object of type 'datetime.datetime' has no len()
        # possibly a problem with how mant timestamps are in giops_test
        res = self.app.get(self.apiLinks["plot_hovmoller"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/hovmoller.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_observation_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # observation (point, Observation)
        # returns RuntimeError: Opening a dataset via sqlite requires the 'timestamp' keyword argument.
        res = self.app.get(self.apiLinks["plot_observation"])
        self.assertEqual(res.status_code, 200)


    @unittest.skip("Skipping api/plot/drifter.. explaination in definition..")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_drifter_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # drifter returns AttributeError: 'NoneType' object has no attribute 'replace'
        # or, can also return IndexError: index 0 is out of bounds for axis 0 with size 0
        res = self.app.get(self.apiLinks[plot_drifter])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/stickplot.. explaination in definition..")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_stick_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # stick (point, Stick Plot) returns NameError: name 'timestamp' is not defined
        # or RuntimeError: Error finding timestamp(s) in database.
        res = self.app.get(self.apiLinks["plot_stick"])
        self.assertEqual(res.status_code, 200)


    def test_query_endpoint(self):

        # response for each type of query
        res = []
        res.append(self.app.get(
            '/api/v1.0/points/'
        ))
        res.append(self.app.get(
            '/api/v1.0/lines/'
        ))
        res.append(self.app.get(
            '/api/v1.0/areas/'
        ))
        res.append(self.app.get(
            '/api/v1.0/class4/'
        ))
        for i in range(4):
            self.assertEqual(res[i].status_code, 200)

    def test_query_id_endpoint(self):
        res = []

        res.append(self.app.get('/api/v1.0/areas/2015_VME_Closures.json'))

        res.append(self.app.get('/api/v1.0/class4/class4_20200102_GIOPS_CONCEPTS_3.0_profile.json'))

        res.append(self.app.get('/api/v1.0/drifters/meta.json'))

        res.append(self.app.get('/api/v1.0/observation/meta.json'))

        for i in range(4):
            self.assertEqual(res[i].status_code, 200)

    def test_query_file_endpoint(self):
        res = []

        # points
        res.append(self.app.get('/api/v1.0/points/EPSG:3857/9784/-15938038,1751325,4803914,12220141/NL-AZMP_Stations.json'))
        # lines
        res.append(self.app.get('/api/v1.0/lines/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP%20Transects.json'))
        # areas
        res.append(self.app.get('/api/v1.0/areas/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP_NL_Region_Analysis_Areas.json'))
        # class4
        res.append(self.app.get('/api/v1.0/class4/EPSG:3857/9784/-15938038,1751325,4803914,12220141/class4_20200101_GIOPS_CONCEPTS_3.0_profile.json'))
        # drifters
        res.append(self.app.get('/api/v1.0/drifters/EPSG:3857/9784/-15938038,1751325,4803914,12220141/active.json'))
        # observations
        res.append(self.app.get('/api/v1.0/observations/EPSG:3857/9784/-15938038,1751325,4803914,12220141/ship:Pearkes;trip:003.json'))

        for i in range(6):
            self.assertEqual(res[i].status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.netcdf_data.NetCDFData._get_xarray_data_variables')
    def test_tile_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/tiles/gaussian/25/10/EPSG:3857/giops_real/votemper/2212704000/0/-5,30/6/50/40.png')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_topo_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/tiles/topo/false/EPSG:3857/6/52/41.png')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_bath_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/tiles/bath/EPSG:3857/6/56/41.png')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_mbt_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/mbt/EPSG:3857/lands/7/105/77')
        self.assertEqual(res.status_code, 200)


if __name__ == '__main__':
    unittest.main()
