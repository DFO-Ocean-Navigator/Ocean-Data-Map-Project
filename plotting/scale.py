import re

import numpy as np
from pyproj import Proj

from data import open_dataset
from oceannavigator import DatasetConfig
from plotting.utils import normalize_scale

def __magnitude(a, b):
    return np.sqrt(a.dot(a) + b.dot(b))

def get_scale(dataset, variable, depth, timestamp, projection, extent, interp, radius, neighbours):
    """
    Calculates and returns the range (min, max values) of a selected variable,
    given the current map extents.
    """
    x = np.linspace(extent[0], extent[2], 50)
    y = np.linspace(extent[1], extent[3], 50)
    xx, yy = np.meshgrid(x, y)
    dest = Proj(init=projection)
    lon, lat = dest(xx, yy, inverse=True)

    variables = variable.split(",")
    config = DatasetConfig(dataset)

    with open_dataset(config, variable=variables, timestamp=timestamp) as ds:

        d = ds.get_area(
            np.array([lat, lon]),
            depth,
            timestamp,
            variables[0],
            interp,
            radius,
            neighbours
        )

        if len(variables) > 1:
            d0 = d
            d1 = ds.get_area(
                np.array([lat, lon]),
                depth,
                timestamp,
                variables[1],
                interp,
                radius,
                neighbours
            )
            d = __magnitude(d0, d1)# Use your dot-product instead of exponents

        return normalize_scale(d, config.variable[",".join(variables)])
