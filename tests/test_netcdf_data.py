"""Unit tests for data.netcdf_data.
"""
import datetime
import unittest
from unittest.mock import Mock

import cftime
import netCDF4
import numpy
import pytz
import xarray

from data.netcdf_data import NetCDFData


class TestNetCDFData(unittest.TestCase):
    def test_init(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        self.assertEqual(nc_data.url, "tests/testdata/nemo_test.nc")
        self.assertEqual(nc_data.interp, "gaussian")
        self.assertEqual(nc_data.radius, 25000)
        self.assertEqual(nc_data.neighbours, 10)
        self.assertFalse(nc_data.meta_only)
        self.assertIsNone(nc_data.dataset)
        self.assertIsNone(nc_data._variable_list)
        self.assertEqual(nc_data._nc_files, [])
        self.assertEqual(nc_data._grid_angle_file_url, "")
        self.assertIsNone(nc_data._time_variable)
        self.assertFalse(nc_data._dataset_open)
        self.assertEqual(nc_data._dataset_key, "")
        self.assertIsNone(nc_data._dataset_config)

    def test_enter_meta_only(self):
        kwargs = {"meta_only": True}
        with NetCDFData("tests/testdata/nemo_test.nc", **kwargs) as nc_data:
            self.assertFalse(nc_data._dataset_open)
            self.assertIsNone(nc_data.dataset)

    def test_enter_nc_files_list(self):
        nc_data = NetCDFData("tests/testdata/nemo_test.nc")
        nc_data._nc_files = ["tests/testdata/nemo_test.nc"]
        nc_data.__enter__()
        self.assertIsInstance(nc_data.dataset, xarray.Dataset)
        self.assertTrue(nc_data._dataset_open)

    @unittest.skip(
        "Format of tests/testdata/fvcom_tests.nc causes "
        "ValueError: MFNetCDF4 only works with NETCDF3_* and NETCDF4_CLASSIC formatted files, "
        "not NETCDF4"
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

    @unittest.skip(
        "Some incompatibility between tests/testdata/nemo_test.nc and "
        "tests/testdata/nemo_grid_angle.nc results in "
        "ValueError: arguments without labels along dimension 'x' cannot be aligned "
        "because they have different dimension sizes: {1442, 101}"
    )
    def test_enter_grid_angle_file(self):
        kwargs = {"grid_angle_file_url": "tests/testdata/nemo_grid_angle.nc"}
        nc_data = NetCDFData("tests/testdata/nemo_test.nc", **kwargs)
        nc_data._dataset_config = Mock(lat_var_key="nav_lat", lon_var_key="nav_lon")
        nc_data.__enter__()
        self.assertIsInstance(nc_data.dataset, xarray.Dataset)
        self.assertTrue(nc_data._dataset_open)

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

    def test_convert_to_timestamp_list(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            date_formatted = nc_data.convert_to_timestamp(
                "2014-05-17T00:00:00Z, 2014-06-16T12:00:00Z"
            )
            ## TODO: Should there really be a leading space???
            expected = {" 2014-06-16T12:00:00Z": 1, "2014-05-17T00:00:00Z": 0}
            self.assertEqual(date_formatted, expected)

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
        # Use salishseacast_ssh_test.nc here because it has neither nav_lat nor latitude variables
        with NetCDFData("tests/testdata/salishseacast_ssh_test.nc") as nc_data:
            with self.assertRaises(KeyError):
                lat, lon = nc_data.latlon_variables

    def test_xarray_variables(self):
        with NetCDFData("tests/testdata/mercator_test.nc") as nc_data:
            vars = nc_data.variables

            self.assertEqual(vars[0].key, "votemper")
            self.assertEqual(vars[0].name, "Sea water potential temperature")
            self.assertEqual(vars[0].unit, "Kelvin")
            self.assertEqual(
                vars[0].dimensions, ("depth", "latitude", "longitude", "time")
            )
            self.assertEqual(vars[0].valid_min, 173.0)
            self.assertEqual(vars[0].valid_max, 373.0)

    def test_fvcom_variables(self):
        with NetCDFData("tests/testdata/fvcom_test.nc") as nc_data:
            vars = nc_data.variables

            self.assertEqual(vars[3].key, "temp")
            self.assertEqual(vars[3].name, "temperature")
            self.assertEqual(vars[3].unit, "degrees_C")
            self.assertEqual(
                vars[3].dimensions, ("time", "maxStrlen64", "node", "siglay")
            )
            self.assertIsNone(vars[3].valid_min)
            self.assertIsNone(vars[3].valid_max)

    def test_variable_list_cached(self):
        with NetCDFData("tests/testdata/nemo_test.nc") as nc_data:
            self.assertIsNone(nc_data._variable_list)
            vars = nc_data.variables
            self.assertEqual(nc_data._variable_list, vars)

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
