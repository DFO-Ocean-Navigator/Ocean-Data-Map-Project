#!/usr/bin/env python

from unittest import TestCase

from data.sqlite_database import SQLiteDatabase


class TestSqliteDatabase(TestCase):

    def setUp(self):
        self.historical_db = 'tests/testdata/databases/Historical.sqlite3'
        self.historical_timestamps = sorted([2144966400,
                                             2145052800,
                                             2145139200,
                                             2145225600,
                                             2145312000,
                                             2145398400,
                                             2145484800
                                             ])

    def test_get_timestamps_returns_correct_timestamps_for_historical(self):

        with SQLiteDatabase(self.historical_db) as db:

            timestamps = db.get_timestamps("vo")

            self.assertTrue(self.historical_timestamps == timestamps)

    def test_get_all_variables_returns_all_variables(self):

        with SQLiteDatabase(self.historical_db) as db:

            variables = db.get_all_variables()

            self.assertEqual(len(variables), 12)

    def test_get_timestamp_range_returns_range(self):

        with SQLiteDatabase(self.historical_db) as db:
            rng = db.get_timestamp_range(2144966400, 2145225600, "vo")

            self.assertEqual(len(rng), 4)

    def test_get_variable_dims_returns_correct_dims(self):

        expected_dims = sorted(["depthv", "time_counter", "x", "y"])

        with SQLiteDatabase(self.historical_db) as db:

            dims = sorted(db.get_variable_dims("vo"))

            self.assertTrue(expected_dims == dims)

    def test_get_variable_units_returns_correct_units(self):

        expected_units = "m"

        with SQLiteDatabase(self.historical_db) as db:

            units = db.get_variable_units("zos")

            self.assertEqual(expected_units, units)

    def test_get_latest_timestamp_returns_latest_timestamp(self):

        expected_value = 2145483000

        with SQLiteDatabase(self.historical_db) as db:

            latest = db.get_latest_timestamp("zos")

            self.assertEqual(expected_value, latest)

    def test_get_earliest_timestamp_returns_earliest_timestamp(self):
    
        expected_value = 2144881800

        with SQLiteDatabase(self.historical_db) as db:

            earliest = db.get_earliest_timestamp("zos")

            self.assertEqual(expected_value, earliest)

    def test_get_data_variables_returns_variable_list(self):

        with SQLiteDatabase(self.historical_db) as db:

            variables = db.get_data_variables()

            self.assertEqual(len(variables), 2)
            self.assertTrue('vo' in variables)
            self.assertTrue('zos' in variables)
            self.assertEqual(
                variables['vo'].name, "Sea Water Y Velocity")
            self.assertEqual(variables['vo'].unit, "m/s")

    def test_get_netcdf_files_returns_correct_files_for_historical(self):
        expected_nc_files = [
            "/home/nabil/test-mapper/ORCA025-CMC-TRIAL_1d_grid_V_2017122700.nc"]

        with SQLiteDatabase(self.historical_db) as db:

            nc_files = sorted(db.get_netcdf_files(
                self.historical_timestamps, "vo"))

            self.assertTrue(expected_nc_files == nc_files)

    def test_erroneous_args_return_empty_lists(self):

        with SQLiteDatabase(self.historical_db) as db:

            ncfiles = db.get_netcdf_files(
                self.historical_timestamps, "fake_variable")
            timestamps = db.get_timestamps("fake_variable")
            dims = db.get_variable_dims("fake_variable")
            units = db.get_variable_units("fake_variable")

            self.assertFalse(ncfiles)
            self.assertFalse(timestamps)
            self.assertFalse(dims)
            self.assertFalse(units)


if __name__ == '__main__':
    unittest.main()
