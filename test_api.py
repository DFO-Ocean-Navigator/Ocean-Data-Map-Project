#!/usr/bin/env python

import datetime
import json
import pytest
import unittest
import sys
from unittest.mock import MagicMock, PropertyMock, patch
from fastapi.testclient import TestClient

import routes.enums as e
from oceannavigator import create_app
from oceannavigator.settings import get_settings

client = TestClient(create_app(testing=True))
settings = get_settings()
with open("tests/testdata/endpoints.json") as endpoints:
    api_links = json.load(endpoints)


def test_git_info() -> None:
    response = client.get("/api/v1.0/git_info")

    assert response.status_code == 200


def test_generate_script() -> None:
    for lang in e.ScriptLang:
        for script_type in e.ScriptType:

            response = client.get(
                "/api/v1.0/generate_script",
                params={"query": "", "lang": lang, "script_type": script_type},
            )

            assert response.status_code == 200


def test_datasets() -> None:
    response = client.get("/api/v1.0/datasets")

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 7


def test_dataset() -> None:
    response = client.get("/api/v1.0/dataset/giops")

    data = response.json()

    assert response.status_code == 200
    assert data["id"] == "giops"
    assert data["quantum"] == "day"


def test_quantum() -> None:
    response = client.get("/api/v1.0/dataset/giops")

    data = response.json()

    assert response.status_code == 200
    assert data["quantum"] == "day"


def test_quantum_returns_404_when_dataset_not_found() -> None:
    response = client.get("/api/v1.0/dataset/asdf")

    assert response.status_code == 404


def test_variables() -> None:
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

    assert response.status_code == 200
    assert response.json() == expected


def test_variables_depth_only() -> None:
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

    assert response.status_code == 200
    assert expected == response.json()


def test_variables_vectors_only() -> None:
    response = client.get(
        "/api/v1.0/dataset/giops/variables", params={"vectors_only": True}
    )

    expected = []

    assert response.status_code == 200
    assert response.json() == expected


def test_variables_returns_404_when_dataset_not_found() -> None:
    response = client.get("/api/v1.0/dataset/asdf/variables")

    assert response.status_code == 404
    assert "asdf" in response.json()["message"]


def test_depths_includes_all_by_default():
    response = client.get("/api/v1.0/dataset/giops/votemper/depths")

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 52
    assert "all" in map(lambda d: d["id"], data)
    assert "All Depths" in map(lambda d: d["value"], data)


def test_depths_excludes_all():
    response = client.get(
        "/api/v1.0/dataset/giops/votemper/depths", params={"include_all_key": False}
    )

    data = response.json()

    assert response.status_code == 200
    assert len(data) == 51
    assert "all" not in map(lambda d: d["id"], data)


def test_scale() -> None:
    response = client.get(
        "/api/v1.0/scale/giops/votemper/-5,30")

    assert response.status_code == 200


def test_range() -> None:
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

    assert response.status_code == 200
    assert response.json() == expected


def test_timestamps_endpoint_sqlite():

    response = client.get("/api/v1.0/dataset/nemo_sqlite3/votemper/timestamps")
    data = json.loads(response.content)

    assert response.status_code == 200
    assert len(data) == 2
    assert data[0]["id"] == 2031436800
    assert data[0]["value"] == "2014-05-17T00:00:00+00:00"


def test_timestamps_endpoint_xarray():

    response = client.get("/api/v1.0/dataset/giops/votemper/timestamps")
    data = json.loads(response.content)

    assert response.status_code == 200
    assert len(data) == 2
    assert data[0]["id"] == 2031436800
    assert data[0]["value"] == "2014-05-17T00:00:00+00:00"


def test_colormaps_endpoint():
    response = client.get("/api/v1.0/plot/colormaps")
    data = json.loads(response.content)

    assert response.status_code == 200
    assert {"id": "temperature", "value": "Temperature"} in data


def test_colormaps_image_endpoint():
    response = client.get("/api/v1.0/plot/colormaps.png")

    assert response.status_code == 200


def test_class4_models_endpoint():
    response = client.get(
        "/api/v1.0/class4/models/ocean_predict"
        "?id=class4_20190102_GIOPS_CONCEPTS_2.3_profile"
    )

    assert response.status_code == 200


def test_subset_endpoint():

    response = client.get(api_links["subset"])

    assert response.status_code == 200


def test_plot_map_endpoint():

    response = client.get(api_links["plot_map"])
    assert response.status_code == 200

    response = client.get(api_links["plot_map_csv"])
    assert response.status_code == 200

    response = client.get(api_links["plot_map_quiver_len_mag"])
    assert response.status_code == 200

    response = client.get(api_links["plot_map_quiver_no_mag"])
    assert response.status_code == 200

    response = client.get(api_links["plot_map_quiver_color_mag"])
    assert response.status_code == 200


def test_plot_transect_endpoint():

    response = client.get(api_links["plot_transect"])
    assert response.status_code == 200

    response = client.get(api_links["plot_transect_depth_limit"])
    assert response.status_code == 200

    response = client.get(api_links["plot_transect_csv"])
    assert response.status_code == 200


def test_plot_timeseries_endpoint():

    response = client.get(api_links["plot_timeseries"])
    assert response.status_code == 200

    response = client.get(api_links["plot_timeseries_all_depths"])
    assert response.status_code == 200

    response = client.get(api_links["plot_timeseries_bottom"])
    assert response.status_code == 200


