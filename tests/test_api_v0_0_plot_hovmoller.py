from routes.api_v1_0 import plot_v1_0
from oceannavigator import create_app
from flask import Response, Flask
from unittest import mock
from urllib.parse import urlencode
from oceannavigator.dataset_config import __get_dataset_config, get_datasets, get_variables
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

import hashlib
import json
import unittest
import base64
import os
import data
import requests
import routes
import warnings
import sys



def geturl(query):
    request = "/plot/?" + urlencode({"query": json.dumps(query)})
    return request

class SetUpTest:

    variable_num = 0

    def basic(self):
        data = {
            'datasets': ['giops_day'],
            'variables': {'giops_day':['votemper', 'vosaline']}
        }
        self.variable_num = 2
        return data

    def thorough(self):
        
            self.app = create_app()
            with self.app.app_context():

                datasets = get_datasets()
                variables = {}
                
                for dataset in datasets:
                    dataset_var = get_variables(dataset)
                    self.variable_num += len(dataset_var)
                    variables.update({dataset: dataset_var})

                print(self.variable_num)

                data = {
                    'datasets': datasets,
                    'variables': variables
                }
                print(data)
                return data
    def get_var_num(self):
        return self.variable_num

#
# This Class Tests various different point plot requests
#
class TestLinePlot(unittest.TestCase):

    test_data = None
    variable_num = 0
    total_vars = 0
    total_vars_num = 0

    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()
        test_config = SetUpTest()

        #Suppressing Unclosed File Warnings
        warnings.simplefilter("ignore", ResourceWarning)
        warnings.simplefilter("ignore", UserWarning)
        warnings.simplefilter("ignore", DeprecationWarning)

        test_level = sys.argv.pop()

        if test_level == 'thorough':
            print("\n\nTEST LEVEL : THOROUGH")
            print("WARNING : THIS MAY TAKE SEVERAL HOURS\n\n")
            self.test_data = test_config.thorough()
        else:
            print("\n\nTEST LEVEL : BASIC\n\n")
            self.test_data = test_config.basic()

        self.variable_num = test_config.get_var_num()
        self.total_vars_num = self.variable_num * 8


    #
    # Tests Basic Hovmoller Plot
    #
    def test_basic_plot(self):
        
        print("BASIC PLOT - TESTING")
        test_data = self.test_data

        query = {
          "colormap": "default",
          "dataset": "giops_day",
          "depth": 0,
          "endtime": 867,
          "path": [[57.194401443709836, -58.68743896484375], [46.329965491227455, -45.94329833984375]],
          "plotTitle": "",
          "quantum": "day",
          "scale": "-5,30,auto",
          "showmap": True,
          "starttime": '866',
          "type": "hovmoller",
          "variable": "votemper",
        }

        for dataset in test_data['datasets']:
            if dataset != 'gem':
                var = 0
                query['dataset'] = dataset
                #print("\n dataset: " + dataset)
                for variable in test_data['variables'][dataset]:
                    #print(".", end="", flush=True)
                    query['variable'] = variable
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_velocity' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':

                            resp = self.app.get(geturl(query))
                            #self.assertEqual(resp.status_code, 200)

                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1

        print("PASSED")


    #
    # Tests Arctic Plot
    #
    #@unittest.expectedFailure
    def test_arctic_plot(self):

        print("ARCTIC PLOT - TESTING")
        test_data = self.test_data

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
          "starttime": '866',
          "type": "hovmoller",
          "variable": "votemper",
        }

        for dataset in test_data['datasets']:
            if dataset != 'gem':
                var = 0
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:
                    query['variable'] = variable
                    with self.app:


                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_velocity' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':

                            resp = self.app.get(geturl(query))
                            #self.assertEqual(resp.status_code, 200)

                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1

        print("PASSED")
                        

    #
    # Tests Antarctic Plot
    #
    #@unittest.expectedFailure
    def test_antarctic_plot(self):

        print("ANTARCTIC PLOT - TESTING")
        test_data = self.test_data

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
          "starttime": '866',
          "type": "hovmoller",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:
                    query['variable'] = variable
                    with self.app:


                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_velocity' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':

                            resp = self.app.get(geturl(query))
                            #self.assertEqual(resp.status_code, 200)

                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1

        print("PASSED")