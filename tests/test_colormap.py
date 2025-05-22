"""Unit tests for plotting.colormap module."""

import unittest

import plotting.colormap


class TestColormap(unittest.TestCase):
    def test_find_colormap_explicit(self):
        cmap = plotting.colormap.find_colormap("Nitrate Concentration")
        self.assertEqual(cmap, plotting.colormap.colormaps["nitrate concentration"])

    def test_find_colormap_regex(self):
        cmap = plotting.colormap.find_colormap("Nitrate Domination")
        self.assertEqual(cmap, plotting.colormap.colormaps["nitrate"])

    def test_find_colormap_default(self):
        cmap = plotting.colormap.find_colormap("foo")
        self.assertEqual(cmap, plotting.colormap.colormaps["mercator"])
