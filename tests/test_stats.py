#!/usr/bin/env python3

import os
from unittest.mock import patch, Mock
import json
import unittest as ut
import numpy as np
from oceannavigator.backend.stats import calculate_stats
from oceannavigator import DatasetConfig, create_app
from data.nemo import Nemo
from data.fvcom import Fvcom
from data.mercator import Mercator
class TestStats(ut.TestCase):
    
    def __init__(self, *args, **kwargs):
        super(TestStats, self).__init__(*args, **kwargs)
        self.app = create_app()

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()


    def tearDown(self):
        self.ctx.pop()    
        
    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_calculate_stats_nemo_objects(self, m):
        self.maxDiff = None
        m.return_value = {
            "nemo_test": {
                "enabled": True,
                "url": "tests/testdata/nemo_test.nc",
                "climatology": "my_climatology",
                "name": "my_name",
                "help": "my_help",
                "quantum": "my_quantum",
                "attribution": "my_<b>attribution</b>",
                "cache": "123",
                "variables": {
                    "var": {
                        'name': 'Votemper',
                        'unit': 'Unknown',
                        'depth': 0
                    }
                }
            },
        }
 
        actual_stats = calculate_stats("nemo_test",["votemper"] ,
                                        0, 0, [{'innerrings': [], 'name': '','polygons': [[[10.19576, -150], [3.7473257, -149],[7.23073, -156.75], [5.242669, -151], [16.995157, -159]]]}])


        expected_stats = json.dumps(
        {'votemper': 
        {'sampled_points': 551, 'mean': 300.35822, 'min': 298.98459, 
        'max': 301.56079, 'variance': 0.4083, 'skewness': 0.09385, 
        'kurtosis': -0.87988, 'standard_dev': 0.63899, 'median': 300.30933,
         'name': 'Votemper', 'unit': 'Unknown', 'depth': 0}}
        )
        self.assertEqual(actual_stats, expected_stats)


    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_calculate_stats_fvcom_objects(self, m):
        self.maxDiff = None
        m.return_value = {
            "fvcom_test": {
                "enabled": True,
                "url": "tests/testdata/fvcom_test.nc",
                "climatology": "my_climatology",
                "name": "my_name",
                "help": "my_help",
                "quantum": "my_quantum",
                "attribution": "my_<b>attribution</b>",
                "cache": "123",
                "variables": {
                    "var": {
                        'name': 'Temp',
                        'unit': 'Unknown',
                        'depth': 0
                    }
                }
            },
        }
 
        actual_stats = calculate_stats("fvcom_test",["temp"] ,
                                        0, 0, [{'innerrings': [], 'name': '',
                                        'polygons': [[[45.324795, -63.75647],[45.341003, -64.12836],[45.330425, -63.618347],[45.2799, -63.89319],[45.35497, -63.3981]]]}])


        expected_stats = json.dumps({'temp': {'sampled_points': 18, 'mean': 7.06212, 'min': 6.7758, 
        'max': 7.34315, 'variance': 0.01679, 'skewness': 0.08368, 'kurtosis': 0.17614, 
        'standard_dev': 0.12958, 'median': 7.02687, 'name': 'Temp', 'unit': 'Unknown', 'depth': 0}}
)
      
        self.assertEqual(actual_stats, expected_stats)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_calculate_stats_mercator_objects(self, m):
        self.maxDiff = None
        m.return_value = {
            "mercator_test": {
                "enabled": True,
                "url": "tests/testdata/mercator_test.nc",
                "climatology": "my_climatology",
                "name": "my_name",
                "help": "my_help",
                "quantum": "my_quantum",
                "attribution": "my_<b>attribution</b>",
                "cache": "123",
                "variables": {
                    "var": {
                        'name': 'temp',
                        'unit': 'Unknown',
                        'depth': 0
                    }
                }
            },
        }
 
        actual_stats = calculate_stats("mercator_test",["votemper"] ,
                                        0, 0, [{'innerrings': [], 'name': '',
                                        'polygons': [[[51.83577, -43.49267], [47.51720, -48.23877],
                                         [46.19504, -38.21923], [50.90303, -35.84619], [51.83577, -43.49267]]]}])


        expected_stats = json.dumps( {'votemper': {'sampled_points': 1087, 'mean': 83.20888, 'min': 0.0, 'max': 276.125, 
        'variance': 15760.31641, 'skewness': 0.84501, 'kurtosis': -1.28577, 'standard_dev': 125.5401, 'median': 0.0,
         'name': 'Votemper', 'unit': 'Unknown', 'depth': 0}})

      
        self.assertEqual(actual_stats, expected_stats)

    