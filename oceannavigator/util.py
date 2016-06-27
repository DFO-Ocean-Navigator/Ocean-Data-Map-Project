import os
import ConfigParser
import json
import oceannavigator


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
    var_name = variable
    if "short_name" in dir(variable):
        var_name = variable.short_name
    from_config = get_variables(dataset_name).get(var_name)

    if from_config is not None:
        return from_config.get("name")
    elif "long_name" in dir(variable):
        return variable.long_name
    else:
        return str(var_name).title()


def get_variable_unit(dataset_name, variable):
    var_name = variable
    if "short_name" in dir(variable):
        var_name = variable.short_name
    from_config = get_variables(dataset_name).get(var_name)

    if from_config is not None:
        return from_config.get("unit")
    elif "units" in dir(variable):
        return variable.units
    else:
        return "Unknown"
