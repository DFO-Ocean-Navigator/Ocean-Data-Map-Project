#!/usr/bin/env python3

import configparser
import unittest


class TestOceanNavigatorCfg(unittest.TestCase):

    def setUp(self):
        self.config = None
        with open("oceannavigator/oceannavigator.cfg", 'r') as f:
            # https://stackoverflow.com/a/25493615/2231969
            config_string = "[dummy_section]\n" + f.read()
            config_parser = configparser.RawConfigParser()
            config_parser.read_string(config_string)
            
            self.config = dict(config_parser.items("dummy_section"))


    def test_config_values(self):
        self.assertEqual(self.config.get("cache_dir"), "\"/tmp/oceannavigator\"")
        self.assertEqual(self.config.get("tile_cache_dir"), "\"/tmp/oceannavigator/tiles\"")
        self.assertEqual(self.config.get("bathymetry_file"),
                         "\"/data/hdd/misc/ETOPO1_Bed_g_gmt4.grd\"")
        self.assertEqual(self.config.get("overlay_kml_dir"), "\"./kml\"")
        self.assertEqual(self.config.get("drifter_agg_url"),
                         "\"http://localhost:8080/thredds/dodsC/drifter/aggregated.ncml\"")
        self.assertEqual(self.config.get(
            "drifter_url"), "\"http://localhost:8080/thredds/dodsC/drifter/%s.nc\"")
        self.assertEqual(self.config.get("drifter_catalog_url"),
                         "\"http://localhost:8080/thredds/catalog/drifter/catalog.xml\"")
        self.assertEqual(self.config.get("observation_agg_url"),
                         "\"http://localhost:8080/thredds/dodsC/misc/observations/aggregated.ncml\"")
        self.assertEqual(self.config.get("class4_catalog_url"),
                        "\"http://localhost:8080/thredds/catalog/class4/catalog.xml\"")
        self.assertEqual(self.config.get(
            "class4_url"), "\"http://localhost:8080/thredds/dodsC/class4/%s.nc\"")
        self.assertEqual(self.config.get("observation_agg_url"),
                         "\"http://localhost:8080/thredds/dodsC/misc/observations/aggregated.ncml\"")
        self.assertEqual(self.config.get("etopo_file"),
                         "\"/data/hdd/misc/etopo_%s_z%d.nc\"")
        self.assertEqual(self.config.get("shape_file_dir"),
                         "\"/data/hdd/misc/shapes\"")
