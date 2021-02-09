"""Unit tests for data.class4 module.
"""
import unittest
import os
from pathlib import Path
import shutil

import numpy
import xarray

import data.class4
import oceannavigator


app = oceannavigator.create_app(testing=True)


class TestListClass4Models(unittest.TestCase):

    def setUp(self):
        self.test_data = Path("testdata")
        self.class4_test_data = Path("class4/2020/20201208")
        (self.test_data/self.class4_test_data).mkdir(parents=True)
        test_files = (
            "class4_20201208_FOAM_orca025_14.1_profile.nc",
            "class4_20201208_GIOPS_CONCEPTS_3.0_profile.nc",
        )
        for f in test_files:
            (self.test_data / self.class4_test_data/f).touch()

    def tearDown(self):
        shutil.rmtree(self.test_data/self.class4_test_data.parents[1])

    def test_list_class4_models(self):
        app.config["CLASS4_PATH"] = os.fspath(self.test_data/self.class4_test_data.parents[1])
        class4_id = "class4_20201208_GIOPS_CONCEPTS_3.0_profile_541"
        with app.app_context():
            result = data.class4.list_class4_models(class4_id)
        self.assertEqual(result, [{"id": "class4_20201208_FOAM_orca025_14.1_profile", "value": "FOAM"}])


class TestListClass4Forecasts(unittest.TestCase):

    def setUp(self):
        self.test_data = Path("testdata")
        self.class4_test_data = Path("class4/2020/")
        (self.test_data/self.class4_test_data).mkdir(parents=True, exist_ok=True)
        modeljuld = xarray.DataArray(
            numpy.array([25915.5]*10),
            attrs={"units": "Days since 1950-01-01 00:00:00 utc"}
        )
        xarray.Dataset({"modeljuld": modeljuld}).to_netcdf(
            self.test_data / self.class4_test_data / "class4_20201214_GIOPS_CONCEPTS_3.0_profile.nc",
        )


    def tearDown(self):
        shutil.rmtree(self.test_data/self.class4_test_data.parents[1])

    def test_list_class4_forecasts_1_forecast_date(self):
        app.config["CLASS4_FNAME_PATTERN"] = f"{self.test_data/self.class4_test_data.parents[0]}/%s/%s.nc"
        class4_id = "class4_20201214_GIOPS_CONCEPTS_3.0_profile_541"
        with app.app_context():
            result = data.class4.list_class4_forecasts(class4_id)
        self.assertEqual(result, [{"id": "best", "name": "Best Estimate"}])
