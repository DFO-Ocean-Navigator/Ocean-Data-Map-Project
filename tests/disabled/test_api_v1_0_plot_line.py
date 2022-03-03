import json
import unittest
from urllib.parse import urlencode

from oceannavigator import create_app
from routes.api_v1_0 import plot_v1_0


# Tests Transect and Hovmoller plot requests.
# We only are considering the status code
# of the responses. Not the validity of
# the data returned.
class TestLinePlot(unittest.TestCase):
    def geturl(self, query: str):
        request = "/api/v1.0/plot/?" + urlencode({"query": json.dumps(query)})
        return request

    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()

    # Checks global projection
    def test_global_projection(self):

        # Transect plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth_limit": False,
            "linearthresh": 200,
            "path": [
                [57.99507897448629, -52.62298583984375],
                [43.41023307594466, -47.6913769206096],
            ],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "selectedPlots": "0,1,1",
            "showmap": True,
            "surfacevariable": "none",
            "time": "2018-07-26T00:00:00+00:00",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)

        # Hovmoller plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": "2018-07-26T00:00:00+00:00",
            "path": [
                [57.194401443709836, -58.68743896484375],
                [46.329965491227455, -45.94329833984375],
            ],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": "2018-07-25T00:00:00+00:00",
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)

    # Arctic
    @unittest.expectedFailure
    def test_arctic_plot(self):

        # Transect plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth_limit": False,
            "linearthresh": 200,
            "path": [[81, -142], [82, 43]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "selectedPlots": "0,1,1",
            "showmap": True,
            "surfacevariable": "none",
            "time": "2018-07-26T00:00:00+00:00",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)

        # Hovmoller plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": "2018-07-26T00:00:00+00:00",
            "path": [[81, -142], [82, 43]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": "2018-07-25T00:00:00+00:00",
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)

    # Check Antarctic
    @unittest.expectedFailure
    def test_antarctic_plot(self):

        # Transect plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth_limit": False,
            "linearthresh": 200,
            "path": [[80, -128], [79, 54]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "selectedPlots": "0,1,1",
            "showmap": True,
            "surfacevariable": "none",
            "time": "2018-07-26T00:00:00+00:00",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)

        # Hovmoller plot
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": "2018-07-26T00:00:00+00:00",
            "path": [[80, -128], [79, 54]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": "2018-07-25T00:00:00+00:00",
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(self.geturl(query))
        self.assertEqual(resp.status_code, 200)
