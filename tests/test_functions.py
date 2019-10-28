#!/usr/bin/env python

import numpy as np


class TestFunctions(unittest.TestCase):

    #def test_sspeed(self):
        
    
    def test_sscp_point(self):
        test_array = np.array[1434.08,1435.48,1436.10,1435.16,1433.01,1432.80,1432.54,1432.75,1433.20,1434.92,1435.81]
        test_max = 11

        test_result = sscp_point(test_array, test_max)
        self.assertEqual(test_result, 0)

    #def test_sscp(self):


    #def test_soundchannelaxis(self):


    #def test_soniclayerdepth(self):


    #def test_criticaldepth(self):


    #def test_depthexcess(self):


    
        
