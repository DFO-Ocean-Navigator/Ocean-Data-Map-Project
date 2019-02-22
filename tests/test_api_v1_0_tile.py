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
from oceannavigator.dataset_config import __get_dataset_config, get_datasets, get_variables
import warnings
import sys
from flask import current_app
from plotting.transect import TransectPlotter
from plotting.drifter import DrifterPlotter
from plotting.map import MapPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.ts import TemperatureSalinityPlotter
from plotting.sound import SoundSpeedPlotter
from plotting.profile import ProfilePlotter
from plotting.hovmoller import HovmollerPlotter
from plotting.observation import ObservationPlotter
from plotting.class4 import Class4Plotter
from plotting.stick import StickPlotter




#
# This Class Tests various different tile requests
#
class TestLinePlot(unittest.TestCase):

    test_data = None

    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()
        #Suppressing Unclosed File Warning in basemap.py line 40,76
        warnings.simplefilter("ignore", ResourceWarning)
        warnings.simplefilter("ignore", UserWarning)
        warnings.simplefilter("ignore", DeprecationWarning)

    #
    # Testing Colour Tile Request
    #
    def test_colour(self):

        print('Testing Basic Tile')
        
        print(".", end="", flush=True)
        request = '/tiles/v0.1/gaussian/25/10/EPSG:3857/giops_day/votemper/9/0/-5,30/0/colourmap,temperature/4/3/5.png'
        with self.app:
            resp = self.app.get(request)
            self.assertEqual(resp.status_code, 200)
            print("Request OK")
            print("Creating Plot")
                
                #self.assertEqual(plot.shape, ((500,444)))
                #print(type(plot))
                #self.assertEqual(type(plot), 'numpy.ma.core.MaskedArray')
                    
    #
    # Testing Contour Tile Request
    #
    def test_contour(self):

        print('Testing Basic Tile')
        
        print(".", end="", flush=True)
        request = '/api/v1.0/tiles/gaussian/25/10/EPSG:3857/giops_day/votemper/2019-02-10T00:00:00+00:00/0/-13.609136962890602,33.04183349609377/1/contours,default/3/4/2.png'
        
        with self.app:
            resp = self.app.get(request)
            self.assertEqual(resp.status_code, 200)
            print("Request OK")
            print("Creating Plot")
                
                #self.assertEqual(plot.shape, ((500,444)))
                #print(type(plot))
                #self.assertEqual(type(plot), 'numpy.ma.core.MaskedArray')
                    

    #
    # Testing Wind Barbs Tile Request
    #
    def test_barbs(self):

        print('Testing Basic Tile')
        
        print(".", end="", flush=True)
        request = 'http://localhost:5000/api/v1.0/tiles/gaussian/25/10/EPSG:3857/gem/v-component_of_wind_height_above_ground/2019-02-14T00:00:00+00:00/0/-13.609136962890602,33.04183349609377/1/windbarbs,black/5/14/9.png'
        
        with self.app:
            resp = self.app.get(request)
            self.assertEqual(resp.status_code, 200)
            print("Request OK")
            print("Creating Plot")
                
                #self.assertEqual(plot.shape, ((500,444)))
                #print(type(plot))
                #self.assertEqual(type(plot), 'numpy.ma.core.MaskedArray')
                    