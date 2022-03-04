#!/usr/bin/env python

import datetime
import os
import unittest

import numpy as np
import pandas as pd

from data.observational import DataType, Platform, create_tables, db, init_db
from data.observational import queries as q


class TestObservationalQueries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db("sqlite:///:memory:", echo=False)
        create_tables()
        cls.insertTestData()

    @classmethod
    def __json_to_sql(cls, name):
        df = pd.read_json(
            os.path.join(os.getcwd(), "tests/testdata/db", f"{name}.json")
        )
        if "time" in df.columns:
            df["time"] = pd.to_datetime(df["time"])

        df.to_sql(name, db.engine, if_exists="append", index=False)

    @classmethod
    def insertTestData(cls):
        cls.__json_to_sql("platforms")
        cls.__json_to_sql("platform_metadata")
        cls.__json_to_sql("stations")
        cls.__json_to_sql("samples")
        cls.__json_to_sql("datatypes")

    def setUp(self):
        self.session = db.session()

    def tearDown(self):
        self.session.close()

    def test_get_platform_track(self):
        p = self.session.query(Platform).filter_by(id=1).first()
        results = q.get_platform_track(db.session(), p, quantum="day")
        self.assertEqual(len(results), 5)
        self.assertAlmostEqual(results[0][1], 59.68256664277501)
        self.assertAlmostEqual(results[0][0], -17.464450200408336)
        results = q.get_platform_track(db.session(), p, quantum="year")
        self.assertEqual(len(results), 1)

        results = q.get_platform_track(
            db.session(),
            p,
            quantum="hour",
            starttime=datetime.datetime(
                2018, 2, 6, 14, 31, 36, tzinfo=datetime.timezone.utc
            ),
        )
        self.assertEqual(len(results), 3)

    @unittest.skip("TypeError: unsupported operand type(s) for -: float and str")
    def test_get_platform_variable_track(self):
        p = self.session.query(Platform).filter_by(id=1).first()
        results = q.get_platform_variable_track(db.session(), p, "sst", quantum="day")
        self.assertEqual(len(results), 5)
        self.assertAlmostEqual(results[0][0], 59.68256664277501)
        results = q.get_platform_variable_track(db.session(), p, "sst", quantum="year")
        self.assertEqual(len(results), 1)

        results = q.get_platform_variable_track(
            db.session(),
            p,
            "sst",
            quantum="hour",
            starttime=datetime.datetime(
                2018, 2, 6, 14, 31, 36, tzinfo=datetime.timezone.utc
            ),
        )
        self.assertEqual(len(results), 3)

    def test_get_stations(self):
        result = q.get_stations(
            self.session, "temp", platform_types=[Platform.Type.argo]
        )
        self.assertEqual(len(result), 2)

        result = q.get_stations(
            self.session,
            "temp",
            platform_types=[Platform.Type.argo],
            mindepth=4000,
            maxdepth=10000,
        )
        self.assertEqual(len(result), 0)

    def test_get_stations_radius(self):
        result = q.get_stations_radius(self.session, 34.6249516667, 25.321855, 0.1)
        self.assertEqual(len(result), 1)
        result = q.get_stations_radius(self.session, 34.6249516667, 25.321855, 1)
        self.assertEqual(len(result), 2)

    def test_get_datatypes(self):
        result = q.get_datatypes(self.session)
        self.assertEqual(len(result), 15)
        self.assertIsInstance(result[0], DataType)

    def test_get_meta(self):
        result = q.get_meta_keys(self.session, ["argo"])
        self.assertEqual(len(result), 8)
        self.assertIn("Type of float", result)

        result = q.get_meta_values(self.session, ["argo"], "Type of float")
        self.assertEqual(len(result), 1)
        self.assertIn("PROVOR_III", result)

    def test_get_platform_tracks(self):
        result = q.get_platform_tracks(
            self.session, quantum="hour", platform_types=["drifter"]
        )
        self.assertEqual(len(result), 101)

        array = np.array(result)

        self.assertEqual(np.unique(array[:, 0]), 1)
        self.assertEqual(np.unique(array[0, 1]), Platform.Type.drifter)
