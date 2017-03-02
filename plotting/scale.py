import numpy as np
from pyproj import Proj
from data import load_interpolated_grid
from oceannavigator.util import (
    get_dataset_url, get_dataset_climatology, get_variable_unit
)
from netCDF4 import Dataset, netcdftime
import re
import utils


def get_scale(dataset, variable, depth, time, projection, extent):
    x = np.linspace(extent[0], extent[2], 50)
    y = np.linspace(extent[1], extent[3], 50)
    xx, yy = np.meshgrid(x, y)
    dest = Proj(init=projection)
    lon, lat = dest(xx, yy, inverse=True)

    variables_anom = variable.split(",")
    variables = [re.sub('_anom$', '', v) for v in variables_anom]

    interp = {
        'method': 'inv_square',
        'neighbours': 8,
    }
    with Dataset(get_dataset_url(dataset), 'r') as ds:
        time_var = utils.get_time_var(ds)
        t = netcdftime.utime(time_var.units)
        timestamp = t.num2date(time_var[time])

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

    if variables != variables_anom:
        with Dataset(get_dataset_climatology(dataset), 'r') as ds:
            if len(variables) > 1:
                d0 = load_interpolated_grid(
                    lat, lon,
                    ds, variables[0], depth,
                    timestamp.month - 1, interpolation=interp)
                d1 = load_interpolated_grid(
                    lat, lon,
                    ds, variables[1], depth,
                    timestamp.month - 1, interpolation=interp)
                c = np.sqrt(d0 ** 2 + d1 ** 2)

            else:
                c = load_interpolated_grid(
                    lat, lon,
                    ds, variables[0], depth,
                    timestamp.month - 1, interpolation=interp)
            d = d - c

            m = max(abs(d.min()), abs(d.max()))
            return -m, m

    return d.min(), d.max()
