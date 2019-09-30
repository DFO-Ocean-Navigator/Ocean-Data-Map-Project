#!/usr/bin/env python

import json
import os
import re

from flask import current_app


class DatasetConfig():
    """Access class for the dataset configuration"""
    __config = None

    def __init__(self, dataset: str):
        self._config = DatasetConfig._get_dataset_config()[dataset]

    @staticmethod
    def get_datasets() -> list:
        """
            Returns a list of the currently enabled datasets in the dataset config file
        """
        config = DatasetConfig._get_dataset_config()

        # Only return "enabled" datasets
        return [key for key in config.keys() if config[key].get("enabled")]

    @staticmethod
    def _get_dataset_config() -> dict:
        if DatasetConfig.__config is None:
            cwd = os.path.dirname(os.path.realpath(__file__))
            with open(os.path.join(cwd, current_app.config['datasetConfig']), 'r') as f:
                DatasetConfig.__config = json.load(f)

        return DatasetConfig.__config

    def _get_attribute(self, key: str) -> str:
        return self._config.get(key) if not None else ""

    @property
    def url(self) -> str:
        """
        Returns the THREDDS url to the given dataset
        """
        return self._get_attribute("url")

    @property
    def type(self) -> str:
        """
        Returns the dataset type string: "historical" or "forecast"
        """
        return self._get_attribute("type")

    @property
    def time_dim_units(self) -> str:
        return self._get_attribute("time_dim_units")

    @property
    def climatology(self) -> str:
        """
        Returns the THREDDS climatology URL for a dataset
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
    def grid_angle_file_url(self):
        return self._get_attribute("grid_angle_file_url")

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
            return re.sub(
                r"<[^>]*>",
                "",
                self._get_attribute("attribution")
            )
        except:
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
    def variables(self) -> list:
        """
            Returns a list of the variables for the specified dataset
            not hidden in dataset config file
        """
        variables = []
        for key,data in self._get_attribute("variables").items():
            is_hidden = data.get("hide")
            is_vector = ',' in key

            if (is_hidden is False or \
                    is_hidden is None or \
                    is_hidden in ['false', 'False']) and \
                    not is_vector:
                variables.append(key)
        return variables

    @property
    def vector_variables(self) -> dict:
        variables = {}
        for key,data in self._get_attribute("variables").items():
            is_hidden = data.get("hide")
            is_vector = ',' in key

            if (is_hidden is False or \
                    is_hidden is None or \
                    is_hidden in ['false', 'False']) and \
                    is_vector:
                variables[key] = data
        return variables

    @property
    def calculated_variables(self) -> dict:
        """
            Returns a dict of the calculated variables for the specified dataset
        """
        variables = {}
        for key,data in self._get_attribute("variables").items():
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

    class _VariableGetter():
        def __init__(self, datasetconfig):
            self._config = datasetconfig

        def __getitem__(self, key):
            return VariableConfig(self._config, key)

class VariableConfig():
    """
    Access class for an individual variable's portion of the datasetconfig.
    """

    def __init__(self, datasetconfig, variable):
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
                #def __init__(self, *args, **kwargs):
                #    dict.__init__(self, *args, **kwargs)
                #    self.__dict__ = self
                def __getattr__(self, key):
                    return None

            self._variable = attrdict()
        else:
            self._variable = variable
            self._key = variable.key.lower()

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
        Returns the quantum (time scale) for the variable as defined in dataset config file
        
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
            unit = self.__get_attribute("unit")
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
        elif self._variable.valid_min is not None \
                and self._variable.valid_max is not None:
            return [self._variable.valid_min, self._variable.valid_max]
        else:
            return [0, 100]

    @property
    def scale_factor(self) -> float:
        """
        Returns variable scale factor from dataset config file
        """
        
        try:
            scale_factor = self.__get_attribute("scale_factor")
        except KeyError:
            scale_factor = None

        if scale_factor is not None:
            return scale_factor
        else:
            return 1.0

    @property
    def is_hidden(self) -> bool:
        """
        Is the given variable marked as hidden in the dataset config file
        """

        try:
            from_config = self.__get_attribute("hide")
            return from_config in ['true', 'True'] or from_config == True
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
            return from_config in ['true', 'True'] or from_config == True
        except KeyError:
            return False
