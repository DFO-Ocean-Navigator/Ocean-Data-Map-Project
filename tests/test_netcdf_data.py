"""Unit tests for data.netcdf_data.
"""
import unittest

from data.netcdf_data import NetCDFData


class TestNetCDFData(unittest.TestCase):

    def test_mercator_latlon_variables(self):
        with NetCDFData('tests/testdata/mercator_test.nc') as nc_data:
            lat, lon = nc_data.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lat.attrs["standard_name"], "latitude")

            self.assertEqual(lon.attrs["long_name"], "Longitude")
            self.assertEqual(lon.attrs["standard_name"], "longitude")

    def test_nemo_latlon_variables(self):
        with NetCDFData('tests/testdata/nemo_test.nc') as nc_data:
            lat, lon = nc_data.latlon_variables

            self.assertEqual(lat.attrs["long_name"], "Latitude")
            self.assertEqual(lon.attrs["long_name"], "Longitude")

    def test_latlon_variables_not_found_raises(self):
        # Use salishseacast_ssh_test.nc here because it has neither nav_lat nor latitude variables
        with NetCDFData('tests/testdata/salishseacast_ssh_test.nc') as nc_data:
            with self.assertRaises(KeyError):
                lat, lon = nc_data.latlon_variables
