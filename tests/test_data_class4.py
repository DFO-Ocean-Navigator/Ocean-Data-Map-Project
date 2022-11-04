"""Unit tests for data.class4 module.
"""
import shutil
from pathlib import Path

import numpy
import pytest
import xarray
from fastapi.testclient import TestClient

import data.class4
from oceannavigator import create_app

app = TestClient(create_app())


class TestListClass4Models:
    @pytest.fixture(scope="class", autouse=True)
    def setup_teardown(self):
        self.test_data = Path("tests/testdata")
        self.class4_test_data = Path("class4/2020/20201208")
        (self.test_data / self.class4_test_data).mkdir(parents=True, exist_ok=True)
        test_files = (
            "class4_20201208_FOAM_orca025_14.1_profile.nc",
            "class4_20201208_GIOPS_CONCEPTS_3.0_profile.nc",
        )
        for f in test_files:
            (self.test_data / self.class4_test_data / f).touch()

        yield
        shutil.rmtree(self.test_data / self.class4_test_data)

    def test_list_class4_models(self):
        class4_id = "class4_20201208_GIOPS_CONCEPTS_3.0_profile_541"
        class4_type = "ocean_predict"
        result = data.class4.list_class4_models(class4_id, class4_type)
        assert result == [
            {"id": "class4_20201208_FOAM_orca025_14.1_profile", "value": "FOAM"}
        ]


class TestListClass4Forecasts:
    @pytest.fixture(scope="class", autouse=True)
    def setup_teardown(self):
        self.test_data = Path("tests/testdata")
        self.class4_test_data = Path("class4/2020/20201214/")
        (self.test_data / self.class4_test_data).mkdir(parents=True, exist_ok=True)
        modeljuld = xarray.DataArray(
            numpy.array([25915.5] * 10),
            attrs={"units": "Days since 1950-01-01 00:00:00 utc"},
        )
        xarray.Dataset({"modeljuld": modeljuld}).to_netcdf(
            self.test_data
            / self.class4_test_data
            / "class4_20201214_GIOPS_CONCEPTS_3.0_profile.nc",
        )

        yield
        shutil.rmtree(self.test_data / self.class4_test_data)

    def test_list_class4_forecasts_1_forecast_date(self):
        class4_id = "class4_20201214_GIOPS_CONCEPTS_3.0_profile_541"
        class4_type = "ocean_predict"
        result = data.class4.list_class4_forecasts(class4_id, class4_type)
        assert result == [{"id": "best", "name": "Best Estimate"}]
