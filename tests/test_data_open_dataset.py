import unittest
from unittest.mock import patch

import data.calculated
from data import open_dataset
from data.fvcom import Fvcom
from data.mercator import Mercator
from data.nemo import Nemo
from oceannavigator import DatasetConfig


class TestOpenDataset(unittest.TestCase):
    def test_open_dataset_with_null_dataset_raises(self):
        with self.assertRaises(ValueError):
            open_dataset("")

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_with_null_url_raises(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = {
            "giops": {"url": None, "variables": {}}
        }
        config = DatasetConfig("giops")

        with self.assertRaises(ValueError):
            open_dataset(config)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_no_model_class_raises(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/mercator_test.nc", "variables": {}}
        }
        config = DatasetConfig("giops")

        with self.assertRaises(ValueError):
            open_dataset(config)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_open_dataset_bad_model_class_raises(self, patch_get_dataset_config):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/mercator_test.nc", "model_class": "Foo", "variables": {}}
        }
        config = DatasetConfig("giops")

        with self.assertRaises(ValueError):
            open_dataset(config)

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_meta_only_returns_mercator_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/mercator_test.nc", "model_class": "Mercator", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config, meta_only=True) as ds:
            self.assertTrue(isinstance(ds, Mercator))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_returns_mercator_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/mercator_test.nc", "model_class": "Mercator", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config) as ds:
            self.assertTrue(isinstance(ds, Mercator))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_meta_only_returns_nemo_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/nemo_test.nc", "model_class": "Nemo", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config, meta_only=True) as ds:
            self.assertTrue(isinstance(ds, Nemo))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_returns_nemo_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/nemo_test.nc", "model_class": "Nemo", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config) as ds:
            self.assertTrue(isinstance(ds, Nemo))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_meta_only_returns_fvcom_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/fvcom_test.nc", "model_class": "Fvcom", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config, meta_only=True) as ds:
            self.assertTrue(isinstance(ds, Fvcom))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_returns_fvcom_object(
        self, patch_calculated_data, patch_get_dataset_config
    ):
        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/fvcom_test.nc", "model_class": "Fvcom", "variables": {}}
        }
        config = DatasetConfig("giops")

        with open_dataset(config) as ds:
            self.assertTrue(isinstance(ds, Fvcom))

    @patch.object(DatasetConfig, "_get_dataset_config")
    @patch.object(data.calculated, "CalculatedData")
    def test_open_dataset_uses_lru_cache(self, patch_calculated_data, patch_get_dataset_config):
        open_dataset.cache_clear()  # clear the cache from other test runs

        patch_get_dataset_config.return_value = {
            "giops": {"url": "tests/testdata/mercator_test.nc", "model_class": "Mercator", "variables": {}}
        }
        config = DatasetConfig("giops")

        for i in range(0, 20):
            with open_dataset(config) as ds:
                pass

        cache_info = open_dataset.cache_info()
        self.assertEqual(cache_info.misses, 1)
        self.assertEqual(cache_info.hits, 19)
        self.assertEqual(cache_info.currsize, 1)
