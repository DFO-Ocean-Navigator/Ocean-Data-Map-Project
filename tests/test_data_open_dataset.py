#!/usr/bin/env python

import unittest

from data import open_dataset
from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo


class TestOpenDataset(unittest.TestCase):

    def test_open_dataset_returns_nemo_object(self):

        with open_dataset('tests/testdata/nemo_test.nc') as ds:
            self.assertTrue(isinstance(ds, Nemo))

    def test_open_dataset_returns_mercator_object(self):
        with open_dataset('tests/testdata/mercator_test.nc') as ds:
            self.assertTrue(isinstance(ds, Mercator))

    def test_open_dataset_returns_fvcom_object(self):
        with open_dataset('tests/testdata/fvcom_test.nc') as ds:
            self.assertTrue(isinstance(ds, Fvcom))
