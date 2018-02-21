import os
import json
import oceannavigator
import re
import configparser # Python 3.6

_config = None


def read_config(configFile = 'datasetconfig.cfg'):
    global _config
    if _config is None:
        config = configparser.RawConfigParser()
        config.read(os.path.join(os.path.dirname(oceannavigator.__file__), configFile))
        _config = config

    return _config


def get_datasets():
    config = read_config()

    res = {}
    for key, value in config.items("datasets"):
        res[key] = json.loads(value.replace("\n", ""))

    return res


def get_dataset_url(dataset):
    return get_datasets().get(dataset).get("url")


def get_dataset_climatology(dataset):
    return get_datasets().get(dataset).get("climatology")


def get_dataset_name(dataset):
    return get_datasets().get(dataset).get("name")


def get_dataset_attribution(dataset):
    # Strip any HTML from this
    try:
        return re.sub(
            r"<[^>]*>",
            "",
            get_datasets().get(dataset).get("attribution")
        )
    except:
        return ""


def get_dataset_cache(dataset):
    cache = get_datasets().get(dataset).get("cache")
    if cache is not None and isinstance(cache, basestring):
        cache = int(cache)

    return cache


def get_variables(dataset):
    config = read_config()

    res = {}
    try:
        for key, value in config.items(dataset):
            res[key] = json.loads(value.replace("\n", ""))
    except configparser.NoSectionError:
        pass

    return res


def get_variable_name(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    if from_config is not None:
        return from_config.get("name")
    elif variable.name is not None:
        return variable.name
    else:
        return str(variable.key).title()


def get_variable_unit(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    if from_config is not None:
        return from_config.get("unit")
    elif variable.unit is not None:
        return variable.unit
    else:
        return "Unknown"


def get_variable_scale(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    if from_config is not None:
        scale = from_config.get("scale")
        if scale is not None:
            return scale
    if variable.valid_min is not None and variable.valid_max is not None:
        return [variable.valid_min, variable.valid_max]

    return [0, 100]


def get_variable_scale_factor(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    if from_config is not None:
        factor = from_config.get("scale_factor")
        if factor is not None:
            return factor

    return 1.0


def is_variable_hidden(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    hidden = False
    if from_config is not None:
        hidden = bool(from_config.get("hide"))

    return hidden
