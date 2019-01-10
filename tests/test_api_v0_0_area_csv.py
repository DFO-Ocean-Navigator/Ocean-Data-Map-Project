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
import numpy as np
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


def geturl(query):
        request = "/plot/?" + urlencode({"query": json.dumps(query)}) + "&" + urlencode({"format":"csv"})
        return request



class SetUpTest:

    variable_num = 0

    def basic(self):
        data = {
            'datasets': ['giops_day'],
            'variables': {'giops_day':['votemper']}
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
        #Suppressing Unclosed File Warning in basemap.py line 40,76
        warnings.simplefilter("ignore", ResourceWarning)
        warnings.simplefilter("ignore", UserWarning)
        warnings.simplefilter("ignore", DeprecationWarning)
        warnings.simplefilter("ignore", ImportError)


        test_level = sys.argv.pop()
        del sys.argv[1]
        if test_level == 'thorough':
            print("\n\nTEST LEVEL : THOROUGH")
            print("WARNING : THIS MAY TAKE SEVERAL HOURS\n\n")
            self.test_data = test_config.thorough()
        else:
            print("\n\nTEST LEVEL : BASIC\n\n")
            self.test_data = test_config.basic()

        self.variable_num = test_config.get_var_num()
        self.total_vars_num = self.variable_num * 8
        
    
    # TESTED - WORKING
    #
    # Tests Basic Plot Near NL
    #
    def test_basic_plot(self):

        print("\nBASIC PLOT - TESTING")
        test_data = self.test_data

        query = {
          "colormap": "default",
          "dataset": "giops_day",
          "depth_limit": False,
          "linearthresh": 200,
          "area": [{'innerrings': [], 'name': '', 'polygons': [[[70.61599666750213, -132.48690912244984], [76.33225862899116, -162.6089605518461], [84.74968635370459, -121.23323854769576], [75.15953587228074, -100.95402112796245], [70.61599666750213, -132.48690912244984]]]}],
          "plotTitle": "",
          "quantum": "day",
          "scale": "-5,30,auto",
          "selectedPlots": "0,1,1",
          "showmap": True,
          "surfacevariable": "none",
          "time": '820',
          "type": "map",
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
                            
                            #print(geturl(query))
                            resp = self.app.get(geturl(query))
                        
                            requested_data = resp.get_data()#.decode("utf-8")
                            
                            saved_data = np.fromfile('tests/testdata//basic_area.txt')
                            print(saved_data)
                            print(requested_data)
                            requested_data = np.loadtxt(requested_data, dtype=float, comments='#', delimiter=",",skiprows=3)
                            print(requested_data)

                            #with open('tests/testdata/basic_area.txt', 'rb') as file:
                                #file.write(csv_data)
                                #print(file.read())
                             #   file_contents = file.read()
                                #print(file_contents)
                              #  file_contents = np.fromstring(file_contents, dtype=np.float32, sep=",")
                                #print(file_contents)
                               # self.assertEqual(file.read(), csv_data)
                             
                            self.assertEqual(resp.status_code, 200)
                            
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1


        
        print("PASSED")

    '''
    # TESTED - WORKING
    #
    # Tests Arctic Plot
    # Single Quadrant
    #
    def test_arctic_plot_single_quadrant(self):
        print("\nARCTIC SINGLE QUADRANT - TESTING")
        test_data = self.test_data
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
            "time": '820',
            "type": "map",
            "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':    
                query['dataset'] = dataset
                for variable in test_data['variables'][dataset]:
                    query['variable'] = variable
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            print(geturl(query))
                            resp = self.app.get(geturl(query))
                            
                            print(resp)
                            
                            self.assertEqual(resp.status_code, 200)     #Confirms response was received
                            
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
        print("PASSED")
    
    
    #
    # Tests Arctic Plot
    # All 4 Quadrants near pole
    #
    def test_arctic_plot_coverPole(self):
        
        print("\nARCTIC COVERING POLE - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':

                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            
                            print(geturl(query))
                            resp = self.app.get(geturl(query))
                            
                            print(resp)

                            self.assertEqual(resp.status_code, 200)
                            
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
        
        print("PASSED")
    
    #
    # Test Arctic Plot
    # Entire Map
    #
    def test_arctic_plot_fullPage(self):
        print("\nARTIC FULL PAGE - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            print(get_url(query))
                            resp = self.app.get(geturl(query))

                            print(resp)

                            self.assertEqual(resp.status_code, 200)

                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
                        
        print("PASSED")
    
    #
    # Tests Antarctic Plot
    # Single Quadrant
    #
    def test_antarctic_plot_singleQuadrant(self):

        print("\nANTARCTIC SINGLE QUADRANT - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            print(get_url(query))
                            resp = self.app.get(geturl(query))
                            
                            print(resp)

                            self.assertEqual(resp.status_code, 200)
                        
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
        print("PASSED")
    
    #
    # Tests Antarctic Plot
    # Pole Covered
    #
    def test_antarctic_plot_coverPole(self):
        print("\nANTARCTIC COVERING POLE - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",

          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            print(get_url(query))
                            resp = self.app.get(geturl(query))
                            
                            print(resp)
                            
                            self.assertEqual(resp.status_code, 200)
                            
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1

        print("PASSED")
    
    #
    # Tests Antarctic Plot
    # Full Map
    #
    def test_antarctic_plot_fullPage(self):
        print("\nANTARCTIC FULL PAGE - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            
                            print(geturl(query))
                            resp = self.app.get(geturl(query))
                            print(resp.raw)
                            print(resp)
                            
                            self.assertEqual(resp.status_code, 200)
                            
                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
        
        print("PASSED")
    
    
    #
    # Tests Plot across international dateline
    #
    def test_plot_acrossDateline(self):
        print("\nACROSS DATELINE - TESTING")
        test_data = self.test_data
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
          "time": '820',
          "type": "map",
          "variable": "votemper",
        }
        var = 0
        for dataset in test_data['datasets']:
            if dataset != 'gem':
                query['dataset'] = dataset
                
                for variable in test_data['variables'][dataset]:

                    query['variable'] = variable
                    
                    with self.app:
                        if variable != 'wind_stress_east_vel' and variable != 'wind_stress_north_vel' and variable != 'aice' and variable != 'vice' and variable != 'u-component_of_wind_height_above_ground' and variable != 'v-component_of_wind_height_above_ground':
                            resp = self.app.get(geturl(query))
                            self.assertEqual(resp.status_code, 200)

                            plotter = MapPlotter(dataset, query, 'json')
                            plot = plotter.prepare_plot(size=None, dpi=None)
                            self.assertEqual(plot.shape, ((248,500))) # Confirms correct shape

                            var += 1
                            self.__class__.total_vars += 1
                            print("Total: " + str(round(self.__class__.total_vars / int(self.__class__.total_vars_num) * 100, 2)) + "% | Current: " + str(round((var / int(self.variable_num) * 100), 2)) + "%      | " + "dataset: " + dataset + " | variable: " + variable + " |         ",end='\r')
                        else:
                            var += 1
                            self.__class__.total_vars += 1
        
        print("PASSED")
    '''