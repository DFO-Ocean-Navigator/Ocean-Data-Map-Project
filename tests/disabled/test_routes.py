import base64
import datetime
import json
import os
import unittest

import mock
import numpy as np
import views
from flask import Response

import data
from oceannavigator import app, misc


class TestRoutes(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()

    def test_plot(self):
        def url(query, f):
            return "/plot/?query=%s&format=%s" % (json.dumps(query), f)

        resp = self.app.get("/plot/")
        self.assertEquals(resp.status_code, 302)

        resp = self.app.get(url({}, "png"))
        self.assertEquals(resp.status_code, 302)

        tests = {
            "map": "MapPlotter",
            "transect": "TransectPlotter",
            "timeseries": "TimeseriesPlotter",
            "ts": "TemperatureSalinityPlotter",
            "sound": "SoundSpeedPlotter",
            "profile": "ProfilePlotter",
            "hovmoller": "HovmollerPlotter",
            "observation": "ObservationPlotter",
            "drifter": "DrifterPlotter",
            "class4": "Class4Plotter",
            "stick": "StickPlotter",
        }

        for t, cls in tests.items():
            with mock.patch.object(views, cls) as m:
                m.return_value = m
                m.run.return_value = ("data", "text/plain", "mock.txt")
                resp = self.app.get(
                    url(
                        {
                            "type": t,
                        },
                        "svg",
                    )
                )

                m.run.assert_called_once()
                self.assertEquals(resp.status_code, 200)

        with mock.patch.object(views, "MapPlotter") as m:
            m.return_value = m
            m.run.return_value = ("data", "text/plain", "mock.txt")
            resp = self.app.get(
                url(
                    {
                        "type": "map",
                    },
                    "json",
                )
            )
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(
                resp.data, '"data:text/plain;base64,%s"' % base64.b64encode("data")
            )

    @mock.patch("oceannavigator.views.plotting.scale.get_scale")
    def test_range(self, m):
        m.return_value = (0, 10)
        resp = self.app.get("/api/range/dataset/proj/1,2,3,4/depth/0/var.json")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        self.assertEquals(json.loads(resp.data), {"min": 0, "max": 10})

    @mock.patch("oceannavigator.misc.get_point_data")
    def test_get_data(self, m):
        m.return_value = "result"
        resp = self.app.get("/api/data/dataset/var/0/depth/0,0.json")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        self.assertEquals(json.loads(resp.data), "result")

    @mock.patch("oceannavigator.views.get_datasets")
    def test_query_datasets(self, m):
        m.return_value = {
            "dataset": {
                "name": "NAME",
                "quantum": "QUANTUM",
                "help": "HELP",
                "attribution": "ATTRIBUTION",
            }
        }
        resp = self.app.get("/api/datasets/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "dataset")
        self.assertEqual(result[0]["value"], "NAME")
        self.assertEqual(result[0]["help"], "HELP")
        self.assertEqual(result[0]["attribution"], "ATTRIBUTION")

    def test_colors(self):
        resp = self.app.get("/api/colors/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEqual(len(result), 8)
        self.assertEqual(result[0]["id"], "k")

        resp = self.app.get("/api/colors/?random=true&none=true")
        self.assertEquals(resp.status_code, 200)
        result = json.loads(resp.data)
        self.assertEqual(len(result), 10)
        self.assertEqual(result[0]["id"], "none")
        self.assertEqual(result[1]["id"], "rnd")

    @mock.patch.dict("plotting.colormap.colormap_names", {"colormap1": "COLORMAP1"})
    def test_colormaps(self, m):
        resp = self.app.get("/api/colormaps/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["id"], "default")
        self.assertEqual(result[1]["id"], "colormap1")
        self.assertEqual(result[1]["value"], "COLORMAP1")

    @mock.patch("plotting.colormap.plot_colormaps")
    def test_colormap_image(self, m):
        m.return_value = "data"
        resp = self.app.get("/colormaps.png")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "image/png")
        self.assertEqual(resp.data, "data")

    def test_query(self):
        resp = self.app.get("/api/fail/")
        self.assertEquals(resp.status_code, 302)
        with mock.patch.object(misc, "list_kml_files") as m:
            m.return_value = "data"

            for url, call in {
                "/api/points/": "point",
                "/api/lines/": "line",
                "/api/areas/": "area",
            }.items():
                resp = self.app.get(url)
                self.assertEquals(resp.status_code, 200)
                self.assertEquals(resp.mimetype, "application/json")
                result = json.loads(resp.data)
                self.assertEqual(result, "data")
                self.assertEqual(m.call_args[0], (call,))

        with mock.patch.object(misc, "list_class4_files") as m:
            m.return_value = "data"
            resp = self.app.get("/api/class4/")
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(resp.mimetype, "application/json")
            result = json.loads(resp.data)
            self.assertEqual(result, "data")
            m.assert_called_once()

    def test_query_file(self):
        resp = self.app.get("/api/fail/proj/0/1,2,3,4/file.json")
        self.assertEquals(resp.status_code, 302)
        for query in [
            "points",
            "lines",
            "areas",
            "class4",
            "drifters",
            "observations",
        ]:
            with mock.patch.object(misc, query) as m:
                m.return_value = "data"
                resp = self.app.get("/api/%s/proj/0/1,2,3,4/file.json" % query)
                self.assertEquals(resp.status_code, 200)
                self.assertEquals(resp.mimetype, "application/json")
                result = json.loads(resp.data)
                self.assertEqual(result, "data")
                m.assert_called_once()
                self.assertEqual(m.call_args[0][0], "file")
                self.assertEqual(m.call_args[0][1], "proj")
                self.assertEqual(m.call_args[0][2], 0)
                self.assertEqual(m.call_args[0][3], "1,2,3,4")

    def test_query_id(self):
        resp = self.app.get("/api/fail/id.json")
        self.assertEquals(resp.status_code, 302)

        with mock.patch.object(misc, "list_areas") as m:
            m.return_value = "data"
            resp = self.app.get("/api/areas/id.json")
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(resp.mimetype, "application/json")
            self.assertEqual(json.loads(resp.data), "data")
            self.assertEqual(m.call_args[0][0], "id")

        with mock.patch.object(misc, "list_class4") as m:
            m.return_value = "data"
            resp = self.app.get("/api/class4/id.json")
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(resp.mimetype, "application/json")
            self.assertEqual(json.loads(resp.data), "data")
            self.assertEqual(m.call_args[0][0], "id")

        with mock.patch.object(misc, "drifter_meta") as m:
            m.return_value = "data"
            resp = self.app.get("/api/drifters/meta.json")
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(resp.mimetype, "application/json")
            self.assertEqual(json.loads(resp.data), "data")

        with mock.patch.object(misc, "observation_meta") as m:
            m.return_value = "data"
            resp = self.app.get("/api/observation/meta.json")
            self.assertEquals(resp.status_code, 200)
            self.assertEquals(resp.mimetype, "application/json")
            self.assertEqual(json.loads(resp.data), "data")

    @mock.patch("oceannavigator.views.get_dataset_url")
    @mock.patch("oceannavigator.views.open_dataset")
    def test_depth(self, open_dataset, get_dataset_url):
        resp = self.app.get("/api/depth/")
        self.assertEquals(resp.status_code, 302)

        resp = self.app.get("/api/depth/?variable=none")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 0)

        open_dataset.return_value = open_dataset
        open_dataset.__enter__.return_value = mock.MagicMock(
            variables={
                "none": mock.MagicMock(dimensions=["x", "y", "depth"]),
            },
            depth_dimensions=["depth"],
            depths=[1, 2, 3, 4, 5],
        )

        resp = self.app.get("/api/depth/?variable=none&dataset=abcd")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 6)
        self.assertEquals(result[0]["id"], "bottom")
        self.assertEquals(result[1]["id"], 0)
        self.assertEquals(result[1]["value"], "1 m")

        resp = self.app.get("/api/depth/?variable=none&dataset=abcd&all=true")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 7)
        self.assertEquals(result[0]["id"], "bottom")
        self.assertEquals(result[1]["id"], "all")

    @mock.patch("oceannavigator.misc.observation_vars")
    def test_observation_variables(self, m):
        m.return_value = ["name1", "name2"]
        resp = self.app.get("/api/observationvariables/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(result[0]["value"], "name1")
        self.assertEquals(result[1]["value"], "name2")

    @mock.patch("oceannavigator.views.get_dataset_climatology")
    @mock.patch("oceannavigator.views.get_dataset_url")
    @mock.patch("oceannavigator.views.open_dataset")
    def test_variables(self, open_dataset, get_dataset_url, get_dataset_climatology):
        resp = self.app.get("/api/variables/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 0)

        variables = [
            mock.MagicMock(),
            mock.MagicMock(),
            mock.MagicMock(),
            mock.MagicMock(),
        ]
        variables[0].configure_mock(
            key="variable",
            name="Variable Name",
            dimensions=["x", "y", "depth", "time"],
            valid_min=0,
            valid_max=10,
        )
        variables[2].configure_mock(
            key="u",
            name="Wind X Speed",
            dimensions=["x", "y", "depth", "time"],
            valid_min=0,
            valid_max=10,
        )
        variables[3].configure_mock(
            key="v",
            name="Wind Y Speed",
            dimensions=["x", "y", "depth", "time"],
            valid_min=0,
            valid_max=10,
        )
        variables = data.data.VariableList(variables)

        open_dataset.return_value = open_dataset
        open_dataset.__enter__.return_value = mock.MagicMock(
            variables=variables,
            depth_dimensions=["depth"],
            depths=[1, 2, 3, 4, 5],
        )

        resp = self.app.get("/api/variables/?dataset=test")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 3)

        resp = self.app.get("/api/variables/?dataset=test&vectors_only=true")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 1)
        self.assertEquals(result[0]["id"], "u,v")
        self.assertEquals(result[0]["value"], "Wind Speed")

        resp = self.app.get("/api/variables/?dataset=test&vectors=true")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 4)

    @mock.patch("plotting.tile.scale")
    def test_scale(self, m):
        m.return_value = "data"
        resp = self.app.get("/scale/dataset/variable/0,10.png")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "image/png")
        self.assertEquals(resp.data, "data")
        self.assertEqual(
            m.call_args[0][0],
            {
                "variable": "variable",
                "dataset": "dataset",
                "scale": "0,10",
            },
        )

    @mock.patch("oceannavigator.views.get_dataset_url")
    @mock.patch("oceannavigator.views.open_dataset")
    def test_timestamps(self, open_dataset, get_dataset_url):
        resp = self.app.get("/api/timestamps/")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 0)

        open_dataset.return_value = open_dataset
        open_dataset.__enter__ = open_dataset
        open_dataset.configure_mock(
            timestamps=[
                datetime.datetime(2017, 4, 1, 0, 0, 0),
                datetime.datetime(2017, 5, 1, 0, 0, 0),
            ]
        )
        resp = self.app.get("/api/timestamps/?dataset=dataset")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 2)
        self.assertEquals(result[0]["id"], 0)
        self.assertEquals(result[0]["value"], "2017-04-01T00:00:00+00:00")

        resp = self.app.get("/api/timestamps/?dataset=dataset&quantum=month")
        self.assertEquals(resp.status_code, 200)
        self.assertEquals(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(len(result), 2)
        self.assertEquals(result[0]["id"], 0)
        self.assertEquals(result[0]["value"], "2017-04-15T00:00:00+00:00")

    @mock.patch("oceannavigator.views._cache_and_send_img")
    @mock.patch("plotting.tile.plot")
    def test_tiles(self, plot, cache_and_send):
        plot.return_value = "data"
        cache_and_send.return_value = Response("", status=200, mimetype="image/png")
        with mock.patch("oceannavigator.views._is_cache_valid") as cache_valid:
            cache_valid.return_value = False
            self.app.get("/tiles/proj/dataset/variable/0/1/scale/2/3/4.png")
            plot.assert_called_once()
            cache_and_send.assert_called_once()
            self.assertEqual(plot.call_args[0][0], "proj")
            self.assertEqual(plot.call_args[0][1], 3)
            self.assertEqual(plot.call_args[0][2], 4)
            self.assertEqual(plot.call_args[0][3], 2)
            self.assertEqual(
                plot.call_args[0][4],
                {
                    "dataset": "dataset",
                    "variable": "variable",
                    "time": 0,
                    "depth": 1,
                    "scale": "scale",
                },
            )

            plot.reset_mock()
            cache_and_send.reset_mock()
            cache_valid.return_value = True
            with mock.patch.object(views, "send_file") as sf:
                sf.return_value = Response("", status=200, mimetype="image/png")
                self.app.get("/tiles/proj/dataset/variable/0/1/scale/2/3/4.png")
                sf.assert_called_once()

            # These shouldn't have gotten called the second time.
            plot.assert_not_called()
            cache_and_send.assert_not_called()

    @mock.patch("oceannavigator.views._cache_and_send_img")
    @mock.patch("plotting.tile.topo")
    def test_topo(self, topo, cache_and_send):
        topo.return_value = "data"
        cache_and_send.return_value = Response("", status=200, mimetype="image/png")
        with mock.patch.object(os.path, "isfile") as isfile:
            isfile.return_value = False
            self.app.get("/tiles/topo/proj/0/1/2.png")
            topo.assert_called_once()
            cache_and_send.assert_called_once()
            self.assertEqual(topo.call_args[0][0], "proj")
            self.assertEqual(topo.call_args[0][1], 1)
            self.assertEqual(topo.call_args[0][2], 2)
            self.assertEqual(topo.call_args[0][3], 0)

            topo.reset_mock()
            cache_and_send.reset_mock()
            isfile.return_value = True
            with mock.patch.object(views, "send_file") as sf:
                sf.return_value = Response("", status=200, mimetype="image/png")
                self.app.get("/tiles/topo/proj/0/1/2.png")
                sf.assert_called_once()

            # These shouldn't have gotten called the second time.
            topo.assert_not_called()
            cache_and_send.assert_not_called()

    @mock.patch("oceannavigator.views._cache_and_send_img")
    @mock.patch("plotting.tile.bathymetry")
    def test_bathymetry(self, bathymetry, cache_and_send):
        bathymetry.return_value = "data"
        cache_and_send.return_value = Response("", status=200, mimetype="image/png")
        with mock.patch.object(os.path, "isfile") as isfile:
            isfile.return_value = False
            self.app.get("/tiles/bath/proj/0/1/2.png")
            bathymetry.assert_called_once()
            cache_and_send.assert_called_once()
            self.assertEqual(bathymetry.call_args[0][0], "proj")
            self.assertEqual(bathymetry.call_args[0][1], 1)
            self.assertEqual(bathymetry.call_args[0][2], 2)
            self.assertEqual(bathymetry.call_args[0][3], 0)

            bathymetry.reset_mock()
            cache_and_send.reset_mock()
            isfile.return_value = True
            with mock.patch.object(views, "send_file") as sf:
                sf.return_value = Response("", status=200, mimetype="image/png")
                self.app.get("/tiles/bath/proj/0/1/2.png")
                sf.assert_called_once()

            # These shouldn't have gotten called the second time.
            bathymetry.assert_not_called()
            cache_and_send.assert_not_called()

    @mock.patch("oceannavigator.views.areastats")
    def test_stats(self, m):
        m.return_value = "[]"
        resp = self.app.get("/stats/")
        self.assertEqual(resp.status_code, 302)

        resp = self.app.get("/stats/?query={}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEqual(len(result), 0)
        m.assert_called_once()

        m.reset_mock()
        resp = self.app.post("/stats/", data={"query": "{}"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEqual(len(result), 0)
        m.assert_called_once()

    @mock.patch("oceannavigator.views.get_dataset_url")
    @mock.patch("oceannavigator.views.open_dataset")
    def test_timestamp(self, open_dataset, get_dataset_url):
        open_dataset.return_value = open_dataset

        mocks = [
            mock.MagicMock(
                timestamps=np.array(
                    [
                        datetime.datetime(2017, 4, 1, 0, 0, 0),
                        datetime.datetime(2017, 0, 1, 0, 0, 0),
                        datetime.datetime(2017, 6, 1, 0, 0, 0),
                    ]
                )
            ),
            mock.MagicMock(
                timestamps=np.array(
                    [
                        datetime.datetime(2017, 2, 1, 0, 0, 0),
                        datetime.datetime(2017, 3, 1, 0, 0, 0),
                        datetime.datetime(2017, 4, 6, 0, 0, 0),
                        datetime.datetime(2017, 5, 1, 0, 0, 0),
                        datetime.datetime(2017, 6, 1, 0, 0, 0),
                    ]
                )
            ),
        ]
        mocks[0].return_value = mocks[0]
        mocks[0].__enter__ = mocks[0]
        mocks[1].return_value = mocks[1]
        mocks[1].__enter__ = mocks[1]
        open_dataset.side_effect = mocks
        resp = self.app.get("/api/timestamp/old/0/new")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "application/json")
        result = json.loads(resp.data)
        self.assertEquals(result, 1)
