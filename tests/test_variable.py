#!/usr/bin/enself.variable python
import unittest

from data.variable import Variable


class TestVariable(unittest.TestCase):
    def test_properties(self):
        variable = self.__make_3d_variable()

        self.assertEqual(variable.key, "my_key")
        self.assertEqual(variable.name, "my_name")
        self.assertEqual(variable.unit, "my_unit")
        self.assertTupleEqual(variable.dimensions, ("depth", "dim2"))
        self.assertEqual(variable.valid_min, 0)
        self.assertEqual(variable.valid_max, 100)

    def test__str__(self):
        variable = self.__make_3d_variable()

        self.assertEqual(str(variable), "my_key")

    def test_has_depth_returns_true_with_3d_variable(self):
        variable = self.__make_3d_variable()

        self.assertTrue(variable.has_depth())

    def test_surface_only_returns_true_with_surface_variable(self):
        variable = self.__make_surface_variable()

        self.assertTrue(variable.is_surface_only())

    def test_has_depth_returns_false_with_surface_variable(self):
        variable = self.__make_surface_variable()

        self.assertFalse(variable.has_depth())

    def test_is_surface_only_returns_false_with_3d_variable(self):
        variable = self.__make_3d_variable()

        self.assertFalse(variable.is_surface_only())

    def __make_3d_variable(self):
        return Variable("my_key", "my_name", "my_unit", ("depth", "dim2"), 0, 100)

    def __make_surface_variable(self):
        return Variable("my_key", "my_name", "my_unit", ("dim2"), 0, 100)
