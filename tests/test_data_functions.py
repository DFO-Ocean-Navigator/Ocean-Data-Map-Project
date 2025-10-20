#!/usr/bin/env python

import unittest

import numpy as np
import xarray as xr

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

        np.testing.assert_allclose(actual, expected, rtol=self.relative_tolerance)

    def test_sspeed(self):
        np.testing.assert_allclose(
            funcs.sspeed(xr.Variable(data=[0], dims=["depth"]), [45], [0.5], [32]),
            1447.4,
            rtol=self.relative_tolerance,
        )

        dep = np.array(range(0, 10))
        lat = np.array([[45, 45], [45, 45]])
        temp = 0.5 * np.ones((10, 2, 2))
        sal = 32 * np.ones((10, 2, 2))

        np.testing.assert_allclose(
            funcs.sspeed(dep, lat, temp, sal)[0, 0, 0],
            1447.4,
            rtol=self.relative_tolerance,
        )

    # @unittest.skip("Failing")
    def test_deepsoundchannel(self):
        self.assertEqual(
            funcs.deepsoundchannel(
                xr.Variable(data=[0], dims=["depth"]), [45], [0.5], [32]
            ),
            0,
        )

    # @unittest.skip("IndexError: tuple index out of range")
    def test_soniclayerdepth(self):
        ds = xr.open_dataset("tests/testdata/giops_test.nc")
        self.assertTrue(np.all(np.isnan(funcs.soniclayerdepth(
                ds.depth, ds.latitude[0],ds.votemper[0, :, :2, :2],ds.vosaline[0, :, :2, :2]
            ))))
