"""Unit tests for data.netcdf_data."""

import datetime
import json
import os
import shutil
import unittest
from unittest.mock import patch

import cftime
import netCDF4
import numpy
import pytest
import pytz
import xarray

from data.netcdf_data import NetCDFData


class TestNetCDFData(unittest.TestCase):
    with open("tests/testdata/datasetconfigpatch.json") as dataPatch:
        patch_dataset_config_ret_val = json.load(dataPatch)

    @pytest.fixture(scope="class", autouse=True)
    def setUp_teardown(self):
        # with open("tests/testdata/datasetconfigpatch.json") as dataPatch:
        #     self.patch_dataset_config_ret_val = json.load(dataPatch)

        ds = xarray.Dataset(
            {
                "votemper": xarray.DataArray(
                    data=numpy.random.rand(4, 4, 4, 4),
                    dims=["depth", "latitude", "longitude", "time"],
                    coords={
                        "depth": (
                            ["depth"],
                            [4.94025e-01, 1.54138e00, 2.64567e00, 3.81949e00],
                        ),
                        "latitude": (["latitude"], [-80.0, -79.8, 89.6, 89.8]),
                        "longitude": (
                            ["longitude"],
                            [2.000e-01, 4.000e-01, 3.594e02, 3.598e02],
                        ),
                        "time": (
                            ["time"],
                            [2.211494e09, 2.211581e09, 2.211667e09, 2.211754e09],
                        ),
                    },
                    attrs={
                        "units": "Kelvin",
                        "long_name": "Sea water potential temperature",
                        "valid_min": 173.0,
                        "valid_max": 373.0,
                    },
                ),
            }
        )

        if not (os.path.exists("tests/testdata/giops_test.zarr")):
            ds.to_zarr("tests/testdata/giops_test.zarr")

        yield
        if os.path.exists("tests/testdata/giops_test.zarr"):
            shutil.rmtree("tests/testdata/giops_test.zarr")

    def test_init(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        self.assertEqual(nc_data.url, "tests/testdata/nemo_test.nc")
        self.assertEqual(nc_data.interp, "gaussian")
        self.assertEqual(nc_data.radius, 25000)
        self.assertEqual(nc_data.neighbours, 10)
        self.assertIsNone(nc_data.dataset)
        self.assertIsNone(nc_data._variable_list)
        self.assertEqual(nc_data._grid_angle_file_url, "")
        self.assertIsNone(nc_data._time_variable)
        self.assertFalse(nc_data._dataset_open)
        self.assertEqual(nc_data._dataset_key, "")
        self.assertIsNone(nc_data._dataset_config)
        self.assertIsNone(nc_data._nc_files)

    def test_enter_nc_files_list(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        nc_data._nc_files = ["tests/testdata/nemo_test.nc"]
        nc_data.__enter__()
        self.assertIsInstance(nc_data.dataset, xarray.Dataset)
        self.assertTrue(nc_data._dataset_open)

    def test_enter_zarr_file(self):
        nc_data = NetCDFData("tests/testdata/giops_test.zarr")
        nc_data.url = "tests/testdata/giops_test.zarr"
        nc_data.__enter__()
        self.assertIsInstance(nc_data.dataset, xarray.Dataset)
        self.assertTrue(nc_data._dataset_open)

    @unittest.skip(
        "Format of tests/testdata/fvcom_tests.nc causes "
        "ValueError: MFNetCDF4 only works with NETCDF3_* and NETCDF4_CLASSIC formatted"
        "files, not NETCDF4"
    )
    def test_enter_nc_files_list_fvcom(self):
        nc_data = NetCDFData("tests/testdata/fvcom_test.nc")
        nc_data._nc_files = ["tests/testdata/fvcom_test.nc"]
        nc_data.__enter__()
        self.assertIsInstance(nc_data.dataset, xarray.Dataset)
        self.assertTrue(nc_data._dataset_open)

    def test_enter_no_nc_files_list(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertIsInstance(nc_data.dataset, xarray.Dataset)
            self.assertTrue(nc_data._dataset_open)

    def test_enter_no_nc_files_list_fvcom(self):
        with NetCDFData("tests/testdata/fvcom_test.nc") as nc_data:
            self.assertIsInstance(nc_data.dataset, netCDF4.Dataset)
            self.assertTrue(nc_data._dataset_open)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_enter_url_list(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        urls = [
            "https://salishsea.eos.ubc.ca/erddap/griddap/ubcSSg3DuGridFields1hV21-11",
            "https://salishsea.eos.ubc.ca/erddap/griddap/ubcSSg3DvGridFields1hV21-11",
        ]
        kwargs = {"dataset_key": "salishseacast_currents"}
        with NetCDFData(urls, **kwargs) as nc_data:
            self.assertIsInstance(nc_data.dataset, xarray.Dataset)
            self.assertTrue(nc_data._dataset_open)
            self.assertIn("uVelocity", nc_data.dataset.variables)
            self.assertIn("vVelocity", nc_data.dataset.variables)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_enter_no_geo_ref(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        kwargs = {"dataset_key": "giops"}
        with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
            self.assertIsInstance(nc_data.dataset, xarray.Dataset)
            self.assertTrue(nc_data._dataset_open)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_enter_geo_ref(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        kwargs = {"dataset_key": "salishseacast_ssh"}
        with NetCDFData(
            "tests/testdata/salishseacast_ssh_test.nc", **kwargs
        ) as nc_data:
            self.assertIsInstance(nc_data.dataset, xarray.Dataset)
            self.assertTrue(nc_data._dataset_open)
            self.assertIn("latitude", nc_data.dataset.variables)
            self.assertNotIn("bathymetry", nc_data.dataset.variables)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_enter_geo_ref_no_drop_variables(self, patch_get_dataset_config):
        geo_ref = self.patch_dataset_config_ret_val["salishseacast_ssh"]["geo_ref"]
        with patch.dict(geo_ref, {"url": geo_ref["url"], "drop_variables": []}):
            patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

            kwargs = {"dataset_key": "salishseacast_ssh"}
            with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
                self.assertIsInstance(nc_data.dataset, xarray.Dataset)
                self.assertTrue(nc_data._dataset_open)
                self.assertIn("latitude", nc_data.dataset.variables)
                self.assertIn("bathymetry", nc_data.dataset.variables)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_enter_grid_angle_file(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        kwargs = {
            "dataset_key": "salishseacast_ssh",
            "grid_angle_file_url": "tests/testdata/grid_angle_salishsea_201702.nc",
        }
        with NetCDFData(
            "tests/testdata/salishseacast_ssh_test.nc", **kwargs
        ) as nc_data:
            self.assertIsInstance(nc_data.dataset, xarray.Dataset)
            self.assertTrue(nc_data._dataset_open)
            self.assertIn("alpha", nc_data.dataset.variables)
            self.assertIn("cos_alpha", nc_data.dataset.variables)
            self.assertIn("sin_alpha", nc_data.dataset.variables)

    def test_exit(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertTrue(nc_data._dataset_open)
        self.assertFalse(nc_data._dataset_open)

    def test_timestamp_to_time_index_int_timestamp(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            result = nc_data.timestamp_to_time_index(2031436800)
            self.assertEqual(result, 0)

    def test_timestamp_to_time_index_timestamp_list(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            result = nc_data.timestamp_to_time_index([2031436800, 2034072000])
            numpy.testing.assert_array_equal(result, numpy.array([0, 1]))

    def test_timestamp_to_iso_8601_int_timestamp(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            result = nc_data.timestamp_to_iso_8601(2031436800)
            self.assertEqual(result, cftime.real_datetime(2014, 5, 17, tzinfo=pytz.UTC))

    def test_timestamp_to_iso_8601_timestamp_list(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            result = nc_data.timestamp_to_iso_8601([2031436800, 2034072000])
            expected = [
                cftime.real_datetime(2014, 5, 17, tzinfo=pytz.UTC),
                cftime.real_datetime(2014, 6, 16, 12, tzinfo=pytz.UTC),
            ]
            self.assertEqual(result, expected)

    def test_convert_to_timestamp_str(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            date_formatted = nc_data.convert_to_timestamp("2014-06-16T12:00:00Z")
            self.assertEqual(date_formatted, 1)

    @unittest.skip("TypeError: cant subtract offset-naive and offset-aware datetimes")
    def test_convert_to_timestamp_list(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            date_formatted = nc_data.convert_to_timestamp(
                "2014-05-17T00:00:00Z, 2014-06-16T12:00:00Z"
            )
            expected = {" 2014-06-16T12:00:00Z": 1, "2014-05-17T00:00:00Z": 0}
            self.assertEqual(date_formatted, expected)

    @patch("data.netcdf_data.format_date")
    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_subset_issue769_1d_lons_lats(
        self, patch_get_dataset_config, patch_format_date
    ):
        """Confirm that the 1d lons and lats arrays condition that causes subset()
        to raise a ValueError has been fixed.
        """
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        # Avoid the need for a Flask app context because format_date is from flask_babel
        patch_format_date.return_value = 19700101
        kwargs = {"dataset_key": "mercator_test"}
        with NetCDFData("tests/testdata/mercator_test.nc", **kwargs) as nc_data:
            query = dict(
                [
                    ("output_format", "NETCDF3_NC"),
                    ("dataset", "mercator_test"),
                    ("variables", "votemper"),
                    ("min_range", "-79.0,2.0"),
                    ("max_range", "-78.0,3.0"),
                    ("time", "2119651200,2119651200"),
                    ("should_zip", "0"),
                ]
            )
            nc_data.subset(query)
            # No assertion because the fixed code doesn't raise an exception

    @patch("data.netcdf_data.format_date")
    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_subset_issue769_dims_do_not_exist(
        self, patch_get_dataset_config, patch_format_date
    ):
        """Confirm that the unknown dimensions arrays names condition that causes subset()
        to raise a ValueError has been fixed.
        """
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        # Avoid the need for a Flask app context because format_date is from flask_babel
        patch_format_date.return_value = 19700101
        kwargs = {"dataset_key": "giops"}
        with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
            query = dict(
                [
                    ("output_format", "NETCDF3_NC"),
                    ("dataset", "giops"),
                    ("variables", "votemper"),
                    ("min_range", "1.0,-160.0"),
                    ("max_range", "2.0,-161.0"),
                    ("time", "2031436800,2031436800"),
                    ("should_zip", "0"),
                ]
            )
            nc_data.subset(query)
            # No assertion because the fixed code doesn't raise an exception

    def test_mercator_latlon_variables(self):
        with NetCDFData("tests/testdata/mercator_test.nc") as nc_data:
            lat, lon = nc_data.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lat.attrs["standard_name"], "latitude")

            self.assertEqual(lon.attrs["long_name"], "Longitude")
            self.assertEqual(lon.attrs["standard_name"], "longitude")

    def test_nemo_latlon_variables(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            lat, lon = nc_data.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lon.attrs["long_name"], "Longitude")

    def test_latlon_variables_not_found_raises(self):
        # Use salishseacast_ssh_test.nc here because it has neither nav_lat nor
        # latitude variables
        with NetCDFData("tests/testdata/salishseacast_ssh_test.nc") as nc_data:
            with self.assertRaises(KeyError):
                lat, lon = nc_data.latlon_variables

    def test_xarray_variables(self):
        with NetCDFData("tests/testdata/mercator_test.nc") as nc_data:
            variables = nc_data.variables

            self.assertEqual(variables[0].key, "votemper")
            self.assertEqual(variables[0].name, "Sea water potential temperature")
            self.assertEqual(variables[0].unit, "Kelvin")
            self.assertEqual(
                set(variables[0].dimensions),
                {"depth", "time", "latitude", "longitude"}
            )

            self.assertEqual(variables[0].valid_min, 173.0)
            self.assertEqual(variables[0].valid_max, 373.0)

    def test_xarray_dimensions(self):
        with NetCDFData("tests/testdata/mercator_test.nc") as nc_data:
            self.assertEqual(
                {"depth", "time", "latitude", "longitude"}, set(nc_data.dimensions)
            )

    def test_zarr_xarray_variables(self):
        with NetCDFData("tests/testdata/giops_test.zarr") as nc_data:
            variables = nc_data.variables

            self.assertEqual(variables[0].key, "votemper")
            self.assertEqual(variables[0].name, "Sea water potential temperature")
            self.assertEqual(variables[0].unit, "Kelvin")
            self.assertEqual(
                variables[0].dimensions, ["depth", "latitude", "longitude", "time"]
            )
            self.assertEqual(variables[0].valid_min, 173.0)
            self.assertEqual(variables[0].valid_max, 373.0)

    def test_zarr_xarray_dimensions(self):
        with NetCDFData("tests/testdata/giops_test.zarr") as nc_data:
            self.assertEqual(
                ["depth", "latitude", "longitude", "time"], nc_data.dimensions
            )

    def test_fvcom_variables(self):
        with NetCDFData("tests/testdata/fvcom_test.nc") as nc_data:
            variables = nc_data.variables

            self.assertEqual(variables[3].key, "temp")
            self.assertEqual(variables[3].name, "temperature")
            self.assertEqual(variables[3].unit, "degrees_C")
            self.assertEqual(
                variables[3].dimensions, ("time", "maxStrlen64", "node", "siglay")
            )
            self.assertIsNone(variables[3].valid_min)
            self.assertIsNone(variables[3].valid_max)

    def test_fvcom_dimensions(self):
        with NetCDFData("tests/testdata/fvcom_test.nc") as nc_data:
            self.assertEqual(
                ["time", "maxStrlen64", "node", "siglay"], nc_data.dimensions
            )

    def test_variable_list_cached(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertIsNone(nc_data._variable_list)
            variables = nc_data.variables
            self.assertEqual(nc_data._variable_list, variables)

    def test_y_dimensions(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertEqual({"y", "yc", "latitude", "gridY"}, nc_data.y_dimensions)

    def test_x_dimensions(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertEqual({"x", "xc", "longitude", "gridX"}, nc_data.x_dimensions)

    def test_yx_dimensions(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            y_coord, x_coord = nc_data.yx_dimensions
            self.assertEqual("y", y_coord)
            self.assertEqual("x", x_coord)

    def test_timestamps(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertEqual(len(nc_data.timestamps), 2)
            self.assertEqual(
                nc_data.timestamps[0],
                datetime.datetime(2014, 5, 17, 0, 0, 0, 0, pytz.UTC),
            )

            # Property is read-only
            with self.assertRaises(AttributeError):
                nc_data.timestamps = []

            # List is immutable
            with self.assertRaises(ValueError):
                nc_data.timestamps[0] = 0

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_get_nc_file_list_not_sqlite3(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        kwargs = {"dataset_key": "giops"}
        with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
            self.assertIsNone(nc_data._nc_files)

    @patch("data.netcdf_data.DatasetConfig._get_dataset_config")
    def test_get_nc_file_list_no_dataset_config_url(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val

        kwargs = {"dataset_key": "giops_no_url"}
        with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
            nc_data.get_nc_file_list(nc_data._dataset_config)
            self.assertIsNone(nc_data._nc_files)

    def test_get_dataset_variable_returns_dataarray(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            res = nc_data.get_dataset_variable("votemper")

            self.assertEqual(xarray.DataArray, type(res))

    def test_get_dataset_variable_raises_on_unknown_variable(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            with self.assertRaises(KeyError):
                nc_data.get_dataset_variable("fake_variable")

    def test_interpolate_raises_on_unknown_interp_method(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            nc_data.interp = "fake_method"
            with self.assertRaises(ValueError):
                nc_data.interpolate(None, None, None)
