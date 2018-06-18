import os
import json
import oceannavigator
import re
import json
from flask import current_app

_config = None # Hold global config dictionary

def __get_dataset_config() -> dict:
    global _config
    if _config is None:
        cwd = os.path.dirname(os.path.realpath(__file__))
        with open(os.path.join(cwd, current_app.config['datasetConfig']), 'r') as f:
            _config = json.load(f)

    return _config

def __get_dataset_attribute(dataset: str, key: str) -> str:
    return __get_dataset_config()[dataset].get(key) if not None else ""

"""
    Returns a list of the currently enabled datasets in the dataset config file
"""
def get_datasets() -> list:
    config = __get_dataset_config()

    # Only return "enabled" datasets
    return [key for key in config.keys() if config[key].get("enabled")]

"""
    Returns the THREDDS url to the given dataset
    
    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_url(dataset: str) -> str:
    return __get_dataset_attribute(dataset, "url")

"""
    Returns the THREDDS climatology URL for a dataset

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_climatology(dataset: str) -> str:
    return __get_dataset_attribute(dataset, "climatology")

"""
    Returns the "nice" name for a dataset. E.g. Giops Day, BIOMER, etc.

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_name(dataset: str) -> str:
    return __get_dataset_attribute(dataset, "name")

"""
    Returns the help text for a given dataset

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_help(dataset: str) -> str:
    return __get_dataset_attribute(dataset, "help")

"""
    Returns the "quantum" (aka "time scale") of a dataset

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_quantum(dataset: str) -> str:
    return __get_dataset_attribute(dataset, "quantum")

"""
    Returns the attribution for a given dataset.

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_attribution(dataset: str) -> str:
    # Strip any HTML from this
    try:
        return re.sub(
            r"<[^>]*>",
            "",
            __get_dataset_config()[dataset].get("attribution")
        )
    except:
        return ""

"""
    Returns the cache value for a dataset as defined in dataset config file

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_dataset_cache(dataset: str):
    cache = __get_dataset_config()[dataset].get("cache")
    if cache is not None and isinstance(cache, str):
        cache = int(cache)

    return cache

"""
    Returns a list of the variables for the specified dataset
    not hidden in dataset config file

    dataset: ID of dataset...giops_day, biomer, etc.
"""
def get_variables(dataset: str) -> list:
    variable_keys = __get_dataset_config()[dataset]["variables"].keys()

    variables = []
    for key in variable_keys:
        is_hidden = __get_dataset_config()[dataset]["variables"][key].get("hide")

        if is_hidden is None or is_hidden in ['false', 'False']:
            variables.append(key)
    return variables

"""
    Returns the "nice" name of a given variable. E.g. Temperature, Salinity, etc.

    dataset: ID of dataset...giops_day, biomer, etc.
    variable: Either xArray variable object or NetCDF4 variable object
"""
def get_variable_name(dataset: str, variable) -> str:
    ds_vars = get_variables(dataset)

    key = variable.key.lower()
    if key in ds_vars:
        return __get_dataset_config()[dataset]["variables"][key]["name"]
    elif variable.name is not None:
        return variable.name
    else:
        return str(variable.key).title()

"""
    Returns the units for a given variable as defined in dataset config file

    dataset: ID of dataset...giops_day, biomer, etc.
    variable: Either xArray variable object or NetCDF4 variable object
"""
def get_variable_unit(dataset: str, variable) -> str:
    ds_vars = get_variables(dataset)

    key = variable.key.lower()
    if key in ds_vars:
        return __get_dataset_config()[dataset]["variables"][key]["unit"]
    elif variable.unit is not None:
        return variable.unit
    else:
        return "Unknown"

"""
    Returns variable scale from dataset config file

    dataset: ID of dataset...giops_day, biomer, etc.
    variable: Either xArray variable object or NetCDF4 variable object
"""
def get_variable_scale(dataset: str, variable) -> list:
    ds_vars = get_variables(dataset)

    key = variable.key.lower()
    if key in ds_vars:
        scale = __get_dataset_config()[dataset]["variables"][key].get("scale")
        if scale is not None:
            return scale
    if variable.valid_min is not None and variable.valid_max is not None:
        return [variable.valid_min, variable.valid_max]

    return [0, 100]

"""
    Returns variable scale factor from dataset config file

    dataset: ID of dataset...giops_day, biomer, etc.
    variable: Either xArray variable object or NetCDF4 variable object
"""
def get_variable_scale_factor(dataset: str, variable) -> float:
    ds_vars = get_variables(dataset)

    key = variable.key.lower()
    if key in ds_vars:
        factor = __get_dataset_config()[dataset]["variables"][key].get("scale_factor")
        if factor is not None:
            return factor

    return 1.0

"""
    Is the given variable marked as hidden in the dataset config file
    
    dataset: ID of dataset...giops_day, biomer, etc.
    variable: Either xArray variable object or NetCDF4 variable object
"""
def is_variable_hidden(dataset: str, variable) -> bool:
    try:
        from_config = __get_dataset_config()[dataset]["variables"][variable.key.lower()].get("hide")
    except KeyError:
        return True

    if from_config in ['true', 'True'] or from_config == True:
        return True

    return False
    