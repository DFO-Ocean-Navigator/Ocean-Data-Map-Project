#!/usr/bin/env python
import unittest
import numpy as np
from data.calculated_parser.functions import *


class TestFunctions(unittest.TestCase):

    #def test_sspeed(self):
        
    
    def test_sscp_point(self):
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        test_max = 13

        test_result = sscp_point(sspeed_1, test_max)
        self.assertEqual(test_result, 0)

    #def test_sscp(self):


    def test_find_sca_idx(self):

        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        
        test_result = find_sca_idx(sspeed_1)
        self.assertEqual(test_result, 6)

        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        
        test_result = find_sca_idx(sspeed_2)
        self.assertEqual(test_result, 3)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        
        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 7)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        
        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 6)

    def test_find_sld_idx(self):
        
        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6

        test_result = find_sld_idx(sca_idx, sspeed_1)
        self.assertEqual(test_result, 2)

        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        sca_idx = 3

        test_result = find_sld_idx(sca_idx, sspeed_2)
        self.assertEqual(test_result, 0)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sca_idx = 7

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 0)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        sca_idx = 6

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 3)


    def test_find_cd_idx(self):

        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6
        sld_idx = 2

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_1)
        self.assertEqual(test_result, 10)
        
        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        sca_idx = 3
        sld_idx = 0

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_2)
        self.assertEqual(test_result, 10)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sca_idx = 7
        sld_idx = 0

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 11)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        sca_idx = 6
        sld_idx = 3

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertEqual(test_result, 10)
        

    def test_cd_interpolation(self):
    
        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        cd_idx = 10
        sld_idx = 2
        depth = np.array([0, 10, 30, 60, 100, 150, 210, 280, 360, 460, 560, 670, 790])
        
        test_result = cd_interpolation(cd_idx, sld_idx, sspeed_1, depth)
        self.assertEqual(test_result, 10)
    
        # Testing immediately declining sspeed profile
        #sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        #cd_idx = 10
        #Wsld_idx = 0

        #test_result = cd_interpolation(cd_idx, sld_idx, sspeed_2, depth)
        #self.assertEqual(test_result, 10)

        #sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        #sld_idx = 3
        #cd_idx = 10

        
        #sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        

    def test_soundchannelaxis(self):
        depth = np.array([0, 10, 30, 60, 100, 150, 210, 280, 360, 460, 560, 670, 790])
        lat = 
        temperature = np.array([])
        salinity = np.array([])

        test_result = soundchannelaxis(depth, lat, temperature, salinity)
        self.assertEqual()

    #def test_soniclayerdepth(self):


    #def test_criticaldepth(self):


    #def test_depthexcess(self):


    
        
