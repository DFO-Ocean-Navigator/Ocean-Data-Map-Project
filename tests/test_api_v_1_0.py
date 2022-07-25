#!/usr/bin/env python

import datetime
import unittest
from unittest.mock import MagicMock, PropertyMock, patch

from fastapi.testclient import TestClient

import routes.enums as e
from oceannavigator import create_app

client = TestClient(create_app())

# Note that patches are applied in bottom-up order


class TestAPIv1(unittest.TestCase):
    def test_git_info(self) -> None:
        response = client.get("/api/v1.0/git_info")

        self.assertEqual(response.status_code, 200)

    def test_generate_script(self) -> None:
        for lang in e.ScriptLang:
            for script_type in e.ScriptType:

                response = client.get(
                    "/api/v1.0/generate_script",
                    params={"query": "", "lang": lang, "script_type": script_type},
                )

                self.assertEqual(response.status_code, 200)

    def test_datasets(self) -> None:
        response = client.get("/api/v1.0/datasets")

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(7, len(data))

    def test_dataset(self) -> None:
        response = client.get("/api/v1.0/dataset/giops")

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual("giops", data["id"])
        self.assertEqual("day", data["quantum"])

    def test_quantum(self) -> None:
        response = client.get("/api/v1.0/dataset/giops")

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual("day", data["quantum"])

    def test_quantum_returns_404_when_dataset_not_found(self) -> None:
        response = client.get("/api/v1.0/dataset/asdf")

        self.assertEqual(response.status_code, 404)

    def test_variables(self) -> None:
        response = client.get("/api/v1.0/dataset/giops/variables")

        expected = [
            {
                "id": "votemper",
                "value": "Temperature",
                "scale": [-5, 30],
                "interp": None,
                "two_dimensional": False,
            }
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, response.json())

    def test_variables_depth_only(self) -> None:
        response = client.get(
            "/api/v1.0/dataset/giops/variables", params={"has_depth_only": True}
        )

        expected = [
            {
                "id": "votemper",
                "value": "Temperature",
                "scale": [-5, 30],
                "interp": None,
                "two_dimensional": False,
            }
        ]

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, response.json())

    def test_variables_vectors_only(self) -> None:
        response = client.get(
            "/api/v1.0/dataset/giops/variables", params={"vectors_only": True}
        )

        expected = []

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, response.json())

    def test_variables_returns_404_when_dataset_not_found(self) -> None:
        response = client.get("/api/v1.0/dataset/asdf/variables")

        self.assertEqual(response.status_code, 404)
        self.assertIn("asdf", response.json()["message"])

    def test_depths_includes_all_by_default(self):
        response = client.get("/api/v1.0/dataset/giops/votemper/depths")

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(52, len(data))
        self.assertIn("all", map(lambda d: d["id"], data))
        self.assertIn("All Depths", map(lambda d: d["value"], data))

    def test_depths_excludes_all(self):
        response = client.get(
            "/api/v1.0/dataset/giops/votemper/depths", params={"include_all_key": False}
        )

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(51, len(data))
        self.assertNotIn("all", map(lambda d: d["id"], data))

    def test_scale(self) -> None:
        response = client.get(
            "/api/v1.0/scale",
            params={"dataset": "giops", "variable": "votemper", "scale": "-5,30"},
        )

        self.assertEqual(response.status_code, 200)

    def test_range(self) -> None:
        response = client.get(
            "/api/v1.0/range",
            params={
                "dataset": "giops_real",
                "variable": "votemper",
                "depth": "0",
                "time": 2212704000,
                "extent": "-14958556.575,2726984.185,3826607.496,11239011.655",
            },
        )

        expected = {"min": -1.169886341970023, "max": 9.347870007228384}

        self.assertEqual(response.status_code, 200)
        self.assertEqual(expected, response.json())


