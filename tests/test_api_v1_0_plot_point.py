from routes.api_v1_0 import plot_v1_0
from oceannavigator import create_app
import hashlib
import json
import unittest
from flask import Response, Flask
from unittest import mock
import json
import base64
import os
import data
import requests
import routes
from urllib.parse import urlencode
import hashlib
from PIL import Image

def geturl(query):
    request = "/api/v1.0/plot/?" + urlencode({"query": json.dumps(query)})
    return request

#
# This Class Tests various different point plot requests
#
class TestPointPlot(unittest.TestCase):

    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()


    #
    # Tests API request with no data
    #
    @unittest.expectedFailure
    def test_missing_data(self):
        
        resp = self.app.get('/api/v1.0/plot/')
        self.assertEqual(resp.status_code, 400)    #Error Response

    #
    #Tests API request with invalid data
    #
    @unittest.expectedFailure
    def test_invalid_data(self):

        resp = self.app.get('/api/v1.0/plot/?YOURDOINGITWRONG')
        self.assertEqual(resp.status_code, 400)

    #
    # Tests API request with invalid syntax
    #
    def test_invalid_syntax(self):

        resp = self.app.get('/api/v1.0/plot/this/is/invalid')
        self.assertEqual(resp.status_code, 404)
    
    #
    # Tests Basic Plot Near NL
    #
    def test_basic_plot(self):

        tests = ['profile','ts','sound','stick']

        query = {
          "dataset": "giops_day",
          "names": ['48.0617, -52.1835'],
          "plotTitle": "",
          "quantum": "day",
          "showmap": True,
          "station": [[48.061661591087045, -52.18353271484376, None]],
          "time": '2018-07-27T00:00:00+00:00',
          "type": "profile",
          "variable": ['votemper'],
        }
        
        for t in tests:
            query['type'] = t
            resp = self.app.get(geturl(query))
            self.assertEqual(resp.status_code, 200)

        #Virtual Mooring
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": '2018-07-26T00:00:00+00:00',
            "names": ['72.9496, -63.0786'],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": '2018-07-25T00:00:00+00:00',
            "station": [[72.94961270957928, -63.078625054251745, None]],
            "type": "timeseries",
            "variable": "votemper",
        }
        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code,200)

    #
    # Tests Arctic Plot
    #
    @unittest.expectedFailure
    def test_arctic_plot(self):

        tests = ['profile','ts','sound','stick']
        query = {
            "dataset": "giops_day",
            "names": [],
            "plotTitle": "",
            "quantum": "day",
            "showmap": True,
            "station": [[86.84066959725412, -178.1067972143287]],
            "time": '2018-07-26T00:00:00+00:00',
            "type": "profile",
            "variable": ['votemper'],
        }

        for t in tests:
            
            query['type'] = t
            resp = self.app.get(geturl(query))
            self.assertEqual(resp.status_code, 200)

    #
    # Tests Antarctic Plot
    #
    @unittest.expectedFailure
    def test_antarctic_plot(self):

        tests = ['profile','ts','sound','stick']
        query = {
            "dataset": "giops_day",
            "names": [],
            "plotTitle": "",
            "quantum": "day",
            "showmap": True,
            "station": [[-85.70033363867887, -40.994686406996074]],
            "time": '2018-07-26T00:00:00+00:00',
            "type": "profile",
            "variable": ['votemper'],
        }

        for t in tests:
            query['type'] = t
            resp = self.app.get(geturl(query))
            self.assertEqual(resp.status_code, 200)
    
    
    
    #def test_plot_point_arctic(self):
    #def test_plot_point_antarctic(self):

    def test_basic_plot_valid(self):

        tests = {
            'profile': 'f0e221192bf9c5c9d81d3a4d20643188',
            'ts': '7504b6177a685141b781bacf24b1e8f4',
            'sound': '8ee455835c35c643adde8a3d463336d7',
            'stick': '03f3c02edc80b50c315e8a6226e90e27'
        }
        query = {
          "dataset": "giops_day",
          "names": ['48.0617, -52.1835'],
          "plotTitle": "",
          "quantum": "month",
          "showmap": True,
          "station": [[48.061661591087045, -52.18353271484376, None]],
          "time": '2018-07-27T00:00:00+00:00',
          "type": "profile",
          "variable": ['votemper'],
        }
        
        for t in tests:
            query['type'] = t
            resp = self.app.get(geturl(query))
            
            print("RESPONSE")
            print(resp)
        
            #self.assertEqual(m.hexdigest(), tests[t])
            
        #Virtual Mooring
        query = {
            "colormap": "default",
            "dataset": "giops_day",
            "depth": 0,
            "endtime": '2018-07-26T00:00:00+00:00',
            "names": ['72.9496, -63.0786'],
            "plotTitle": "",
            "quantum": "day",
            "scale": "-5,30,auto",
            "showmap": True,
            "starttime": '2018-07-25T00:00:00+00:00',
            "station": [[72.94961270957928, -63.078625054251745, None]],
            "type": "timeseries",
            "variable": "votemper",
        }
        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code,200)
