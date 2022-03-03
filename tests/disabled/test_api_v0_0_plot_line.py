import base64
import hashlib
import json
import os
import unittest
from unittest import mock
from urllib.parse import urlencode

import requests
from flask import Flask, Response

import data
import routes
from oceannavigator import create_app
from routes.api_v1_0 import plot_v1_0


def geturl(query):
    request = "/plot/?" + urlencode({"query": json.dumps(query)})
    return request


#
# This Class Tests various different point plot requests
#
class TestLinePlot(unittest.TestCase):
    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()

    #
    # Tests Basic Plot Near NL
    #
    def test_basic_plot(self):

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
            "time": "820",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": 867,
            "path": [
                [57.194401443709836, -58.68743896484375],
                [46.329965491227455, -45.94329833984375],
            ],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": 866,
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

    #
    # Tests Arctic Plot
    #
    @unittest.expectedFailure
    def test_arctic_plot(self):

        tests = ["transect", "hovmoller"]

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
            "time": "820",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": 867,
            "path": [[81, -142], [82, 43]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": 866,
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

    #
    # Tests Antarctic Plot
    #
    @unittest.expectedFailure
    def test_antarctic_plot(self):

        tests = ["transect", "hovmoller"]
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
            "time": "820",
            "type": "transect",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": 867,
            "path": [[80, -128], [79, 54]],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": 866,
            "type": "hovmoller",
            "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)
