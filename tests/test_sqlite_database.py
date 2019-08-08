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

        expected_vars = sorted(["nav_lat",
                                "nav_lon",
                                "time_centered",
                                "time_centered_bounds",
                                "time_counter",
                                "time_counter_bounds",
                                "zos",
                                "depthv",
                                "depthv_bounds",
                                "time_instant",
                                "time_instant_bounds",
                                "vo"
                                ])

        with SQLiteDatabase(self.historical_db) as db:

            variables = sorted(db.get_all_variables())

            self.assertTrue(expected_vars == variables)

    def test_get_netcdf_files_returns_correct_files_for_historical(self):
        expected_nc_files = [
            "/home/nabil/test-mapper/ORCA025-CMC-TRIAL_1d_grid_V_2017122700.nc"]

        with SQLiteDatabase(self.historical_db) as db:

            nc_files = sorted(db.get_netcdf_files(
                self.historical_timestamps, "vo"))

            self.assertTrue(expected_nc_files == nc_files)
