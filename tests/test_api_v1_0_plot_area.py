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

def geturl(query):
    request = "/api/v1.0/plot/?" + urlencode({"query": json.dumps(query)})
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
          "path": [[57.99507897448629, -52.62298583984375], [43.41023307594466, -47.6913769206096]],
          "plotTitle": "",
          "quantum": "day",
          "scale": "-5,30,auto",
          "selectedPlots": "0,1,1",
          "showmap": True,
          "surfacevariable": "none",
          "time": '2018-07-26T00:00:00+00:00',
          "type": "transect",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)
        
    #
    # Tests Arctic Plot
    # Sinle Quadrant
    #
    def test_arctic_plot_single_quadrant(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[70.61599666750213, -132.48690912244984], [76.33225862899116, -162.6089605518461], [84.74968635370459, -121.23323854769576], [75.15953587228074, -100.95402112796245], [70.61599666750213, -132.48690912244984]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:32661",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

    #
    # Tests Arctic Plot
    # All 4 Quadrants near pole
    #
    def test_arctic_plot_coverPole(self):
        
        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[81.9641869418678, -133.6425517966064], [82.11743931633454, 135.86305129514767], [82.67199662955888, 45.34981083477634], [82.78990487718798, -46.8784673479203], [81.9641869418678, -133.6425517966064]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:32661",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)

    #
    # Test Arctic Plot
    # Entire Map
    #
    def test_arctic_plot_fullPage(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[57.11339105173794, -132.47947058574835], [56.61203448644936, 132.90545629119978], [60.17446632157565, 54.64271180479035], [59.72661157286756, -54.263248927685616], [57.11339105173794, -132.47947058574835]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:32661",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)



    #
    # Tests Antarctic Plot
    # Single Quadrant
    #
    def test_antarctic_plot_singleQuadrant(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[-85.85028882090575, -39.76266439190479], [-74.93765711817481, -10.310127834772654], [-67.91777986984644, -46.242015910188734], [-74.12193655478347, -75.61829643434633], [-85.85028882090575, -39.76266439190479]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:3031",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)
    
    #
    # Tests Antarctic Plot
    # Pole Covered
    #
    def test_antarctic_plot_coverPole(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[-75.62422320523663, -39.28601952893509], [-75.13422316699835, 43.14268901535596], [-75.65066621622204, 129.2753475005572], [-77.28252964129544, -134.93946274708324], [-75.62422320523663, -39.28601952893509]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:3031",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)


    #
    # Tests Antarctic Plot
    # Full Map
    #
    def test_antarctic_plot_fullPage(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[-54.566783409368874, -48.036019835037585], [-54.66719048575525, 48.06451402538198], [-57.11884003157999, 125.80658230401663], [-57.418019528611666, -126.68054845147387], [-54.566783409368874, -48.036019835037585]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:3031",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)


    #
    # Tests Plot across international dateline
    #
    def test_plot_acrossDateline(self):

        query = {
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[48.28525379709447, -203.64551749789578], [48.72020809096932, -148.83137396159498], [27.569833237584163, -148.83137396159498], [27.569833237584163, -202.9890606890778], [48.28525379709447, -203.64551749789578]]]}],
          "bathymetry": True,
          "colormap": "default",
          "contour": {'colormap': 'default', 'hatch': False, 'legend': True, 'levels': 'auto', 'variable': 'none'},
          "dataset": "giops_day",
          "depth": 0,
          "interp": "gaussian",
          "neighbours": 10,
          "projection": "EPSG:3857",
          "quiver": {'colormap': 'default', 'magnitude': 'length', 'variable': 'none'},
          "radius": 25,
          "scale": "-5,30,auto",
          "showarea": True,
          "time": '2018-07-26T00:00:00+00:00',
          "type": "map",
          "variable": "votemper",
        }

        resp = self.app.get(geturl(query))
        self.assertEqual(resp.status_code, 200)