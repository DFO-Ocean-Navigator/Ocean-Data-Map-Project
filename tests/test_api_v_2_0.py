#!/usr/bin/env python
import datetime
import json
import unittest
from unittest.mock import MagicMock, PropertyMock, patch

from fastapi.testclient import TestClient
from pytest import approx

import routes.enums as e
from oceannavigator import create_app
from oceannavigator.settings import get_settings


class TestAPIv2:
    settings = get_settings()
    client = TestClient(create_app())
    with open("tests/testdata/endpoints.json") as endpoints:
        api_links = json.load(endpoints)

    def test_git_info(self) -> None:
        response = self.client.get("/api/v1.0/git_info")

        assert response.status_code == 200

    def test_generate_script(self) -> None:
        for lang in e.ScriptLang:
            for script_type in e.ScriptType:

                response = self.client.get(
                    "/api/v1.0/generate_script",
                    params={"query": "", "lang": lang, "script_type": script_type},
                )

                assert response.status_code == 200

    def test_datasets(self) -> None:
        response = self.client.get("/api/v1.0/datasets")

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 7

    def test_dataset(self) -> None:
        response = self.client.get("/api/v1.0/dataset/giops")

        data = response.json()

        assert response.status_code == 200
        assert data["id"] == "giops"
        assert data["quantum"] == "day"

    def test_quantum(self) -> None:
        response = self.client.get("/api/v1.0/dataset/giops")

        data = response.json()

        assert response.status_code == 200
        assert data["quantum"] == "day"

    def test_quantum_returns_404_when_dataset_not_found(self) -> None:
        response = self.client.get("/api/v1.0/dataset/asdf")

        assert response.status_code == 404

    def test_variables(self) -> None:
        response = self.client.get("/api/v1.0/dataset/giops/variables")

        expected = [
            {
                "id": "votemper",
                "value": "Temperature",
                "scale": [-5, 30],
                "interp": None,
                "two_dimensional": False,
            }
        ]

        assert response.status_code == 200
        assert response.json() == expected

    def test_variables_depth_only(self) -> None:
        response = self.client.get(
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

        assert response.status_code == 200
        assert expected == response.json()

    def test_variables_vectors_only(self) -> None:
        response = self.client.get(
            "/api/v1.0/dataset/giops/variables", params={"vectors_only": True}
        )

        expected = []

        assert response.status_code == 200
        assert response.json() == expected

    def test_variables_returns_404_when_dataset_not_found(self) -> None:
        response = self.client.get("/api/v1.0/dataset/asdf/variables")

        assert response.status_code == 404
        assert "asdf" in response.json()["message"]

    def test_depths_includes_all_by_default(self):
        response = self.client.get("/api/v1.0/dataset/giops/votemper/depths")

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 52
        assert "all" in map(lambda d: d["id"], data)
        assert "All Depths" in map(lambda d: d["value"], data)

    def test_depths_excludes_all(self):
        response = self.client.get(
            "/api/v1.0/dataset/giops/votemper/depths", params={"include_all_key": False}
        )

        data = response.json()

        assert response.status_code == 200
        assert len(data) == 51
        assert "all" not in map(lambda d: d["id"], data)

    def test_scale(self) -> None:
        response = self.client.get("/api/v1.0/scale/giops/votemper/-5,30")

        assert response.status_code == 200

    def test_range(self) -> None:
        response = self.client.get(
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

        assert response.status_code == 200
        assert response.json() == approx(expected)

    def test_timestamps_endpoint_sqlite(self):
        response = self.client.get("/api/v1.0/dataset/nemo_sqlite3/votemper/timestamps")
        data = json.loads(response.content)

        assert response.status_code == 200
        assert len(data) == 2
        assert data[0]["id"] == 2031436800
        assert data[0]["value"] == "2014-05-17T00:00:00+00:00"

    def test_timestamps_endpoint_xarray(self):

        response = self.client.get("/api/v1.0/dataset/giops/votemper/timestamps")
        data = json.loads(response.content)

        assert response.status_code == 200
        assert len(data) == 2
        assert data[0]["id"] == 2031436800
        assert data[0]["value"] == "2014-05-17T00:00:00+00:00"

    def test_colormaps_endpoint(self):
        response = self.client.get("/api/v1.0/plot/colormaps")
        data = json.loads(response.content)

        assert response.status_code == 200
        assert {"id": "temperature", "value": "Temperature"} in data

    def test_colormaps_image_endpoint(self):
        response = self.client.get("/api/v1.0/plot/colormaps.png")

        assert response.status_code == 200

    def test_class4_query_endpoint(self):
        response = self.client.get("/api/v1.0/class4")

        response.status_code == 200

    def test_class4_models_endpoint(self):
        response = self.client.get(
            "/api/v1.0/class4/models/ocean_predict"
            "?id=class4_20190102_GIOPS_CONCEPTS_2.3_profile"
        )

        assert response.status_code == 200

    def test_class4_file_endpoint(self):
        response = self.client.get(
            "/api/v1.0/class4/ocean_predict?projection=EPSG:3857"
            "&resolution=9784"
            "&extent=-15936951,1567587,4805001,12398409"
            "&id=class4_20200101_GIOPS_TEST_profile"
        )

        assert response.status_code == 200

    def test_subset_endpoint(self):

        response = self.client.get(self.api_links["subset"])

        assert response.status_code == 200

    @patch("plotting.map")
    def test_plot_map_endpoint(self, patch_plotter):
        patch_plotter.return_value = None

        response = self.client.get(self.api_links["plot_map"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_map_csv"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_map_quiver_len_mag"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_map_quiver_no_mag"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_map_quiver_color_mag"])
        assert response.status_code == 200

    @patch("plotting.transect")
    def test_plot_transect_endpoint(self, patch_plotter):
        patch_plotter.return_value = None

        response = self.client.get(self.api_links["plot_transect"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_transect_depth_limit"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_transect_csv"])
        assert response.status_code == 200

    def test_plot_timeseries_endpoint(self):

        response = self.client.get(self.api_links["plot_timeseries"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_timeseries_all_depths"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_timeseries_bottom"])
        assert response.status_code == 200

    def test_plot_ts_endpoint(self):

        response = self.client.get(self.api_links["plot_ts"])
        assert response.status_code == 200

    def test_plot_sound_endpoint(self):
        # sound (point, Speed of Sound)
        # IndexError: list index out of range
        response = self.client.get(self.api_links["plot_sound"])
        assert response.status_code == 200

    def test_plot_profile_endpoint(self):
        # profile (point, profile)
        response = self.client.get(self.api_links["plot_profile"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_profile_multi_variable"])
        assert response.status_code == 200

    def test_plot_hovmoller_endpoint(self):
        # hovmoller (line, Hovmöller Diagram)
        response = self.client.get(self.api_links["plot_hovmoller"])
        assert response.status_code == 200

        response = self.client.get(self.api_links["plot_hovmoller_bottom"])
        assert response.status_code == 200

    def test_plot_observation_endpoint(self):
        response = self.client.get(self.api_links["plot_observation"])
        assert response.status_code == 200

    @patch("utils.misc.list_kml_files")
    def test_kml_query_endpoint(self, patch_kml_files):
        patch_kml_files.return_value = ["file_1", "file_2", "file_3"]

        # response for each type of query
        response = []
        response.append(self.client.get("/api/v1.0/kml/points"))
        response.append(self.client.get("/api/v1.0/kml/lines"))
        response.append(self.client.get("/api/v1.0/kml/areas"))
        for resp in response:
            assert resp.status_code == 200

    @patch("utils.misc._get_kml")
    def test_kml_file_endpoint(self, patch_kml):
        patch_kml.return_value = MagicMock(), None
        response = []

        # points
        response.append(
            self.client.get(
                "/api/v1.0/kml/points/AZMP_Stations?projection=EPSG:3857"
                "&view_bounds=-15936951,1567587,4805001,12398409"
            )
        )
        # lines
        response.append(
            self.client.get(
                "/api/v1.0/kml/lines/AZMP%20Transects?projection=EPSG:3857"
                "&view_bounds=-15936951,1567587,4805001,12398409"
            )
        )
        # areas
        response.append(
            self.client.get(
                "/api/v1.0/kml/areas/AZMP_NL_Region_Analysis_Areas?projection=EPSG:3857"
                "&resolution=9784&view_bounds=-15936951,1567587,4805001,12398409"
            )
        )

        for resp in response:
            assert resp.status_code == 200

    @patch("routes.api_v1_0._cache_and_send_img")
    @patch("plotting.tile.plot")
    def test_tile_endpoint(self, patch_tile, patch_cache_img):
        patch_tile.return_value = None
        patch_cache_img.return_value = None
        response = self.client.get(
            "/api/v1.0/tiles/giops_real/votemper/2212704000/0/6/50/40"
            "?projection=EPSG:3857&scale=-5,30&interp=gaussian&radius=25&neighbours=10"
        )

        assert response.status_code == 200

    @patch("routes.api_v1_0._cache_and_send_img")
    @patch("plotting.tile.plot")
    def test_topo_endpoint(self, patch_tile, patch_cache_img):
        patch_tile.return_value = None
        patch_cache_img.return_value = None
        response = self.client.get(
            "/api/v1.0/tiles/topo/6/52/41?shaded_relief=false&projection=EPSG:3857"
        )

        assert response.status_code == 200

    @patch("routes.api_v1_0._cache_and_send_img")
    @patch("plotting.tile.plot")
    def test_bath_endpoint(self, patch_tile, patch_cache_img):
        patch_tile.return_value = None
        patch_cache_img.return_value = None
        response = self.client.get("api/v1.0/tiles/bath/6/56/41?projection=EPSG:3857")

        assert response.status_code == 200

    def test_mbt_endpoint(self):
        response = self.client.get("/api/v1.0/mbt/lands/7/105/77?projection=EPSG:3857")

        assert response.status_code == 200

    @patch("data.observational.queries.get_datatypes")
    def test_observation_datatypes(self, patch_get_datatypes):
        patch_get_datatypes.return_value = [PropertyMock(key="mykey")]
        patch_get_datatypes.return_value[0].name = "myname"
        response = self.client.get(self.api_links["observation_datatypes"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data[0] == {"id": "mykey", "value": "myname"}

    @patch("data.observational.queries.get_meta_keys")
    def test_observation_meta_keys(self, patch_get_meta_keys):
        patch_get_meta_keys.return_value = ["this is a test"]
        response = self.client.get(self.api_links["observation_meta_keys"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data[0] == "this is a test"

    @patch("data.observational.queries.get_meta_values")
    def test_observation_meta_values(self, patch_get_meta_values):
        patch_get_meta_values.return_value = ["this is a test"]
        response = self.client.get(self.api_links["observation_meta_values"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data[0] == "this is a test"

    @patch("data.observational.queries.get_stations")
    def test_observation_track(
        self,
        patch_get_stations,
    ):
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
        response = self.client.get(self.api_links["observation_point"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data["features"]) == 1
        assert data["features"][0]["geometry"]["coordinates"] == [0, 0]

    @patch("sqlalchemy.orm.session.Session.query")
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

        response = self.client.get(self.api_links["observation_variables"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data) == 2
        assert data[0] == {"id": 0, "value": "variable0"}
        assert data[1] == {"id": 1, "value": "variable1"}

    @patch("sqlalchemy.orm.session.Session.query")
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

        response = self.client.get(self.api_links["observation_tracktimerange"])

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data["min"] == "2010-01-01T00:00:00"
        assert data["max"] == "2020-01-01T00:00:00"

    @patch("sqlalchemy.orm.session.Session.query")
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

        response = self.client.get(self.api_links["observation_meta"])
        data = json.loads(response.content)
        query_return.get.assert_called_with("123")
        assert data == {
            "Platform Type": "platform_type",
            "attr0": "attribute0",
            "attr1": "attribute1",
        }