def test_plot_ts_endpoint():

    response = client.get(api_links["plot_ts"])
    assert response.status_code == 200


def test_plot_sound_endpoint():
    # sound (point, Speed of Sound)
    # IndexError: list index out of range
    response = client.get(api_links["plot_sound"])
    assert response.status_code == 200


def test_plot_profile_endpoint():
    # profile (point, profile)
    response = client.get(api_links["plot_profile"])
    assert response.status_code == 200

    response = client.get(api_links["plot_profile_multi_variable"])
    assert response.status_code == 200


def test_plot_hovmoller_endpoint():
    # hovmoller (line, Hovmöller Diagram)
    response = client.get(api_links["plot_hovmoller"])
    assert response.status_code == 200

    response = client.get(api_links["plot_hovmoller_bottom"])
    assert response.status_code == 200


# @unittest.skip("Skipping api/plot/observation.. returning error")
def test_plot_observation_endpoint():
    response = client.get(api_links["plot_observation"])
    assert response.status_code == 200


"""

@unittest.skip("Failing")
def test_query_endpoint():

    # response for each type of query
    response = []
    res.append(client.get("/api/v1.0/points/"))
    res.append(client.get("/api/v1.0/lines/"))
    res.append(client.get("/api/v1.0/areas/"))
    res.append(client.get("/api/v1.0/class4/"))
    for i in range(4):
        assert res[i].status_code, 200)

@unittest.skip("IndexError: list index out of range")
def test_query_id_endpoint():
    response = []

    res.append(client.get("/api/v1.0/areas/2015_VME_Closures.json"))

    res.append(
        client.get(
            "/api/v1.0/class4/class4_20200102_GIOPS_CONCEPTS_3.0_profile.json"
        )
    )

    for i in range(4):
        assert res[i].status_code, 200)

@unittest.skip("IndexError: list index out of range")
def test_query_file_endpoint():
    response = []

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
        assert res[i].status_code, 200)

@unittest.skip("Failing")
def test_tile_endpoint():
    response = client.get(
        "/api/v1.0/tiles/gaussian/25/10/EPSG:3857/giops_real/votemper/2212704000/0/-5,30/6/50/40.png"
    )

    assert response.status_code == 200

@unittest.skip("Failing")
def test_topo_endpoint():
    response = client.get("/api/v1.0/tiles/topo/false/EPSG:3857/6/52/41.png")

    assert response.status_code == 200

@unittest.skip("Failing")
def test_bath_endpoint():
    response = client.get("/api/v1.0/tiles/bath/EPSG:3857/6/56/41.png")

    assert response.status_code == 200

@unittest.skip("Failing")
def test_mbt_endpoint():
    response = client.get("/api/v1.0/mbt/EPSG:3857/lands/7/105/77")

    assert response.status_code == 200

@patch("data.observational.queries.get_datatypes")
def test_observation_datatypes(self, patch_get_datatypes):
    patch_get_datatypes.return_value = [PropertyMock(key="mykey")]
    patch_get_datatypes.return_value[0].name = "myname"
    response = client.get(api_links["observation_datatypes"])

    assert response.status_code == 200
    data = self.__get_response_data(res)
    self.assertDictEqual(data[0], {"id": "mykey", "value": "myname"})

@patch("data.observational.db.session")
@patch("data.observational.queries.get_meta_keys")
def test_observation_meta_keys(self, patch_get_meta_keys, patch_session):
    patch_get_meta_keys.return_value = ["this is a test"]
    response = client.get(api_links["observation_meta_keys"])

    assert response.status_code == 200
    patch_get_meta_keys.assert_called_with(patch_session, ["platform_type"])
    data = self.__get_response_data(res)
    assert data[0], "this is a test")

@patch("data.observational.db.session")
@patch("data.observational.queries.get_meta_values")
def test_observation_meta_values(self, patch_get_meta_values, patch_session):
    patch_get_meta_values.return_value = ["this is a test"]
    response = client.get(api_links["observation_meta_values"])

    assert response.status_code == 200
    patch_get_meta_values.assert_called_with(
        patch_session, ["platform_type"], "key"
    )
    data = self.__get_response_data(res)
    assert data[0], "this is a test")

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
    response = client.get(api_links["observation_track"])

    assert response.status_code == 200
    patch_get_platform_tracks.assert_called_with(
        patch_session, "day", platform_types=["none"]
    )
    data = self.__get_response_data(res)
    assert len(data["features"]), 1)
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
    response = client.get(api_links["observation_point"])

    assert response.status_code == 200
    patch_get_stations.assert_called_with(
        session=patch_session, platform_types=["none"]
    )
    data = self.__get_response_data(res)
    assert len(data["features"]), 1)
    assert [0, 0], data["features"][0]["geometry"]["coordinates"])

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

    response = client.get(api_links["observation_variables"])
    assert response.status_code == 200
    data = self.__get_response_data(res)
    assert len(data), 2)
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

    response = client.get(api_links["observation_tracktimerange"])
    assert response.status_code == 200
    data = self.__get_response_data(res)
    assert data["min"], "2010-01-01T00:00:00")
    assert data["max"], "2020-01-01T00:00:00")

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

    response = client.get(
        api_links["observation_meta"],
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
    pytest.main(["test_api.py"])
