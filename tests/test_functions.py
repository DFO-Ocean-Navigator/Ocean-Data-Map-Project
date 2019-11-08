#!/usr/bin/env python
import unittest
import numpy as np
from data.calculated_parser.functions import *


class TestFunctions(unittest.TestCase):

    #def test_sspeed(self):
        
    
    def test_sscp_point(self):
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        sspeed_5 = np.array([1446.78, 1442.51, 1437.62, 1441.12, 1447.21, 1443.08, 1439.05, 1442.91, 1448.33])
        
        test_max = 13
        test5_max = 9

        result_1 = sscp_point(sspeed_1, test_max)
        result_2 = sscp_point(sspeed_2, test_max)
        result_3 = sscp_point(sspeed_3, test_max)
        result_4 = sscp_point(sspeed_4, test_max)
        result_5 = sscp_point(sspeed_5, test5_max)

        self.assertAlmostEqual(result_1, 0)
        self.assertAlmostEqual(result_2, 0)
        self.assertAlmostEqual(result_3, 0)
        self.assertAlmostEqual(result_4, 0)
        self.assertAlmostEqual(result_5, 1)
        
    #def test_sscp(self):


    def test_find_sca_idx(self):

        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        
        test_result = find_sca_idx(sspeed_1)
        self.assertAlmostEqual(test_result, 6)

        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        
        test_result = find_sca_idx(sspeed_2)
        self.assertAlmostEqual(test_result, 3)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        
        test_result = find_sca_idx(sspeed_3)
        self.assertAlmostEqual(test_result, 7)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        
        test_result = find_sca_idx(sspeed_4)
        self.assertAlmostEqual(test_result, 6)

    def test_find_sld_idx(self):
        
        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6

        test_result = find_sld_idx(sca_idx, sspeed_1)
        self.assertAlmostEqual(test_result, 2)

        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        sca_idx = 3

        test_result = find_sld_idx(sca_idx, sspeed_2)
        self.assertAlmostEqual(test_result, 0)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sca_idx = 7

        test_result = find_sld_idx(sca_idx, sspeed_3)
        self.assertAlmostEqual(test_result, 0)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        sca_idx = 6

        test_result = find_sld_idx(sca_idx, sspeed_4)
        self.assertAlmostEqual(test_result, 3)


    def test_find_cd_idx(self):

        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        sca_idx = 6
        sld_idx = 2

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_1)
        self.assertAlmostEqual(test_result, 10)
        
        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        sca_idx = 3
        sld_idx = 0

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_2)
        self.assertAlmostEqual(test_result, 10)

        # Testing 2 sound channels, single critical depth
        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sca_idx = 7
        sld_idx = 0

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_3)
        self.assertAlmostEqual(test_result, 11)
        
        # Testing 2 sound channels, 2 critical depths
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        sca_idx = 6
        sld_idx = 3

        test_result = find_cd_idx(sca_idx, sld_idx, sspeed_4)
        self.assertAlmostEqual(test_result, 10)
        

    def test_slopeofsomething_point(self):
        sspeed_1 = np.array([1531.3815, 1531.0292, 1527.5515, 1524.2278, 1523.1734, 1522.6060, 1522.1262, 1521.7904, 1521.206, 1520.5105, 1519.8733, 1517.8005, 1514.4107, 1510.7368, 1507.0292, 1503.8638, 1500.0133, 1498.6095, 1498.5553, 1497.4988, 1497.2212])
        depth_1 = np.array([55.7643, 65.8073, 77.8539, 92.3261, 109.729, 130.666, 155.851, 186.26, 222.475, 266.04, 318.127, 380.213, 453.938, 541.089, 643.567, 763.333, 902.339, 1062.339, 1245.29, 1452.25, 1684.28])
        self.assertEqual(len(sspeed_1), len(depth_1))
        test_result_1 = slopeofsomething_point(sspeed_1, depth_1)
        self.assertAlmostEqual(test_result_1, -23.4623)

    @unittest.skip('Test Not Working')
    def test_cd_interpolation(self):
    
        # Testing Typical sspeed profile
        sspeed_1 = np.array([1434.08, 1435.48, 1436.10, 1435.16, 1433.01, 1432.80, 1432.54, 1432.75, 1433.20, 1434.92, 1435.81, 1436.80, 1437.91])
        cd_idx = 10
        sld_idx = 2
        depth = np.array([0, 10, 30, 60, 100, 150, 210, 280, 360, 460, 560, 670, 790])
        
        test_result = cd_interpolation(cd_idx, sld_idx, sspeed_1, depth)
        self.assertEqual(test_result, 10)
    
        # Testing immediately declining sspeed profile
        sspeed_2 = np.array([1436.17, 1435.52, 1434.81, 1433.56, 1433.90, 1434.18, 1434.75, 1435.00, 1435.63, 1435.99, 1436.28, 1436.61, 1437.12])
        cd_idx = 10
        Wsld_idx = 0

        test_result = cd_interpolation(cd_idx, sld_idx, sspeed_2, depth)
        self.assertEqual(test_result, 10)

        sspeed_3 = np.array([1437.32, 1436.70, 1435.45, 1433.97, 1436.16, 1435.27, 1433.81, 1433.11, 1433.79, 1434.98, 1436.29, 1437.16, 1438.12])
        sld_idx = 3
        cd_idx = 10

        
        sspeed_4 = np.array([1435.76, 1434.12, 1434.98, 1436.27, 1434.51, 1433.97, 1433.49, 1433.67, 1435.09, 1435.98, 1436.12, 1437.41, 1438.19])
        
    @unittest.skip('Not Implemented')
    def test_soniclayerdepth(self):
        pass

    @unittest.skip('Not Implemented')
    def test_criticaldepth(self):
        pass

    @unittest.skip('Not Implemented')
    def test_depthexcess(self):
        pass

    
        
