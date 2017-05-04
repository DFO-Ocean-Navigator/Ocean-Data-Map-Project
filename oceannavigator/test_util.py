import unittest
from oceannavigator import util
import mock


class TestUtil(unittest.TestCase):

    @mock.patch("ConfigParser.RawConfigParser")
    def test_read_config(self, m):
        util._config = None
        util.read_config()
        m.assert_called_once()
        m.return_value.read.assert_called_once()

        m.reset_mock()
        util.read_config()
        m.assert_not_called()

    @mock.patch("oceannavigator.util.read_config")
    def test_get_datasets(self, m):
        m.return_value.items.return_value = {
            "k": "\"v\"",
            "key": "\"value\"",
        }.iteritems()

        result = util.get_datasets()
        self.assertEqual(len(result), 2)
        self.assertEqual(result['k'], 'v')
        self.assertEqual(result['key'], 'value')

    @mock.patch("oceannavigator.util.get_datasets")
    def test_get_dataset_misc(self, m):
        m.return_value = {
            "dataset": {
                "url": "the_url",
                "attribution": "My attribution <b>bold</b>",
                "climatology": "climatology_url",
                "cache": 5,
            }
        }

        self.assertEqual(util.get_dataset_url("dataset"), "the_url")
        self.assertEqual(
            util.get_dataset_climatology("dataset"), "climatology_url")
        self.assertEqual(
            util.get_dataset_attribution("dataset"), "My attribution bold")
        self.assertEqual(util.get_dataset_cache("dataset"), 5)

        m.return_value = {
            "dataset2": {
            }
        }
        self.assertEqual(util.get_dataset_cache("dataset2"), None)

    @mock.patch("oceannavigator.util.read_config")
    def test_get_variables(self, m):
        m.return_value.items.return_value = {
            "k": "\"v\"",
            "key": "\"value\"",
        }.iteritems()

        result = util.get_variables("ds")
        m.return_value.items.assert_called_with("ds")
        self.assertEqual(len(result), 2)
        self.assertEqual(result['k'], 'v')
        self.assertEqual(result['key'], 'value')

    @mock.patch("oceannavigator.util.get_variables")
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
                "dataset", mock.Mock(key="varx", unit=None)),
            "Unknown"
        )

        self.assertEqual(
            util.get_variable_scale("dataset", mock.Mock(key="var")),
            [0, 10]
        )
        self.assertEqual(
            util.get_variable_scale(
                "dataset", mock.Mock(key="varx", scale=None)),
            [0, 100]
        )

        self.assertFalse(
            util.is_variable_hidden("dataset", mock.Mock(key="var"))
        )
        self.assertTrue(
            util.is_variable_hidden("dataset", mock.Mock(key="var2"))
        )
        self.assertFalse(
            util.is_variable_hidden("dataset", mock.Mock(key="var3"))
        )
