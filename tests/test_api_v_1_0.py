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
                    "votemper": { "name": "Temperature", "envtype": "ocean", "unit": "Celsius", "scale": [-5, 30], "equation": "votemper - 273.15", "dims": ["time_counter", "deptht", "y", "x"] },
                }
            },

            "giops_real": {
                "enabled": True,
                "url": "tests/testdata/appended.nc",
                "name": "GIOPS Forecast 3D - Polar Stereographic",
                "quantum": "day",
                "type": "forecast",
                "lat_var_key": "yc",
                "lon_var_key": "xc",
                "time_dim_units": "seconds since 1950-01-01 00:00:00",
                "attribution": "The Canadian Centre for Meteorological and Environmental Prediction",
                "variables": {
                    "votemper": { "name": "Temperature", "envtype": "ocean", "unit": "Celsius", "scale": [-5, 30], "equation": "votemper - 273.15", "dims": ["time", "depth", "yc", "xc"] },
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

    # To do: flesh out these tests, these just confirm the API returns data


    # one offs
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
        res = self.app.get(
            '/api/v1.0/generatescript/%7B%22dataset%22:%22giops%22,%22names%22:[%2242.3585,%20-36.0695%22],%22plotTitle%22:%22%22,%22quantum%22:%22day%22,%22showmap%22:true,%22station%22:[[42.35854391749709,-36.06948852539062,null]],%22time%22:2211840000,%22type%22:%22profile%22,%22variable%22:[%22votemper%22]%7D/python/PLOT/'
        )
        self.assertEqual(res.status_code, 200)

    def test_observationvariables_endpoint(self):
        res = self.app.get('/api/v1.0/observationvariables/')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_range_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        res = self.app.get(
            "/api/v1.0/range/giops_real/votemper/gaussian/25/10/EPSG:3857/-14958556.575346138,2726984.1854711734,3826607.4960187795,11239011.655308401/0/2212704000.json?_=1581603111469"
        )
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
        
        res = self.app.get('/api/v1.0/stats/?query=%7B%22area%22%3A%5B%7B%22innerrings%22%3A%5B%5D%2C%22name%22%3A%22%22%2C%22polygons%22%3A%5B%5B%5B52.10650519075634%2C-36.59683227539063%5D%2C%5B51.727028157047755%2C-29.12612915039064%5D%2C%5B49.095452162534826%2C-29.917144775390632%5D%2C%5B48.86471476180279%2C-36.77261352539063%5D%2C%5B52.10650519075634%2C-36.59683227539063%5D%5D%5D%7D%5D%2C%22dataset%22%3A%22giops_real%22%2C%22depth%22%3A0%2C%22time%22%3A2057094000%2C%22variable%22%3A%22votemper%22%7D')
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_subset_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            '/api/v1.0/subset/?&output_format=NETCDF4&dataset_name=giops_real&variables=votemper&min_range=59.489726035537075,-31.337127685546886&max_range=60.67317856581772,-27.206268310546882&time=2212704000,2212704000&user_grid=0&should_zip=0'
        )
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_map_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # map (area)
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22area%22%3A%5B%7B%22innerrings%22%3A%5B%5D%2C%22name%22%3A%22%22%2C%22polygons%22%3A%5B%5B%5B60.67317856581772%2C-30.54611206054687%5D%2C%5B60.54377524118843%2C-27.206268310546882%5D%2C%5B59.489726035537075%2C-28.085174560546875%5D%2C%5B59.71209717332292%2C-31.337127685546886%5D%2C%5B60.67317856581772%2C-30.54611206054687%5D%5D%5D%7D%5D%2C%22bathymetry%22%3Atrue%2C%22colormap%22%3A%22default%22%2C%22contour%22%3A%7B%22colormap%22%3A%22default%22%2C%22hatch%22%3Afalse%2C%22legend%22%3Atrue%2C%22levels%22%3A%22auto%22%2C%22variable%22%3A%22none%22%7D%2C%22dataset%22%3A%22giops_real%22%2C%22depth%22%3A0%2C%22interp%22%3A%22gaussian%22%2C%22neighbours%22%3A10%2C%22projection%22%3A%22EPSG%3A3857%22%2C%22quantum%22%3A%22day%22%2C%22quiver%22%3A%7B%22colormap%22%3A%22default%22%2C%22magnitude%22%3A%22length%22%2C%22variable%22%3A%22none%22%7D%2C%22radius%22%3A25%2C%22scale%22%3A%22-5%2C30%2Cauto%22%2C%22showarea%22%3Atrue%2C%22time%22%3A2212704000%2C%22type%22%3A%22map%22%2C%22variable%22%3A%22votemper%22%7D&'
        )
        self.assertEqual(res.status_code, 200)


    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_transect_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # transect (line)
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22colormap%22%3A%22default%22%2C%22dataset%22%3A%22giops_real%22%2C%22depth_limit%22%3Afalse%2C%22linearthresh%22%3A200%2C%22path%22%3A%5B%5B61.16443708638272%2C-28.964080810546882%5D%2C%5B60.60854176060906%2C-27.382049560546875%5D%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22scale%22%3A%22-5%2C30%2Cauto%22%2C%22selectedPlots%22%3A%220%2C1%2C1%22%2C%22showmap%22%3Atrue%2C%22surfacevariable%22%3A%22none%22%2C%22time%22%3A%222212704000%22%2C%22type%22%3A%22transect%22%2C%22variable%22%3A%22votemper%22%7D'
        )
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/timeseries.. blame nabil")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_timeseries_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # timeseries (point, virtual mooring) 
        # returns IndexError: index 0 is out of bounds for axis 0 with size 0
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22colormap%22%3A%22default%22%2C%22dataset%22%3A%22giops_real%22%2C%22depth%22%3A0%2C%22endtime%22%3A2057094000%2C%22names%22%3A%5B%2261.3125%2C%20-28.3351%22%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22scale%22%3A%22-5%2C30%2Cauto%22%2C%22showmap%22%3Atrue%2C%22starttime%22%3A2211926376%2C%22station%22%3A%5B%5B61.31245157483821%2C-28.335113525390625%2Cnull%5D%5D%2C%22type%22%3A%22timeseries%22%2C%22variable%22%3A%22vosaline%22%7D&format=json'
        )
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/ts.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_ts_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # ts (point, T/S Plot)
        # KeyError: 'vosaline'
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22dataset%22%3A%22giops_real%22%2C%22names%22%3A%5B%2261.3125%2C%20-28.3351%22%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22showmap%22%3Atrue%2C%22station%22%3A%5B%5B61.31245157483821%2C-28.335113525390625%2Cnull%5D%5D%2C%22time%22%3A2057094000%2C%22type%22%3A%22ts%22%7D&format=json'
        )  
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/sound.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_sound_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # sound (point, Speed of Sound)
        # IndexError: list index out of range
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22dataset%22%3A%22giops_real%22%2C%22names%22%3A%5B%2260.2616%2C%20-28.5246%22%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22showmap%22%3Atrue%2C%22station%22%3A%5B%5B60.26161708284462%2C-28.52462768554688%2Cnull%5D%5D%2C%22time%22%3A2212704000%2C%22type%22%3A%22sound%22%7D&format=json'
        )
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_profile_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # profile (point, profile)
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22dataset%22%3A%22giops_real%22%2C%22names%22%3A%5B%2260.3487%2C%20-28.6125%22%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22showmap%22%3Atrue%2C%22station%22%3A%5B%5B60.34869562531861%2C-28.612518310546875%2Cnull%5D%5D%2C%22time%22%3A2212704000%2C%22type%22%3A%22profile%22%2C%22variable%22%3A%5B%22votemper%22%5D%7D&format=json'
        )
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
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22colormap%22%3A%22default%22%2C%22dataset%22%3A%22giops_real%22%2C%22depth%22%3A0%2C%22endtime%22%3A2212704000%2C%22path%22%3A%5B%5B60.86631247462259%2C-29.667205810546882%5D%2C%5B60.30518536282736%2C-27.909393310546882%5D%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22scale%22%3A%22-5%2C30%2Cauto%22%2C%22showmap%22%3Atrue%2C%22starttime%22%3A%222213006400%22%2C%22type%22%3A%22hovmoller%22%2C%22variable%22%3A%22votemper%22%7D&format=json'
        )
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/hovmoller.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_observation_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # observation (point, Observation) 
        # returns RuntimeError: Opening a dataset via sqlite requires the 'timestamp' keyword argument.
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22dataset%22%3A%22giops_real%22%2C%22names%22%3A%5B%22Pearkes%20003%20507%22%5D%2C%22observation%22%3A%5B1587%5D%2C%22observation_variable%22%3A%5B7%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22type%22%3A%22observation%22%2C%22variable%22%3A%5B%22votemper%22%5D%7D&format=json'
        )
        self.assertEqual(res.status_code, 200)


    @unittest.skip("Skipping api/plot/drifter.. explaination in definition..")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_drifter_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # drifter returns AttributeError: 'NoneType' object has no attribute 'replace'
        # or, can also return IndexError: index 0 is out of bounds for axis 0 with size 0
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22buoyvariable%22%3A%5B%22sst%22%5D%2C%22dataset%22%3A%22giops_real%22%2C%22depth%22%3A0%2C%22drifter%22%3A%5B%22300234063122470%22%5D%2C%22latlon%22%3Afalse%2C%22quantum%22%3A%22day%22%2C%22showmap%22%3Atrue%2C%22type%22%3A%22drifter%22%2C%22variable%22%3A%5B%22votemper%22%5D%7D&format=json'
        )
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/stickplot.. explaination in definition..")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_plot_stick_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # stick (point, Stick Plot) returns NameError: name 'timestamp' is not defined
        # or RuntimeError: Error finding timestamp(s) in database.
        res = self.app.get(
            '/api/v1.0/plot/?query=%7B%22dataset%22%3A%22giops%22%2C%22depth%22%3A0%2C%22endtime%22%3A2057094000%2C%22names%22%3A%5B%2251.7270%2C%20-32.7296%22%5D%2C%22plotTitle%22%3A%22%22%2C%22quantum%22%3A%22day%22%2C%22starttime%22%3A2211926376%2C%22station%22%3A%5B%5B51.727028157047755%2C-32.72964477539064%2Cnull%5D%5D%2C%22type%22%3A%22stick%22%2C%22variable%22%3A%5B%22votemper%22%5D%7D&format=json'
        )
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


    # not used anywhere in front end returns RuntimeError: Opening a dataset via sqlite requires the 'variable' keyword argument.
    @unittest.skip("Skipping api/timestamp_for_date.. needs fixing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
    def test_timestamp_for_date_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get('/api/v1.0/timestamp/giops/2057094000/giops')
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch('data.sqlite_database.SQLiteDatabase.get_data_variables')
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
