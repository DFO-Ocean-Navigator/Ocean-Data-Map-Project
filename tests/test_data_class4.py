"""Unit tests for data.class4 module.
"""
import unittest
from pathlib import Path

import os

import shutil

import data.class4
import oceannavigator


app = oceannavigator.create_app(testing=True)


class TestListClass4Models(unittest.TestCase):

    def setUp(self):
        self.test_data = Path("testdata")
        self.class4_test_data = Path("class4/2020/20201208")
        (self.test_data/self.class4_test_data).mkdir(parents=True)
        test_files = (
            "class4_20201201_FOAM_orca025_14.1_profile.nc",
            "class4_20201201_GIOPS_CONCEPTS_3.0_profile.nc",
        )
        for f in test_files:
            (self.test_data / self.class4_test_data/f).touch()

    def tearDown(self):
        shutil.rmtree(self.test_data/self.class4_test_data.parents[1])

    def test_list_class4_models(self):
        app.config["CLASS4_PATH"] = os.fspath(self.test_data/self.class4_test_data.parents[1])
        class4_id = "class4_20201208_GIOPS_CONCEPTS_3.0_profile_541.nc"
        with app.app_context():
            result = data.class4.list_class4_models(class4_id)
        self.assertEqual(result, [{"id": "class4_20201201_FOAM_orca025_14.1_profile", "value": "FOAM"}])
