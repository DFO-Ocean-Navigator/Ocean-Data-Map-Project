#!/usr/bin/env python

from unittest import TestCase

from data.sqlite_database import SQLiteDatabase


class TestSqliteDatabase(TestCase):

    def setUp(self):
        self.historical_combined_db = 'tests/testdata/databases/historical-combined.sqlite3'
        self.historical_combined_timestamps = sorted([2195510400, 2195596800])

        self.historical_split_db = 'tests/testdata/databases/historical-split.sqlite3'

    def test_get_all_timestamps_returns_all_timestamps_for_historical_combined(self):

        with SQLiteDatabase(self.historical_combined_db) as db:

            timestamps = db.get_all_timestamps()

            self.assertTrue(self.historical_combined_timestamps == timestamps)

    def test_get_all_timestamps_returns_all_timestamps_for_historical_split(self):
        return
        expected_timestamps = sorted([2191800600])
        with SQLiteDatabase(self.historical_split_db) as db:

            timestamps = db.get_all_timestamps(variable="votemper")

            self.assertTrue(expected_timestamps == timestamps)

    def test_get_all_variables_returns_all_variables(self):

        expected_vars = sorted(['aice', 'depth', 'nav_lat', 'nav_lon', 'sossheig',
                                'time_counter', 'vice', 'vomecrty', 'vosaline', 'votemper', 'vozocrtx'])
        with SQLiteDatabase(self.historical_combined_db) as db:

            variables = sorted(db.get_all_variables())

            self.assertTrue(expected_vars == variables)

    def test_get_netcdf_files_returns_correct_files_for_historical_combined(self):
        expected_nc_files = ['/home/nabil/test-mapper/giops_2019072800_024.nc',
                             '/home/nabil/test-mapper/giops_2019072900_024.nc']
        with SQLiteDatabase(self.historical_combined_db) as db:

            nc_files = sorted(db.get_netcdf_files(
                timestamp=self.historical_combined_timestamps))

            self.assertTrue(expected_nc_files == nc_files)

    def test_get_netcdf_files_returns_correct_files_for_historical_split(self):
        return
