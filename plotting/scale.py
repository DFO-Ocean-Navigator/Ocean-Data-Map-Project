import numpy as np
from pyproj import Proj
from oceannavigator import DatasetConfig
import re
from data import open_dataset

"""
    Calculates and returns the range (min, max values) of a selected variable,
    given the current map extents.
"""
def get_scale(dataset, variable, depth, time, projection, extent, interp, radius, neighbours):
    x = np.linspace(extent[0], extent[2], 50)
    y = np.linspace(extent[1], extent[3], 50)
    xx, yy = np.meshgrid(x, y)
    dest = Proj(init=projection)
    lon, lat = dest(xx, yy, inverse=True)

    variables = variable.split(",")
    config = DatasetConfig(dataset)

    with open_dataset(config) as ds:
        timestamp = ds.timestamps[time]
        
        d = ds.get_area(
            np.array([lat, lon]),
            depth,
            time,
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
                time,
                variables[1],
                interp,
                radius,
                neighbours
            )
            d = np.sqrt(d0 ** 2 + d1 ** 2)

    # Return min and max values of selected variable, while ignoring
    # nan values
    return np.nanmin(d), np.nanmax(d)
