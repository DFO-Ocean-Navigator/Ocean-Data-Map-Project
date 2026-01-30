import unittest
from unittest.mock import patch

import numpy as np
import xarray as xr

from data.calculated import CalculatedArray, CalculatedData
from data.variable import Variable
from data.variable_list import VariableList


class TestCalculatedData(unittest.TestCase):
    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_nothing(self, mock_query_func):
        mock_query_func.return_value = VariableList(
            [
                Variable(
                    "votemper",
                    "Sea water potential temperature",
                    "Kelvin",
                    sorted(["time", "depth", "latitude", "longitude"]),
                )
            ]
        )

        with CalculatedImpl("tests/testdata/mercator_test.nc") as data:
            self.assertEqual(len(data.variables), 1)

            v = data.get_dataset_variable("votemper")
            self.assertEqual(xr.DataArray, type(v))
            self.assertAlmostEqual(v[0, 0, 17, 150].values, 293.59375)

    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    @patch("data.sqlite_database.SQLiteDatabase.get_variable_dims")
    def test_new_variable(self, mock_get_var_dims, mock_query_func):
        mock_get_var_dims.return_value = ["time", "depth", "latitude", "longitude"]

        mock_query_func.return_value = VariableList(
            [
                Variable(
                    "votemper",
                    "Sea water potential temperature",
                    "Kelvin",
                    sorted(["time", "depth", "latitude", "longitude"]),
                )
            ]
        )

        calculated = {
            "votemper_new": {
                "equation": "votemper * 2",
                "long_name": "Temperature",
                "dims": ("time", "depth", "latitude", "longitude"),
                "units": "degree_C",
                "valid_min": -273.15,
                "valid_max": 999.0,
            }
        }
        with CalculatedImpl(
            "tests/testdata/mercator_test.nc", calculated=calculated
        ) as data:

            self.assertEqual(len(data.variables), 2)

            v = data.get_dataset_variable("votemper_new")
            self.assertAlmostEqual(v[0, 0, 17, 150].values, 2.0 * 293.59375)
            self.assertEqual(v.attrs.long_name, "Temperature")
            self.assertEqual(v.shape, (2, 50, 276, 300))

    @patch("data.sqlite_database.SQLiteDatabase.get_data_variables")
    def test_override(self, mock_query_func):
        mock_query_func.return_value = VariableList(
            [
                Variable(
                    "votemper",
                    "Sea water potential temperature",
                    "Kelvin",
                    sorted(["time", "depth", "latitude", "longitude"]),
                )
            ]
        )

        calculated = {
            "votemper": {
                "equation": "votemper -273.15",
                "units": "degree_C",
                "dims": ("time", "depth", "latitude", "longitude"),
            }
        }
        with CalculatedImpl(
            "tests/testdata/mercator_test.nc", calculated=calculated
        ) as data:

            self.assertEqual(len(data.variables), 1)

            v = data.get_dataset_variable("votemper")
            self.assertAlmostEqual(
                v[0, 0, 17, 150].values.item(), 293.59375 - 273.15, places=4
            )
            self.assertEqual(v.attrs.long_name, "Sea water potential temperature")
            self.assertEqual(v.shape, (2, 50, 276, 300))

    def test_calculated_var_wo_dims_raises(self):
        calculated = {
            "votemper": {
                "equation": "votemper -273.15",
                "units": "degree_C",
            }
        }
        with CalculatedImpl(
            "tests/testdata/mercator_test.nc", calculated=calculated
        ) as data:
            with self.assertRaises(KeyError):
                data.get_dataset_variable("votemper")


class CalculatedImpl(CalculatedData):
    def __init__(self, url: str, **kwargs):
        super().__init__(url, **kwargs)

    def get_point(self):
        pass

    def get_profile(self):
        pass

    def get_raw_point(self):
        pass

    def depths(self):
        pass


class TestCalculatedArray(unittest.TestCase):
    def test_attrs(self):
        attrs = {"my_attr": 420}

        dataset = xr.Dataset()
        array = CalculatedArray(dataset, "3 * 5", [], attrs)
        self.assertEqual(array[:].attrs, attrs)
        self.assertEqual(array.attrs, attrs)

    def test_static(self):
        dataset = xr.Dataset()
        array = CalculatedArray(dataset, "3 * 5", [])
        self.assertEqual(array[0], 15)

    def test_passthrough(self):
        dataset = xr.Dataset({"var": ("x", [1, 2, 3, 4, 5])})
        array = CalculatedArray(dataset, "var", ["x"])
        self.assertEqual(array[0], 1)
        self.assertEqual(array[2], 3)
        self.assertEqual(array[4], 5)

    def test_single_expression(self):
        dataset = xr.Dataset({"var": ("x", [1, 2, 3, 4, 5])})
        array = CalculatedArray(dataset, "var * 5", ["x"])
        self.assertEqual(array[0], 5)
        self.assertEqual(array[2], 15)
        self.assertEqual(array[4], 25)

    def test_multiple_expression(self):
        dataset = xr.Dataset(
            {
                "var": ("x", [1, 2, 3, 4, 5]),
                "var2": ("x", [5, 4, 3, 2, 1]),
            }
        )
        array = CalculatedArray(dataset, "var + var2", ["x"])
        self.assertEqual(array[0], 6)
        self.assertEqual(array[2], 6)
        self.assertEqual(array[4], 6)

    def test_different_dimensions(self):
        dataset = xr.Dataset(
            {
                "var": ("x", [1, 2]),
                "var2": ("y", [3, 4]),
                "var3": (("x", "y"), [[5, 6], [7, 8]]),
                "var4": (("y", "x"), [[9, 10], [11, 12]]),
            }
        )
        array = CalculatedArray(dataset, "var + var2", ["x"])
        self.assertIsNan(array[0])
        array = CalculatedArray(dataset, "var3 + var4", ["x"])
        self.assertIsNan(array[0, 0])
        array = CalculatedArray(dataset, "var + var3", ["x", "y"])
        self.assertEqual(array[0, 0], 6)
        self.assertEqual(array[0, 1], 7)
        self.assertEqual(array[1, 0], 9)
        self.assertEqual(array[1, 1], 10)

    def assertIsNan(self, value):
        v = value
        return self.assertTrue(np.isnan(v))
