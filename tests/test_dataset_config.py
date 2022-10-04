from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from oceannavigator import DatasetConfig, create_app


class TestUtil:
    app = TestClient(create_app())

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_datasetconfig_object(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "url": "my_url",
                "geo_ref": {
                    "url": "my_geo_ref_url",
                    "drop_variables": ["bathymetry"],
                },
                "climatology": "my_climatology",
                "name": "my_name",
                "help": "my_help",
                "quantum": "my_quantum",
                "type": "my_type",
                "grid_angle_file_url": "my_grid_angle_file_url",
                "bathymetry_file_url": "my_bathy_file_url.nc",
                "model_class": "my_model_class",
                "time_dim_units": "my_time_units",
                "attribution": "my_<b>attribution</b>",
                "cache": "123",
                "lat_var_key": "my_lat",
                "lon_var_key": "my_lon",
                "variables": {
                    "var": {
                        "name": "my_variable",
                    }
                },
            }
        }

        assert len(DatasetConfig.get_datasets()) == 1

        result = DatasetConfig("key")
        assert result.url == "my_url"
        assert result.geo_ref["url"] == "my_geo_ref_url"
        assert result.geo_ref["drop_variables"] == ["bathymetry"]
        assert result.key == "key"
        assert result.climatology == "my_climatology"
        assert result.name == "my_name"
        assert result.help == "my_help"
        assert result.quantum == "my_quantum"
        assert result.grid_angle_file_url == "my_grid_angle_file_url"
        assert result.bathymetry_file_url == "my_bathy_file_url.nc"
        assert result.model_class == "my_model_class"
        assert result.type == "my_type"
        assert result.time_dim_units == "my_time_units"
        assert result.lat_var_key == "my_lat"
        assert result.lon_var_key == "my_lon"
        assert result.attribution == "my_attribution"
        assert result.cache == 123

        assert not result.variable[Mock(key="var")].is_hidden

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_vector_variable(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "variables": {
                    "magmyvar": {
                        "name": "my_variable",
                        "east_vector_component": "u",
                        "north_vector_component": "v",
                    },
                    "magnitudemyvar": {
                        "name": "my_variable",
                        "east_vector_component": "u",
                        "north_vector_component": "v",
                    },
                },
            },
        }

        assert len(DatasetConfig("key").variables) == 2
        assert len(DatasetConfig("key").vector_variables) == 2
        result = DatasetConfig("key").variable["magmyvar"]
        assert result.name == "my_variable"
        assert result.east_vector_component == "u"
        assert result.north_vector_component == "v"
        assert result.unit == "Unknown"

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_variable_string(self, m):
        m.return_value = {
            "key": {
                "enabled": True,
                "variables": {
                    "var": {
                        "name": "my_variable",
                    }
                },
            },
        }

        result = DatasetConfig("key").variable["var"]
        assert result.name == "my_variable"
        assert result.unit == "Unknown"

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
        assert len(result) == 2
        assert "k" in result
        assert "key" in result
        assert "disabled" not in result

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

        assert DatasetConfig("dataset").url == "the_url"
        assert DatasetConfig("dataset").climatology == "climatology_url"
        assert DatasetConfig("dataset").attribution == "My attribution bold"
        assert DatasetConfig("dataset").cache == 5

        m.return_value = {"dataset2": {}}
        assert DatasetConfig("dataset2").cache is None

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_variables(self, m):
        m.return_value = {"ds": {"variables": {"k": {}, "key": {}}}}

        result = DatasetConfig("ds").variables
        assert len(result) == 2
        assert "k" in result
        assert "key" in result

    @patch.object(DatasetConfig, "_get_dataset_config")
    def test_get_calculated_(self, m):
        m.return_value = {
            "ds": {
                "variables": {
                    "k": {},
                    "key": {
                        "equation": "1+1",
                    },
                }
            }
        }

        result = DatasetConfig("ds").calculated_variables
        assert len(result) == 1
        assert "key" in result
        assert result["key"]["equation"] == "1+1"

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
                    },
                },
            }
        }

        assert DatasetConfig("dataset").variable[Mock(key="var")].name == "the_name"
        variable_mock = Mock()
        variable_mock.configure_mock(key="none", name="var_name")
        assert DatasetConfig("dataset").variable[variable_mock].name == "var_name"
        variable_mock.configure_mock(key="nameless", name=None)
        assert DatasetConfig("dataset").variable[variable_mock].name == "Nameless"
        assert DatasetConfig("dataset").variable[Mock(key="var")].unit == "My Unit"
        variable_mock.configure_mock(key="none", unit="var_unit")
        assert DatasetConfig("dataset").variable[variable_mock].unit == "var_unit"
        assert (
            DatasetConfig("dataset").variable[Mock(key="varx", unit=None)].unit
            == "Unknown"
        )

        assert DatasetConfig("dataset").variable[Mock(key="var")].scale == [0, 10]
        variable_mock.configure_mock(key="none", valid_min=5, valid_max=50)
        assert DatasetConfig("dataset").variable[variable_mock].scale == [5, 50]
        assert DatasetConfig("dataset").variable[
            Mock(key="varx", scale=None, valid_min=None, valid_max=None)
        ].scale == [0, 100]

        assert not DatasetConfig("dataset").variable[Mock(key="var")].is_hidden
        assert DatasetConfig("dataset").variable[Mock(key="var2")].is_hidden
