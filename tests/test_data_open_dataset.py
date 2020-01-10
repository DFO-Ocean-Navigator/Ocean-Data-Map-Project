#!/usr/bin/env python

import unittest
from unittest.mock import patch

from data import open_dataset
from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo
from oceannavigator import DatasetConfig


class TestOpenDataset(unittest.TestCase):

    def setUp(self):
        self.patch_dataset_config_ret_val = {
            "giops": {
                "enabled": True,
                "url": "tests/testdata/nemo_test.nc",
                "grid_angle_file_url": "tests/testdata/nemo_grid_angle.nc",
                "time_dim_units": "seconds since 1950-01-01 00:00:00",
                "quantum": "day",
                "name": "GIOPS",
                "help": "help",
                "attribution": "attrib",
                "variables": {
                    "votemper": {"name": "Temperature", "scale": [-5, 30], "units": "Kelvins", "equation": "votemper - 273.15"},
                }
            }
        }

        self.patch_dataset_config_ret_val_sqlite = {
            "giops": {
                "enabled": True,
                "url": "tests/testdata/databases/test-nemo.sqlite3",
                "grid_angle_file_url": "tests/testdata/nemo_grid_angle.nc",
                "time_dim_units": "seconds since 1950-01-01 00:00:00",
                "quantum": "day",
                "name": "GIOPS",
                "help": "help",
                "attribution": "attrib",
                "variables": {
                    "votemper": {"name": "Temperature", "scale": [-5, 30], "units": "Kelvins", "equation": "votemper - 273.15"},
                }
            }
        }

    def test_open_dataset_returns_nemo_object(self):

        with open_dataset('tests/testdata/nemo_test.nc') as ds:
            self.assertTrue(isinstance(ds, Nemo))

    def test_open_dataset_returns_mercator_object(self):
        with open_dataset('tests/testdata/mercator_test.nc') as ds:
            self.assertTrue(isinstance(ds, Mercator))

    def test_open_dataset_returns_fvcom_object(self):
        with open_dataset('tests/testdata/fvcom_test.nc') as ds:
            self.assertTrue(isinstance(ds, Fvcom))

    def test_open_dataset_uses_lru_cache(self):
        open_dataset.cache_clear()  # clear the cache from other test runs

        for i in range(0, 20):
            with open_dataset('tests/testdata/nemo_test.nc') as ds:
                pass

        cache_info = open_dataset.cache_info()
        self.assertEqual(cache_info.misses, 1)
        self.assertEqual(cache_info.hits, 19)
        self.assertEqual(cache_info.currsize, 1)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_with_dataset_config_and_variable_list(self, patch_get_dataset_config):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        config = DatasetConfig('giops')
        with open_dataset(config, variable=['votemper'], timestamp=2031436800) as ds:
            pass

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_with_dataset_config_and_variable_str(self, patch_get_dataset_config):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val
        config = DatasetConfig('giops')
        with open_dataset(config, variable='votemper', timestamp=2031436800) as ds:
            pass

    @patch('data.__get_dimensions')
    def test_open_dataset_bad_dim_list_raises(self, patch_get_dimensions):

        patch_get_dimensions.return_value = []

        with self.assertRaises(RuntimeError):
            with open_dataset('tests/testdata/nemo_test.nc') as ds:
                pass

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_sqlite_with_bad_timestamp_raises(self, patch_get_dataset_config):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val_sqlite
        config = DatasetConfig('giops')

        with self.assertRaises(RuntimeError):
            with open_dataset(config, variable='votemper', timestamp=420) as ds:
                pass

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_sqlite_without_req_kwargs_raises(self, patch_get_dataset_config):

        patch_get_dataset_config.return_value = self.patch_dataset_config_ret_val_sqlite
        config = DatasetConfig('giops')

        with self.assertRaises(RuntimeError):
            with open_dataset(config, variable='votemper') as ds:
                pass

        with self.assertRaises(RuntimeError):
            with open_dataset(config, timestamp=420) as ds:
                pass

    def test_open_dataset_with_null_url_raises(self):

        with self.assertRaises(ValueError):
            with open_dataset('') as ds:
                pass
