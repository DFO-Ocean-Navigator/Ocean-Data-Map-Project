import numpy as np
from pyproj import Proj
from data import load_interpolated_grid
from oceannavigator.util import get_dataset_url, get_variable_unit
from netCDF4 import Dataset


def get_scale(dataset, variable, depth, time, projection, extent):
    x = np.linspace(extent[0], extent[2], 50)
    y = np.linspace(extent[1], extent[3], 50)
    xx, yy = np.meshgrid(x, y)
    dest = Proj(init=projection)
    lon, lat = dest(xx, yy, inverse=True)

    variables = variable.split(",")

    with Dataset(get_dataset_url(dataset), 'r') as ds:
        interp = {
            'method': 'inv_square',
            'neighbours': 8,
        }
        if len(variables) > 1:
            d0 = load_interpolated_grid(
                lat, lon,
                ds, variables[0], depth, time, interpolation=interp)
            d1 = load_interpolated_grid(
                lat, lon,
                ds, variables[1], depth, time, interpolation=interp)
            d = np.sqrt(d0 ** 2 + d1 ** 2)

        else:
            d = load_interpolated_grid(
                lat, lon,
                ds, variables[0], depth, time, interpolation=interp)
        variable_unit = get_variable_unit(dataset,
                                          ds.variables[variables[0]])

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"
        d = np.add(d, -273.15)

    return d.min(), d.max()
