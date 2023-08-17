import json
import re
from functools import lru_cache
from typing import List, Union

from .log import log
from .settings import get_settings


class DatasetConfig:
    """Access class for the dataset configuration"""

    def __init__(self, dataset: str) -> None:
        try:
            self._config = DatasetConfig._get_dataset_config()[dataset]
        except KeyError as e:
            raise KeyError(f"Dataset ({dataset}) not found.") from e

        self._dataset_key: str = dataset

    @staticmethod
    def get_datasets() -> List[str]:
        """
        Returns a list of the currently enabled datasets in the dataset config file
        """
        config = DatasetConfig._get_dataset_config()

        # Only return "enabled" datasets
        return list(filter(lambda k: config[k].get("enabled"), config.keys()))

    @staticmethod
    @lru_cache()
    def _get_dataset_config() -> dict:
        settings = get_settings()
        with open(settings.dataset_config_file, "r") as f:
            config = json.load(f)
            log().debug(
                f"Loaded dataset config file from: {settings.dataset_config_file}"
            )
            return config

    def _get_attribute(self, key: str) -> Union[str, dict]:
        return self._config.get(key) if not None else ""

    @property
    def url(self) -> str:
        """
        Returns the url to the given dataset (sqlite, OpenDAP, etc.)
        """
        return self._get_attribute("url")

    @property
    def geo_ref(self) -> dict:
        """
        Returns the dict of information about the ERDDAP dataset
        that provides the mapping of grid index to lat/lon for
        the given dataset.
        """
        return self._get_attribute("geo_ref")

    @property
    def key(self) -> str:
        return self._dataset_key

    @property
    def type(self) -> str:
        """
        Returns the dataset type string: "historical" or "forecast"
        """
        return self._get_attribute("type")

    @property
    def time_dim_units(self) -> str:
        """
        Returns units of the time dimension
        """
        return self._get_attribute("time_dim_units")

    @property
    def climatology(self) -> str:
        """
        Returns the climatology URL for a dataset (sqlite, OpenDAP, etc.)
        """
        return self._get_attribute("climatology")

    @property
    def name(self) -> str:
        """
        Returns the "nice" name for a dataset. E.g. Giops Day, BIOMER, etc.
        """
        return self._get_attribute("name")

    @property
    def help(self) -> str:
        """
        Returns the help text for a given dataset
        """
        return self._get_attribute("help")

    @property
    def grid_angle_file_url(self) -> str:
        """
        Returns the url to the grid angle file for this dataset's model.
        """
        return self._get_attribute("grid_angle_file_url")

    @property
    def bathymetry_file_url(self) -> str:
        """
        Returns the url to the model bathymetry file.
        """
        return self._get_attribute("bathymetry_file_url")

    @property
    def vector_arrow_stride(self) -> int:
        """
        Returns the stride used to slice the dataset for generating geojson
        for the vector arrows (i.e. every n-th value).

        Defaults to 4.
        """

        stride = self._get_attribute("vector_arrow_stride")
        if stride:
            return stride

        return 4

    @property
    def model_class(self) -> str:
        return self._get_attribute("model_class")

    @property
    def lat_var_key(self) -> str:
        return self._get_attribute("lat_var_key")

    @property
    def lon_var_key(self) -> str:
        return self._get_attribute("lon_var_key")

    @property
    def group(self) -> str:
        try:
            name = self._get_attribute("group")
        except KeyError:
            name = None
        return name

    @property
    def subgroup(self) -> str:
        try:
            header = self._get_attribute("subgroup")
        except KeyError:
            header = None
        return header

    @property
    def quantum(self) -> str:
        """
        Returns the "quantum" (aka "time scale") of a dataset
        """

        try:
            quantum = self._get_attribute("quantum")
        except KeyError:
            quantum = None

        return quantum

    @property
    def attribution(self) -> str:
        """
        Returns the attribution for a given dataset.
        """
        # Strip any HTML from this
        try:
            return re.sub(r"<[^>]*>", "", self._get_attribute("attribution"))
        except KeyError:
            return ""

    @property
    def cache(self) -> int:
        """
        Returns the cache value for a dataset as defined in dataset config file
        """
        cache = self._get_attribute("cache")
        if cache is not None and isinstance(cache, str):
            cache = int(cache)

        return cache

    @property
    def default_location(self) -> list:
        """
        Returns the default map location of the specified dataset. Used to pan the map
        to dataset location. Format [lon, lat, zoom].
        """

        dataset_default_location = self._get_attribute("default_location")

        return dataset_default_location

    @property
    def variables(self) -> list:
        """
        Returns a list of the variables for the specified dataset
        not hidden in dataset config file
        """
        variables = []
        for key, data in self._get_attribute("variables").items():
            is_hidden = data.get("hide")
            is_vector = "," in key

            if (
                is_hidden is False
                or is_hidden is None
                or is_hidden in ["false", "False"]
            ) and not is_vector:
                variables.append(key)
        return variables

    @property
    def vector_variables(self) -> dict:
        """
        Returns any magnitude variables.
        """
        vectors = self._get_attribute("vector_variables")
        variables = {}
        for key, data in self._get_attribute("variables").items():
            is_hidden = data.get("hide")

            if (
                (
                    is_hidden is False
                    or is_hidden is None
                    or is_hidden in ["false", "False"]
                )
                and vectors
                and key in vectors
            ):
                variables[key] = data
        return variables

    @property
    def calculated_variables(self) -> dict:
        """
        Returns a dict of the calculated variables for the specified dataset
        """
        variables = {}
        for key, data in self._get_attribute("variables").items():
            if "equation" in data.keys():
                variables[key] = data
        return variables

    @property
    def variable(self):
        """
        Accessor for variables.
        Returns a private class that implements __getitem__, so that
        DatasetConfig.variable["variablename"] works.
        """
        return self._VariableGetter(self)

    class _VariableGetter:
        def __init__(self, datasetconfig) -> None:
            self._config = datasetconfig

        def __getitem__(self, key):
            if isinstance(key, str):
                variable_name = key
            else:
                variable_name = key.key
            if variable_name in self._config.vector_variables:
                return VectorVariableConfig(self._config, key)

            return VariableConfig(self._config, key)


