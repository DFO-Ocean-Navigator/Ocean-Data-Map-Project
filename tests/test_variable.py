#!/usr/bin/enself.variable python
import unittest

from data.variable import Variable


class TestVariable(unittest.TestCase):

    def setUp(self):
        self.variable = Variable(
            "my_key", "my_name", "my_unit", ('depth', 'dim2'), 0, 100)

    def test_properties(self):

        self.assertEqual(self.variable.key, "my_key")
        self.assertEqual(self.variable.name, "my_name")
        self.assertEqual(self.variable.unit, "my_unit")
        self.assertTupleEqual(self.variable.dimensions, ('depth', 'dim2'))
        self.assertEqual(self.variable.valid_min, 0)
        self.assertEqual(self.variable.valid_max, 100)

    def test__str__(self):
        self.assertEqual(str(self.variable), "my_key")

    def test_has_depth(self):
        self.assertTrue(self.variable.has_depth())

    def test_is_surface_only(self):
        self.assertFalse(self.variable.is_surface_only())
