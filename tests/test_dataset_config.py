import unittest
from unittest.mock import patch
from oceannavigator import dataset_config

class TestUtil(unittest.TestCase):

    """
    @patch("ConfigParser.RawConfigParser")
    def test___get_dataset_config(self, m):
        dataset_config._config = None
        dataset_config.__get_dataset_config()
        m.assert_called_once()
        m.return_value.read.assert_called_once()

        m.reset_mock()
        dataset_config.__get_dataset_config()
        m.assert_not_called()
    """

    @patch("oceannavigator.dataset_config.__get_dataset_config")
    def test_get_datasets(self, m):
        m.return_value.items.return_value = {
            "k": "\"v\"",
            "key": "\"value\"",
        }.items()

        result = dataset_config.get_datasets()
        self.assertEqual(len(result), 2)
        self.assertEqual(result['k'], 'v')
        self.assertEqual(result['key'], 'value')

    @patch("oceannavigator.dataset_config.get_datasets")
    def test_get_dataset_misc(self, m):
        m.return_value = {
            "dataset": {
                "url": "the_url",
                "attribution": "My attribution <b>bold</b>",
                "climatology": "climatology_url",
                "cache": 5,
            }
        }

        self.assertEqual(dataset_config.get_dataset_url("dataset"), "the_url")
        self.assertEqual(
            dataset_config.get_dataset_climatology("dataset"), "climatology_url")
        self.assertEqual(
            dataset_config.get_dataset_attribution("dataset"), "My attribution bold")
        self.assertEqual(dataset_config.get_dataset_cache("dataset"), 5)

        m.return_value = {
            "dataset2": {
            }
        }
        self.assertEqual(dataset_config.get_dataset_cache("dataset2"), None)

    @patch("oceannavigator.dataset_config.__get_dataset_config")
    def test_get_variables(self, m):
        m.return_value.items.return_value = {
            "k": "\"v\"",
            "key": "\"value\"",
        }.items()

        result = dataset_config.get_variables("ds")
        m.return_value.items.assert_called_with("ds")
        self.assertEqual(len(result), 2)
        self.assertEqual(result['k'], 'v')
        self.assertEqual(result['key'], 'value')

    @patch("oceannavigator.dataset_config.get_variables")
    def test_get_variable_misc(self, m):
        m.return_value = {
            "var": {
                "name": "the_name",
                "unit": "My Unit",
                "scale": [0, 10],
            },
            "var2": {
                "hide": True,
            }
        }

        self.assertEqual(
            util.get_variable_name("dataset", mock.Mock(key="var")),
            "the_name"
        )
        variable_mock = mock.Mock()
        variable_mock.configure_mock(key="none", name="var_name")
        self.assertEqual(
            util.get_variable_name("dataset", variable_mock),
            "var_name"
        )
        variable_mock.configure_mock(key="nameless", name=None)
        self.assertEqual(
            util.get_variable_name("dataset", variable_mock),
            "Nameless"
        )

        self.assertEqual(
            util.get_variable_unit("dataset", mock.Mock(key="var")),
            "My Unit"
        )
        variable_mock.configure_mock(key="none", unit="var_unit")
        self.assertEqual(
            util.get_variable_unit("dataset", variable_mock),
            "var_unit"
        )
        self.assertEqual(
            util.get_variable_unit(
                "dataset", Mock(key="varx", unit=None)),
            "Unknown"
        )

        self.assertEqual(
            util.get_variable_scale("dataset", Mock(key="var")),
            [0, 10]
        )
        variable_mock.configure_mock(key="none", valid_min=5, valid_max=50)
        self.assertEqual(
            util.get_variable_scale(
                "dataset", variable_mock),
            [5, 50]
        )
        self.assertEqual(
            util.get_variable_scale(
                "dataset", Mock(key="varx", scale=None, valid_min=None,
                                     valid_max=None)),
            [0, 100]
        )

        self.assertFalse(
            util.is_variable_hidden("dataset", Mock(key="var"))
        )
        self.assertTrue(
            util.is_variable_hidden("dataset", Mock(key="var2"))
        )
        self.assertFalse(
            util.is_variable_hidden("dataset", Mock(key="var3"))
        )
