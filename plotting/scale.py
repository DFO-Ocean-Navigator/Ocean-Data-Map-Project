import numpy as np
from pyproj import Proj
from oceannavigator.util import (
    get_dataset_url, get_dataset_climatology, get_variable_unit
)
import re
from data import open_dataset


def get_scale(dataset, variable, depth, time, projection, extent, interp, radius, neighbours):
    x = np.linspace(extent[0], extent[2], 50)
    y = np.linspace(extent[1], extent[3], 50)
    xx, yy = np.meshgrid(x, y)
    dest = Proj(init=projection)
    lon, lat = dest(xx, yy, inverse=True)

    variables_anom = variable.split(",")
    variables = [re.sub('_anom$', '', v) for v in variables_anom]

    with open_dataset(get_dataset_url(dataset)) as ds:
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

        variable_unit = get_variable_unit(dataset,
                                          ds.variables[variables[0]])
        if variable_unit.startswith("Kelvin"):
            variable_unit = "Celsius"
            d = np.add(d, -273.15)

    if variables != variables_anom:
        with open_dataset(get_dataset_climatology(dataset), 'r') as ds:
            c = ds.get_area(
                np.array([lat, lon]),
                depth,
                timestamp.month - 1,
                variables[0],
                interp,
                radius,
                neighbours
            )

            if len(variables) > 1:
                c0 = c
                c1 = ds.get_area(
                    np.array([lat, lon]),
                    depth,
                    timestamp.month - 1,
                    variables[1],
                    interp,
                    radius,
                    neighbours
                )
                c = np.sqrt(c0 ** 2 + c1 ** 2)

            d = d - c

            m = max(abs(d.min()), abs(d.max()))
            return -m, m

    # Return min and max values of selected variable, while ignoring
    # nan values
    return np.nanmin(d), np.nanmax(d)
