#!/usr/bin/enself.variable python
import unittest

from data.variable import Variable
from data.variable_list import VariableList


class TestVariableList(unittest.TestCase):

    def setUp(self):
        self.variable_list = VariableList([Variable(
            "my_key", "my_name", "my_unit", ('depth', 'dim2'), 0, 100)])

    def test__contains__(self):
        self.assertTrue("my_key" in self.variable_list)
        self.assertFalse("no_key" in self.variable_list)

    def test__getitem__(self):

        _ = self.variable_list["my_key"]

        with self.assertRaises(IndexError):
            self.variable_list["no_key"]
