#!/usr/bin/env python

import datetime
import json
import unittest
from unittest.mock import MagicMock, PropertyMock, patch

from data.variable import Variable
from data.variable_list import VariableList
from oceannavigator import DatasetConfig, create_app

app = create_app(testing=True)

# Note that patches are applied in bottom-up order


class TestAPIv1(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

        with open("tests/testdata/endpoints.json") as endpoints:
            self.apiLinks = json.load(endpoints)
        with open("tests/testdata/datasetconfigpatch.json") as dataPatch:
            self.patch_dataset_config_ret_val = json.load(dataPatch)

        self.patch_data_vars_ret_val = VariableList(
            [
                Variable(
                    "votemper",
                    "Water temperature at CMC",
                    "Kelvins",
                    sorted(["deptht", "time_counter", "y", "x"]),
                )
            ]
        )

    def __get_response_data(self, resp):
        return json.loads(resp.get_data(as_text=True))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_variables_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/variables/?dataset=giops&3d_only")

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 1)
        self.assertEqual(resp_data[0]["id"], "votemper")
        self.assertEqual(resp_data[0]["scale"], [-5, 30])
        self.assertEqual(resp_data[0]["value"], "Temperature")

        res = self.app.get("/api/v1.0/variables/?dataset=giops")

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 1)

        res = self.app.get("/api/v1.0/variables/?dataset=giops&vectors_only")

        self.assertEqual(res.status_code, 200)

        resp_data = self.__get_response_data(res)
        self.assertEqual(len(resp_data), 0)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_latest_timestamp")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_depth_endpoint(
        self, patch_get_data_vars, patch_get_latest_timestamp, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_latest_timestamp.return_value = 2034072000
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/depth/?dataset=giops&variable=votemper")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 51)
        self.assertEqual(res_data[0]["id"], "bottom")
        self.assertEqual(res_data[0]["value"], "Bottom")

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    @patch("data.sqlite_database.SQLiteDatabase.get_timestamps")
    def test_timestamps_endpoint_sqlite(
        self,
        patch_get_all_timestamps,
        patch_get_data_variables,
        patch_get_dataset_config,
    ):

        patch_get_all_timestamps.return_value = sorted([2031436800, 2034072000])
        patch_get_data_variables.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            "/api/v1.0/timestamps/?dataset=nemo_sqlite3&variable=votemper"
        )

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]["id"], 2031436800)
        self.assertEqual(res_data[0]["value"], "2014-05-17T00:00:00+00:00")

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_timestamps_endpoint_xarray(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/timestamps/?dataset=giops&variable=votemper")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]["id"], 2031436800)
        self.assertEqual(res_data[0]["value"], "2014-05-17T00:00:00+00:00")

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_scale_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/scale/giops/votemper/-5,30.png")

        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "get_datasets")
    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_datasets_endpoint(self, patch_get_dataset_config, patch_get_datasets):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        patch_get_datasets = ["giops"]

        res = self.app.get("/api/v1.0/datasets/")

        self.assertEqual(res.status_code, 200)

    def test_colors_endpoint(self):

        res = self.app.get("/api/v1.0/colors/")

        self.assertEqual(res.status_code, 200)

    def test_colormaps_endpoint(self):
        res = self.app.get("/api/v1.0/colormaps/")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertIn({"id": "temperature", "value": "Temperature"}, res_data)

    def test_colormaps_image_endpoint(self):
        res = self.app.get("/api/v1.0/colormaps.png")

        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_quantum_query(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/quantum/?dataset=giops")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(res_data, "day")

    def test_api_info(self):
        res = self.app.get("/api/")
        self.assertEqual(res.status_code, 400)

        res = self.app.get("/api/v1.0/")
        self.assertEqual(res.status_code, 400)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_range_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        res = self.app.get(self.apiLinks["range"])
        self.assertEqual(res.status_code, 200)

    # OverflowError: signed integer is greater than maximum
    @unittest.skip("Skipping api/data.. problem with timestamp conversion")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_data_endpoint(self, patch_get_data_vars, patch_get_dataset_config):
        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            "/api/v1.0/data/giops_real/votemper/2212704000/0/60,-29.json"
        )
        self.assertEqual(res.status_code, 200)

    def test_class4_models_endpoint(self):
        res = self.app.get(
            "/api/v1.0/class4/models/class4_20190102_GIOPS_CONCEPTS_2.3_profile/"
        )
        self.assertEqual(res.status_code, 200)

    # RuntimeError: Opening a dataset via sqlite requires the 'variable' keyword argument.
    @unittest.skip("Skipping api/stats.. needs re-write")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_stats_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(self.apiLinks["stats"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.netcdf_data.NetCDFData._get_xarray_data_variables")
    def test_subset_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(self.apiLinks["subset"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.netcdf_data.NetCDFData._get_xarray_data_variables")
    def test_plot_map_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # map (area)
        res = self.app.get(self.apiLinks["plot_map"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_map_csv"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_map_quiver_len_mag"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_map_quiver_no_mag"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_map_quiver_color_mag"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.netcdf_data.NetCDFData._get_xarray_data_variables")
    def test_plot_transect_endpoint(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # transect (line)
        res = self.app.get(self.apiLinks["plot_transect"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_transect_depth_limit"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_transect_csv"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_timeseries_endpoint(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # timeseries (point, virtual mooring)
        res = self.app.get(self.apiLinks["plot_timeseries"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_timeseries_endpoint_all_depths(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # timeseries (point, virtual mooring)
        res = self.app.get(self.apiLinks["plot_timeseries_all_depths"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_timeseries_endpoint_bottom_depth(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # timeseries (point, virtual mooring)
        res = self.app.get(self.apiLinks["plot_timeseries_bottom"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_ts_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # ts (point, T/S Plot)
        res = self.app.get(self.apiLinks["plot_ts"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/sound.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_sound_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # sound (point, Speed of Sound)
        # IndexError: list index out of range
        res = self.app.get(self.apiLinks["plot_sound"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.netcdf_data.NetCDFData._get_xarray_data_variables")
    def test_plot_profile_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # profile (point, profile)
        res = self.app.get(self.apiLinks["plot_profile"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_profile_multi_variable"])
        self.assertEqual(res.status_code, 200)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_hovmoller_endpoint(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # hovmoller (line, Hovmöller Diagram)
        res = self.app.get(self.apiLinks["plot_hovmoller"])
        self.assertEqual(res.status_code, 200)

        res = self.app.get(self.apiLinks["plot_hovmoller_bottom"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/observation.. returning error")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_observation_endpoint(
        self, patch_get_data_vars, patch_get_dataset_config
    ):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # observation (point, Observation)
        # returns RuntimeError: Opening a dataset via sqlite requires the 'timestamp' keyword argument.
        res = self.app.get(self.apiLinks["plot_observation"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/stickplot.. explaination in definition..")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_plot_stick_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        # stick (point, Stick Plot) returns NameError: name 'timestamp' is not defined
        # or RuntimeError: Error finding timestamp(s) in database.
        res = self.app.get(self.apiLinks["plot_stick"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_query_endpoint(self):

        # response for each type of query
        res = []
        res.append(self.app.get("/api/v1.0/points/"))
        res.append(self.app.get("/api/v1.0/lines/"))
        res.append(self.app.get("/api/v1.0/areas/"))
        res.append(self.app.get("/api/v1.0/class4/"))
        for i in range(4):
            self.assertEqual(res[i].status_code, 200)

    @unittest.skip("IndexError: list index out of range")
    def test_query_id_endpoint(self):
        res = []

        res.append(self.app.get("/api/v1.0/areas/2015_VME_Closures.json"))

        res.append(
            self.app.get(
                "/api/v1.0/class4/class4_20200102_GIOPS_CONCEPTS_3.0_profile.json"
            )
        )

        for i in range(4):
            self.assertEqual(res[i].status_code, 200)

    @unittest.skip("IndexError: list index out of range")
    def test_query_file_endpoint(self):
        res = []

        # points
        res.append(
            self.app.get(
                "/api/v1.0/points/EPSG:3857/9784/-15938038,1751325,4803914,12220141/NL-AZMP_Stations.json"
            )
        )
        # lines
        res.append(
            self.app.get(
                "/api/v1.0/lines/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP%20Transects.json"
            )
        )
        # areas
        res.append(
            self.app.get(
                "/api/v1.0/areas/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP_NL_Region_Analysis_Areas.json"
            )
        )
        # class4
        res.append(
            self.app.get(
                "/api/v1.0/class4/EPSG:3857/9784/-15938038,1751325,4803914,12220141/class4_20200101_GIOPS_CONCEPTS_3.0_profile.json"
            )
        )

        for i in range(6):
            self.assertEqual(res[i].status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.netcdf_data.NetCDFData._get_xarray_data_variables")
    def test_tile_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get(
            "/api/v1.0/tiles/gaussian/25/10/EPSG:3857/giops_real/votemper/2212704000/0/-5,30/6/50/40.png"
        )
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_topo_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/tiles/topo/false/EPSG:3857/6/52/41.png")
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_bath_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/tiles/bath/EPSG:3857/6/56/41.png")
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_mbt_endpoint(self, patch_get_data_vars, patch_get_dataset_config):

        patch_get_data_vars.return_value = self.patch_data_vars_ret_val
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        res = self.app.get("/api/v1.0/mbt/EPSG:3857/lands/7/105/77")
        self.assertEqual(res.status_code, 200)

    @patch("data.observational.queries.get_datatypes")
    def test_observation_datatypes(self, patch_get_datatypes):
        patch_get_datatypes.return_value = [PropertyMock(key="mykey")]
        patch_get_datatypes.return_value[0].name = "myname"
        res = self.app.get(self.apiLinks["observation_datatypes"])

        self.assertEqual(res.status_code, 200)
        data = self.__get_response_data(res)
        self.assertDictEqual(data[0], {"id": "mykey", "value": "myname"})

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_meta_keys")
    def test_observation_meta_keys(self, patch_get_meta_keys, patch_session):
        patch_get_meta_keys.return_value = ["this is a test"]
        res = self.app.get(self.apiLinks["observation_meta_keys"])

        self.assertEqual(res.status_code, 200)
        patch_get_meta_keys.assert_called_with(patch_session, ["platform_type"])
        data = self.__get_response_data(res)
        self.assertEqual(data[0], "this is a test")

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_meta_values")
    def test_observation_meta_values(self, patch_get_meta_values, patch_session):
        patch_get_meta_values.return_value = ["this is a test"]
        res = self.app.get(self.apiLinks["observation_meta_values"])

        self.assertEqual(res.status_code, 200)
        patch_get_meta_values.assert_called_with(
            patch_session, ["platform_type"], "key"
        )
        data = self.__get_response_data(res)
        self.assertEqual(data[0], "this is a test")

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_platform_tracks")
    def test_observation_track(self, patch_get_platform_tracks, patch_session):
        typ = PropertyMock()
        typ.name = "none"
        patch_get_platform_tracks.return_value = [
            [0, typ, 0, 0],
            [0, typ, 1, 1],
            [1, typ, 0, 0],
        ]
        res = self.app.get(self.apiLinks["observation_track"])

        self.assertEqual(res.status_code, 200)
        patch_get_platform_tracks.assert_called_with(
            patch_session, "day", platform_types=["none"]
        )
        data = self.__get_response_data(res)
        self.assertEqual(len(data["features"]), 1)
        self.assertIn([0, 0], data["features"][0]["geometry"]["coordinates"])

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_stations")
    def test_observation_track(self, patch_get_stations, patch_session):
        platform_type = PropertyMock()
        platform_type.name = "platform_type"
        station = PropertyMock(
            platform=PropertyMock(type=platform_type),
            latitude=0,
            longitude=0,
            id=0,
        )
        station.name = "myname"
        patch_get_stations.return_value = [station]
        res = self.app.get(self.apiLinks["observation_point"])

        self.assertEqual(res.status_code, 200)
        patch_get_stations.assert_called_with(
            session=patch_session, platform_types=["none"]
        )
        data = self.__get_response_data(res)
        self.assertEqual(len(data["features"]), 1)
        self.assertEqual([0, 0], data["features"][0]["geometry"]["coordinates"])

    @patch("data.observational.db.session.query")
    def test_observation_variables(self, patch_query):
        query_return = MagicMock()
        filter_return = MagicMock()
        order_return = MagicMock()
        patch_query.return_value = query_return
        query_return.filter = MagicMock(return_value=filter_return)
        filter_return.order_by = MagicMock(return_value=order_return)

        variable0 = PropertyMock()
        variable0.name = "variable0"
        variable1 = PropertyMock()
        variable1.name = "variable1"
        order_return.all = MagicMock(return_value=[variable0, variable1])

        res = self.app.get(self.apiLinks["observation_variables"])
        self.assertEqual(res.status_code, 200)
        data = self.__get_response_data(res)
        self.assertEqual(len(data), 2)
        self.assertDictEqual(data[0], {"id": 0, "value": "variable0"})
        self.assertDictEqual(data[1], {"id": 1, "value": "variable1"})

    @patch("data.observational.db.session.query")
    def test_observation_tracktimerange(self, patch_query):
        query_return = MagicMock()
        filter_return = MagicMock()
        patch_query.return_value = query_return
        query_return.filter = MagicMock(return_value=filter_return)
        filter_return.one = MagicMock(
            return_value=[
                datetime.datetime(2010, 1, 1),
                datetime.datetime(2020, 1, 1),
            ]
        )

        res = self.app.get(self.apiLinks["observation_tracktimerange"])
        self.assertEqual(res.status_code, 200)
        data = self.__get_response_data(res)
        self.assertEqual(data["min"], "2010-01-01T00:00:00")
        self.assertEqual(data["max"], "2020-01-01T00:00:00")

    @patch("data.observational.db.session.query")
    def test_observation_meta(self, patch_query):
        query_return = MagicMock()
        patch_query.return_value = query_return
        platform = PropertyMock(
            attrs={
                "attr0": "attribute0",
                "attr1": "attribute1",
            },
            type=PropertyMock(),
        )
        platform.type.name = "platform_type"
        query_return.get = MagicMock()
        query_return.get.return_value = platform

        res = self.app.get(
            self.apiLinks["observation_meta"],
            query_string={
                "type": "platform",
                "id": 123,
            },
        )
        data = self.__get_response_data(res)
        query_return.get.assert_called_with("123")
        self.assertDictEqual(
            data,
            {
                "Platform Type": "platform_type",
                "attr0": "attribute0",
                "attr1": "attribute1",
            },
        )


if __name__ == "__main__":
    unittest.main()
