import unittest
from unittest.mock import Mock, patch

from oceannavigator import DatasetConfig, create_app


class TestUtil(unittest.TestCase):

    def __init__(self, *args, **kwargs):
        super(TestUtil, self).__init__(*args, **kwargs)
        self.app = create_app()

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_datasetconfig_object(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "url": "my_url",
                "climatology": "my_climatology",
                "name": "my_name",
                "help": "my_help",
                "quantum": "my_quantum",
                "type": "my_type",
                "grid_angle_file_url": "my_url",
                "time_dim_units": "my_time_units",
                "attribution": "my_<b>attribution</b>",
                "cache": "123",
                "variables": {
                    "var": {
                        "name": "my_variable",
                    }
                }
            },
        }

        self.assertEqual(len(DatasetConfig.get_datasets()), 1)

        result = DatasetConfig("key")
        self.assertEqual(result.url, "my_url")
        self.assertEqual(result.climatology, "my_climatology")
        self.assertEqual(result.name, "my_name")
        self.assertEqual(result.help, "my_help")
        self.assertEqual(result.quantum, "my_quantum")
        self.assertEqual(result.grid_angle_file_url, "my_url")
        self.assertEqual(result.type, "my_type")
        self.assertEqual(result.time_dim_units, "my_time_units")
        self.assertEqual(result.attribution, "my_attribution")
        self.assertEqual(result.cache, 123)

        self.assertFalse(result.variable[Mock(key="var")].is_hidden)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_vector_variable(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "variables": {
                    "var,var2": {
                        "name": "my_variable",
                    }
                }
            },
        }

        self.assertEqual(len(DatasetConfig("key").variables), 0)
        self.assertEqual(len(DatasetConfig("key").vector_variables), 1)
        result = DatasetConfig("key").variable["var,var2"]
        self.assertEqual(result.name, "my_variable")
        self.assertEqual(result.unit, "Unknown")

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_variable_string(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "variables": {
                    "var": {
                        "name": "my_variable",
                    }
                }
            },
        }

        result = DatasetConfig("key").variable["var"]
        self.assertEqual(result.name, "my_variable")
        self.assertEqual(result.unit, "Unknown")

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_datasets(self, m):
        m.return_value = {
            "k": {
                "enabled": True,
            },
            "key": {
                "enabled": True,
            },
            "disabled": {
                "notenabled": True,
            },
        }

        result = DatasetConfig.get_datasets()
        self.assertEqual(len(result), 2)
        self.assertIn('k', result)
        self.assertIn('key', result)
        self.assertNotIn('disabled', result)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_dataset_misc(self, m):
        m.return_value = {
            "dataset": {
                "url": "the_url",
                "attribution": "My attribution <b>bold</b>",
                "climatology": "climatology_url",
                "cache": 5,
            }
        }

        self.assertEqual(DatasetConfig("dataset").url, "the_url")
        self.assertEqual(
            DatasetConfig("dataset").climatology, "climatology_url")
        self.assertEqual(
            DatasetConfig("dataset").attribution, "My attribution bold")
        self.assertEqual(DatasetConfig("dataset").cache, 5)

        m.return_value = {
            "dataset2": {
            }
        }
        self.assertEqual(DatasetConfig("dataset2").cache, None)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_variables(self, m):
        m.return_value = {
            "ds": {
                "variables": {
                    "k": {
                    },
                    "key": {
                    }
                }
            }
        }

        result = DatasetConfig("ds").variables
        self.assertEqual(len(result), 2)
        self.assertIn('k', result)
        self.assertIn('key', result)

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_calculated_(self, m):
        m.return_value = {
            "ds": {
                "variables": {
                    "k": {
                    },
                    "key": {
                        "equation": "1+1",
                    }
                }
            }
        }

        result = DatasetConfig("ds").calculated_variables
        self.assertEqual(len(result), 1)
        self.assertIn('key', result)
        self.assertEqual(result['key']['equation'], "1+1")

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_variable_misc(self, m):
        m.return_value = {
            "dataset": {
                "url": "the_url",
                "attribution": "My attribution <b>bold</b>",
                "climatology": "climatology_url",
                "cache": 5,
                "variables": {
                    "var": {
                        "name": "the_name",
                        "unit": "My Unit",
                        "scale": [0, 10],
                    },
                    "var2": {
                        "hide": True,
                    }
                }
            }
        }

        self.assertEqual(
            DatasetConfig("dataset").variable[Mock(key="var")].name,
            "the_name"
        )
        variable_mock = Mock()
        variable_mock.configure_mock(key="none", name="var_name")
        self.assertEqual(
            DatasetConfig("dataset").variable[variable_mock].name,
            "var_name"
        )
        variable_mock.configure_mock(key="nameless", name=None)
        self.assertEqual(
            DatasetConfig("dataset").variable[variable_mock].name,
            "Nameless"
        )

        self.assertEqual(
            DatasetConfig("dataset").variable[Mock(key="var")].unit,
            "My Unit"
        )
        variable_mock.configure_mock(key="none", unit="var_unit")
        self.assertEqual(
            DatasetConfig("dataset").variable[variable_mock].unit,
            "var_unit"
        )
        self.assertEqual(
            DatasetConfig("dataset").variable[Mock(key="varx", unit=None)].unit,
            "Unknown"
        )

        self.assertEqual(
            DatasetConfig("dataset").variable[Mock(key="var")].scale,
            [0, 10]
        )
        variable_mock.configure_mock(key="none", valid_min=5, valid_max=50)
        self.assertEqual(
            DatasetConfig("dataset").variable[variable_mock].scale,
            [5, 50]
        )
        self.assertEqual(
            DatasetConfig("dataset").variable[
                Mock(key="varx", scale=None, valid_min=None,
                                     valid_max=None)].scale,
            [0, 100]
        )

        self.assertFalse(
            DatasetConfig("dataset").variable[Mock(key="var")].is_hidden
        )
        self.assertTrue(
            DatasetConfig("dataset").variable[Mock(key="var2")].is_hidden
        )

    def setUp(self):
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()
