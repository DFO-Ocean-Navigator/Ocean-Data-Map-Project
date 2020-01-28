#!/usr/bin/env python

import unittest

import numpy as np

import data.calculated_parser.functions as funcs


class TestDataFunctions(unittest.TestCase):

    def setUp(self):
        self.relative_tolerance: float = 1e-3

    def test_max(self):
        actual = funcs.max([[1, 2, 3], [4, 5, 6]])

        self.assertEqual(actual, 6)

    def test_min(self):
        actual = funcs.min([[1, 2, 3], [4, 5, 6]])

        self.assertEqual(actual, 1)

    def test_magnitude(self):
        actual = funcs.magnitude(np.array([3, 3, 3]), np.array([1, 1, 1]))
        expected = np.array([3.162278, 3.162278, 3.162278])

        np.testing.assert_allclose(
            actual, expected, rtol=self.relative_tolerance)
