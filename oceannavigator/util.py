import os
import ConfigParser
import json
import oceannavigator
import re


_config = None


def read_config():
    global _config
    if _config is None:
        config = ConfigParser.RawConfigParser()
        config.read(os.path.join(os.path.dirname(oceannavigator.__file__),
                                 'datasetconfig.cfg'))
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
    except ConfigParser.NoSectionError:
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

    return [0, 100]


def is_variable_hidden(dataset_name, variable):
    from_config = get_variables(dataset_name).get(variable.key.lower())

    hidden = False
    if from_config is not None:
        hidden = bool(from_config.get("hide"))

    return hidden