"""
    def test_timestamps_endpoint_sqlite(self):

        res = client.get(
            "/api/v1.0/timestamps/?dataset=nemo_sqlite3&variable=votemper"
        )

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]["id"], 2031436800)
        self.assertEqual(res_data[0]["value"], "2014-05-17T00:00:00+00:00")

    def test_timestamps_endpoint_xarray(self):

        res = client.get("/api/v1.0/timestamps/?dataset=giops&variable=votemper")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertEqual(len(res_data), 2)
        self.assertEqual(res_data[0]["id"], 2031436800)
        self.assertEqual(res_data[0]["value"], "2014-05-17T00:00:00+00:00")

    def test_colors_endpoint(self):

        res = client.get("/api/v1.0/colors/")

        self.assertEqual(res.status_code, 200)

    def test_colormaps_endpoint(self):
        res = client.get("/api/v1.0/colormaps/")

        self.assertEqual(res.status_code, 200)

        res_data = self.__get_response_data(res)
        self.assertIn({"id": "temperature", "value": "Temperature"}, res_data)

    def test_colormaps_image_endpoint(self):
        res = client.get("/api/v1.0/colormaps.png")

        self.assertEqual(res.status_code, 200)

    def test_class4_models_endpoint(self):
        res = self.app.get(
            "/api/v1.0/class4/models/ocean_predict/class4_20190102_GIOPS_CONCEPTS_2.3_profile/"
        )
        self.assertEqual(res.status_code, 200)

    def test_subset_endpoint(self):

        res = client.get(self.apiLinks["subset"])

        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_plot_map_endpoint(self):

        # map (area)
        res = client.get(self.apiLinks["plot_map"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_map_csv"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_map_quiver_len_mag"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_map_quiver_no_mag"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_map_quiver_color_mag"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_plot_transect_endpoint(self):

        # transect (line)
        res = client.get(self.apiLinks["plot_transect"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_transect_depth_limit"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_transect_csv"])
        self.assertEqual(res.status_code, 200)

    def test_plot_timeseries_endpoint(self):
        # timeseries (point, virtual mooring)
        res = client.get(self.apiLinks["plot_timeseries"])

        self.assertEqual(res.status_code, 200)

    def test_plot_timeseries_endpoint_all_depths(self):
        # timeseries (point, virtual mooring)
        res = client.get(self.apiLinks["plot_timeseries_all_depths"])

        self.assertEqual(res.status_code, 200)

    def test_plot_timeseries_endpoint_bottom_depth(self):
        # timeseries (point, virtual mooring)
        res = client.get(self.apiLinks["plot_timeseries_bottom"])

        self.assertEqual(res.status_code, 200)

    def test_plot_ts_endpoint(self):
        # ts (point, T/S Plot)
        res = client.get(self.apiLinks["plot_ts"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/sound.. returning error")
    def test_plot_sound_endpoint(self):
        # sound (point, Speed of Sound)
        # IndexError: list index out of range
        res = client.get(self.apiLinks["plot_sound"])
        self.assertEqual(res.status_code, 200)

    def test_plot_profile_endpoint(self):
        # profile (point, profile)
        res = client.get(self.apiLinks["plot_profile"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_profile_multi_variable"])
        self.assertEqual(res.status_code, 200)

    def test_plot_hovmoller_endpoint(self):
        # hovmoller (line, Hovmöller Diagram)
        res = client.get(self.apiLinks["plot_hovmoller"])
        self.assertEqual(res.status_code, 200)

        res = client.get(self.apiLinks["plot_hovmoller_bottom"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/observation.. returning error")
    def test_plot_observation_endpoint(self):
        # observation (point, Observation)
        # returns RuntimeError: Opening a dataset via sqlite requires the 'timestamp' keyword argument.
        res = client.get(self.apiLinks["plot_observation"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Skipping api/plot/stickplot.. explaination in definition..")
    def test_plot_stick_endpoint(self):
        # stick (point, Stick Plot) returns NameError: name 'timestamp' is not defined
        # or RuntimeError: Error finding timestamp(s) in database.
        res = client.get(self.apiLinks["plot_stick"])
        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_query_endpoint(self):

        # response for each type of query
        res = []
        res.append(client.get("/api/v1.0/points/"))
        res.append(client.get("/api/v1.0/lines/"))
        res.append(client.get("/api/v1.0/areas/"))
        res.append(client.get("/api/v1.0/class4/"))
        for i in range(4):
            self.assertEqual(res[i].status_code, 200)

    @unittest.skip("IndexError: list index out of range")
    def test_query_id_endpoint(self):
        res = []

        res.append(client.get("/api/v1.0/areas/2015_VME_Closures.json"))

        res.append(
            client.get(
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
            client.get(
                "/api/v1.0/points/EPSG:3857/9784/-15938038,1751325,4803914,12220141/NL-AZMP_Stations.json"
            )
        )
        # lines
        res.append(
            client.get(
                "/api/v1.0/lines/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP%20Transects.json"
            )
        )
        # areas
        res.append(
            client.get(
                "/api/v1.0/areas/EPSG:3857/9784/-15938038,1751325,4803914,12220141/AZMP_NL_Region_Analysis_Areas.json"
            )
        )
        # class4
        res.append(
            client.get(
                "/api/v1.0/class4/EPSG:3857/9784/-15938038,1751325,4803914,12220141/class4_20200101_GIOPS_CONCEPTS_3.0_profile.json"
            )
        )

        for i in range(6):
            self.assertEqual(res[i].status_code, 200)

    @unittest.skip("Failing")
    def test_tile_endpoint(self):
        res = client.get(
            "/api/v1.0/tiles/gaussian/25/10/EPSG:3857/giops_real/votemper/2212704000/0/-5,30/6/50/40.png"
        )

        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_topo_endpoint(self):
        res = client.get("/api/v1.0/tiles/topo/false/EPSG:3857/6/52/41.png")

        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_bath_endpoint(self):
        res = client.get("/api/v1.0/tiles/bath/EPSG:3857/6/56/41.png")

        self.assertEqual(res.status_code, 200)

    @unittest.skip("Failing")
    def test_mbt_endpoint(self):
        res = client.get("/api/v1.0/mbt/EPSG:3857/lands/7/105/77")

        self.assertEqual(res.status_code, 200)

    @patch("data.observational.queries.get_datatypes")
    def test_observation_datatypes(self, patch_get_datatypes):
        patch_get_datatypes.return_value = [PropertyMock(key="mykey")]
        patch_get_datatypes.return_value[0].name = "myname"
        res = client.get(self.apiLinks["observation_datatypes"])

        self.assertEqual(res.status_code, 200)
        data = self.__get_response_data(res)
        self.assertDictEqual(data[0], {"id": "mykey", "value": "myname"})

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_meta_keys")
    def test_observation_meta_keys(self, patch_get_meta_keys, patch_session):
        patch_get_meta_keys.return_value = ["this is a test"]
        res = client.get(self.apiLinks["observation_meta_keys"])

        self.assertEqual(res.status_code, 200)
        patch_get_meta_keys.assert_called_with(patch_session, ["platform_type"])
        data = self.__get_response_data(res)
        self.assertEqual(data[0], "this is a test")

    @patch("data.observational.db.session")
    @patch("data.observational.queries.get_meta_values")
    def test_observation_meta_values(self, patch_get_meta_values, patch_session):
        patch_get_meta_values.return_value = ["this is a test"]
        res = client.get(self.apiLinks["observation_meta_values"])

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
        res = client.get(self.apiLinks["observation_track"])

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
        res = client.get(self.apiLinks["observation_point"])

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

        res = client.get(self.apiLinks["observation_variables"])
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

        res = client.get(self.apiLinks["observation_tracktimerange"])
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

        res = client.get(
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
"""

if __name__ == "__main__":
    unittest.main()