class VariableConfig:
    """
    Access class for an individual variable's portion of the datasetconfig.
    """

    def __init__(self, datasetconfig, variable) -> None:
        """
        Parameters:
        datasetconfig -- the parent DatasetConfig object
        variable -- either the string key for the variable, or the
                    xarray/netcdf4 Variable object
        """
        self._config = datasetconfig
        if isinstance(variable, str):
            # In the case that the passed variable is a string, we need to make
            # is so attempts to read the underlying variable attributes do not
            # crash the rest of the code, so we use this attrdict class that
            # will return None for any attribute. It extends a dict in case any
            # future code is added that will need any attributes populated.
            self._key = variable

            class attrdict(dict):
                # def __init__(self, *args, **kwargs):
                #    dict.__init__(self, *args, **kwargs)
                #    self.__dict__ = self
                def __getattr__(self, key):
                    return None

            self._variable = attrdict()
        else:
            self._variable = variable
            self._key = variable.key

    def __get_attribute(self, attr):
        return self._config._get_attribute("variables")[self._key].get(attr)

    @property
    def name(self) -> str:
        """
        Returns the "nice" name of a given variable. E.g. Temperature, Salinity, etc.
        """
        try:
            name = self.__get_attribute("name")
        except KeyError:
            name = None

        if name is not None:
            return name
        elif self._variable.name is not None:
            return self._variable.name
        else:
            return str(self._key).title()

    @property
    def quantum(self) -> str:
        """
        Returns the quantum (time scale) for
        the variable as defined in dataset config file

        Returns:
            str -- variable quantum
        """
        try:
            quantum = self.__get_attribute("quantum")
        except KeyError:
            quantum = None

        return quantum

    @property
    def unit(self) -> str:
        """
        Returns the units for a given variable as defined in dataset config file
        """

        try:
            unit = self.__get_attribute("units")
        except KeyError:
            unit = None

        if unit is not None:
            return unit
        elif self._variable.unit is not None:
            return self._variable.unit
        else:
            return "Unknown"

    @property
    def scale(self) -> list:
        """
        Returns variable scale from dataset config file
        """
        try:
            scale = self.__get_attribute("scale")
        except KeyError:
            scale = None

        if scale is not None:
            return scale
        elif (
            self._variable.valid_min is not None
            and self._variable.valid_max is not None
        ):
            return [self._variable.valid_min, self._variable.valid_max]
        else:
            return [0, 100]

    @property
    def is_hidden(self) -> bool:
        """
        Is the given variable marked as hidden in the dataset config file
        """

        try:
            from_config = self.__get_attribute("hide")
            return from_config in ["true", "True"] or from_config is True
        except KeyError:
            return True

    @property
    def hidden(self) -> bool:
        """
        Is the given variable marked as hidden in the dataset config file
        """
        return self.is_hidden

    @property
    def is_zero_centered(self) -> bool:
        """
        Is the given variable marked as zero centered in the dataset config file
        """
        try:
            from_config = self.__get_attribute("zero_centered")
            return from_config in ["true", "True"] or from_config is True
        except KeyError:
            return False

    @property
    def interpolation(self) -> dict:
        """
        This will contain the variable specific interpolation
        config from the datasetconfig file
        """
        try:
            interp_config = self.__get_attribute("interpolation")
            return interp_config
        except KeyError:
            return None


class VectorVariableConfig(VariableConfig):
    """
    Access class for a vector variable's portion of the datasetconfig.
    """

    def __init__(self, datasetconfig, variable) -> None:
        """
        Parameters:
        datasetconfig -- the parent DatasetConfig object
        variable -- either the string key for the variable, or the
                    xarray/netcdf4 Variable object
        """
        super().__init__(datasetconfig, variable)

    def __get_attribute(self, attr):
        return self._config._get_attribute("variables")[self._key].get(attr)

    @property
    def east_vector_component(self) -> str:
        """
        Returns the east_vector_component for the variable
        if defined in dataset config file

        Returns:
            str -- east_vector_component name
        """
        try:
            east_vector_component = self.__get_attribute("east_vector_component")
        except KeyError:
            east_vector_component = None

        return east_vector_component

    @property
    def north_vector_component(self) -> str:
        """
        Returns the north_vector_component for the variable
        if defined in dataset config file

        Returns:
            str -- north_vector_component name
        """
        try:
            north_vector_component = self.__get_attribute("north_vector_component")
        except KeyError:
            north_vector_component = None

        return north_vector_component

    @property
    def bearing_component(self) -> str:
        """
        Returns the bearing_component for the variable
        if defined in dataset config file
        Returns:
            str -- bearing_component name
        """
        try:
            bearing_component = self.__get_attribute("bearing_component")
        except KeyError:
            bearing_component = None

        return bearing_component
