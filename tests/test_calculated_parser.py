import unittest
import data.calculated_parser.parser
import data.calculated_parser.functions as cfn
import numpy as np


class TestCalculatedParser(unittest.TestCase):

    def test_arithmetic(self):
        parser = data.calculated_parser.parser.Parser()
        cases = [
            ["1+1", 2],
            ["1 + 1", 2],
            ["1 - 2", -1],
            ["2 * 3", 6],
            ["1 + 2 * 2", 5],
            ["3 ^ 2", 9],
            ["(1+1)^3", 8],
            ["2 + 3 ^ 4", 83],
            ["(2 + 3) ^ 4", 625],
        ]

        for case in cases:
            self.assertEqual(parser.parse(case[0], None, None, None), case[1],
                    msg="Equation: \"%s\"" % case[0])


    def test_constants(self):
        parser = data.calculated_parser.parser.Parser()
        cases = [
            ["pi", np.pi],
            ["e", np.e],
        ]

        for case in cases:
            self.assertEqual(parser.parse(case[0], None, None, None), case[1],
                    msg="Equation: \"%s\"" % case[0])

    def test_functions(self):
        parser = data.calculated_parser.parser.Parser()
        cases = [
            ["sin(0)", 0],
            ["sin(pi)", 0],
            ["sin(pi/2)", 1],
            ["cos(0)", 1],
            ["cos(pi)", -1],
            ["cos(pi/2)", 0],
            ["log(10)", 1],
            ["log(100)", 2],
            ["log2(2)", 1],
            ["log2(256)", 8],
            ["ln(e)", 1],
            ["atan2(0, 0)", 0],
        ]

        for case in cases:
            self.assertAlmostEqual(parser.parse(case[0], None, None, None), case[1],
                    msg="Equation: \"%s\"" % case[0])

    def test_sspeed(self):
        self.assertAlmostEqual(cfn.sspeed(0, 45, 0.5, 32), 1447.4, 1)

        dep = range(0, 10)
        lat = np.array([[45, 45], [45, 45]])
        temp = 0.5 * np.ones((10, 2, 2))
        sal = 32 * np.ones((10, 2, 2))
        self.assertAlmostEqual(cfn.sspeed(dep, lat, temp, sal)[0, 0, 0], 1447.4, 1)

        
