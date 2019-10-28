#!/usr/bin/env python
import unittest
import numpy as np
from data.calculated_parser.functions import *


class TestFunctions(unittest.TestCase):

    #def test_sspeed(self):
        
    
    def test_sscp_point(self):
        test_array = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        test_max = 13

        test_result = sscp_point(test_array, test_max)
        self.assertEqual(test_result, 0)

    #def test_sscp(self):


    def test_find_sca_idx(self):
        test_array = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        
        test_result = find_sca_idx(test_array)
        self.assertEqual(test_result, 6)


    def test_find_sld_idx(self):
        test_array = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6

        test_result = find_sld_idx(sca_idx, test_array)
        self.assertEqual(test_result, 2)


    def test_find_cd_idx(self):
        test_array = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6
        sld_idx = 2

        test_result = find_cd_idx(sca_idx, sld_idx, test_array)
        self.assertEqual(test_result, 10)

    def test_cd_interpolation(self):

        test_array = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        cd_idx = 10
        sld_idx = 2

        test_result = cd_interpolation(cd_idx, sld_idx, test_array, depth)
        self.assertEqual(test_result, 10)
    #def test_soundchannelaxis(self):


    #def test_soniclayerdepth(self):


    #def test_criticaldepth(self):


    #def test_depthexcess(self):


    
        
