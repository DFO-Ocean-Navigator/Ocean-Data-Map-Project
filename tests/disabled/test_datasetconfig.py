#!/usr/bin/env python3


import json
import re
import unittest


class TestDatasetConfig(unittest.TestCase):

    def setUp(self):
        self.datasetConfig = {}
        with open("oceannavigator/datasetconfig.json", 'r') as f:
            self.datasetConfig = json.loads(f.read())

    def test_required_datasets_are_present(self):
        expected_datasets = ["giops_month", "giops_day", "giops_forecast", "riops_daily",
                             "riops", "riops_monthly", "riops_forecast", "glorys3", "glorys4", "glorys4_climatology",
                             "glorys_climatology", "levitus98_phc21", "biomer", "biomer_climatology", "fvcom_demo",
                             "gem", "gulf", "gulf_daily", "gulf_monthly", "SJAP100", "BayOfFundy"]
        
        actual_datasets = self.datasetConfig.keys()

        for ds in expected_datasets:
            self.assertTrue(ds in actual_datasets)

    def test_all_datasets_have_required_attributes(self):
        expected_attributes = ["url", "name", "enabled", "quantum", "attribution", "climatology", "variables", "help", "type"]

        for ds in self.datasetConfig:
            actual_attribs = self.datasetConfig[ds].keys()

            for attrib in expected_attributes:
                self.assertTrue(attrib in actual_attribs)

    def test_required_datasets_have_cache_attribute(self):
        # Grab all datasets with forecast in their name
        expected_datasets = [d for d in self.datasetConfig.keys() if "forecast" in d]

        for ds in expected_datasets:
            actual_attribs = self.datasetConfig[ds].keys()

            self.assertTrue("cache" in actual_attribs)

    def test_all_urls_point_to_localhost(self):

        prog = re.compile(r"^.*navigator.oceansdata.ca.*$")

        for ds in self.datasetConfig:
            self.assertFalse(prog.match(self.datasetConfig[ds]["url"]))
            self.assertFalse(prog.match(self.datasetConfig[ds]["climatology"]))

    def test_disabled_datasets_are_indeed_disabled(self):
        disabled = ["gulf", "gulf_daily", "gulf_monthly"]

        for ds in disabled:
            self.assertFalse(bool(self.datasetConfig[ds]["enabled"]))
