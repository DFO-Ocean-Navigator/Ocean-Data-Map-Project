#!/usr/bin/env python

import unittest
from unittest.mock import patch

import numpy as np
import xarray as xr

import data.calculated_parser.parser


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
            self.assertEqual(
                parser.parse(case[0], None, None, None),
                case[1],
                msg='Equation: "%s"' % case[0],
            )

    def test_constants(self):
        parser = data.calculated_parser.parser.Parser()
        cases = [
            ["pi", np.pi],
            ["e", np.e],
        ]

        for case in cases:
            self.assertEqual(
                parser.parse(case[0], None, None, None),
                case[1],
                msg='Equation: "%s"' % case[0],
            )

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
            self.assertAlmostEqual(
                parser.parse(case[0], None, None, None),
                case[1],
                msg='Equation: "%s"' % case[0],
            )

    def test_syntax_error_in_expr_raises(self):
        parser = data.calculated_parser.parser.Parser()

        cases = ["atan2(0,)", "atan2()", "atan2(,0)"]

        for case in cases:
            with self.assertRaises(SyntaxError):
                parser.parse(case, None, None, None)

    def test_syntax_full_depth(self):
        parser = data.calculated_parser.parser.Parser()

        cases = [["[votemper] - 273.15", (50, 5, 5)], ["[deptht]", (50,)]]

        with xr.open_dataset("tests/testdata/nemo_test.nc") as ds:
            for case in cases:
                result = parser.parse(
                    case[0],
                    ds,
                    (0, slice(0, 5), slice(0, 5)),
                    ["time_counter", "y", "x"],
                )

                self.assertEqual(result.shape, case[1])
