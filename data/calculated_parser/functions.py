#!/usr/bin/env python

import functools
from typing import Union

import metpy.calc
import numpy as np
import numpy.ma
import seawater
import xarray as xr
from metpy.units import units
from pint import UnitRegistry

_ureg = UnitRegistry()

# All functions in this file (that do not start with an underscore) will be
# available to the parser.

sin = np.sin
cos = np.cos
tan = np.tan
asin = np.arcsin
acos = np.arccos
atan = np.arctan

atan2 = np.arctan2

ln = np.log
log = np.log10
log2 = np.log2

abs = np.abs


def max(arg):
    return np.ravel(arg).max()


def min(arg):
    return np.ravel(arg).min()


def magnitude(a, b):
    """
    Calculates the element-wise magnitude of a and b:
    np.sqrt(a ** 2 + b ** 2). See:
    https://en.wikipedia.org/wiki/Hadamard_product_(matrices)

    Paramters:
    a: ndarray
    b: ndarray

    Returns:
        ndarray -- magnitude of a and b
    """
    return np.sqrt(a ** 2 + b ** 2)


def unstaggered_speed(u_vel, v_vel):
    """Calculate the speed of seawater current from u and v velocity component
    array that are on the u and v points of an Akawara-C staggered grid;
    see https://en.wikipedia.org/wiki/Arakawa_grids

    To correctly calculate the speed of the current, the velocity components have to be
    "unstaggered" by interpolating their values to the T-grid points at the centres of the
    grid cells. Here that is accomplished by averaging u(i-1) and u(i) values to get u values
    at the T-points. Likewise, v(j-1) and v(j) values are averaged to get v values at the T-points.

    With those arrays of unstaggered values, the speed of the current is calculated as the
    element-wise magnitude of u and v:
      np.sqrt(u ** 2 + v ** 2)
    See: https://en.wikipedia.org/wiki/Hadamard_product_(matrices)

    We assume that the dimension order of the velocity component arrays is (t, depth, y, x)
    or (t, y, x). So, we can pick out the dimensions that we need to shift along to average the
    velocity components to the T-points by indexing to the appropriate one of the final two
    dimensions to get its name.

    Paramters:
    u_vel: ndarray
    v_vel: ndarray

    Returns:
        ndarray -- speed of current
    """
    # Use indices here rather than hard coding dimension name strings.
    x_dim = u_vel.dims[-1]
    y_dim = v_vel.dims[-2]
    u_t_grid = (u_vel + u_vel.shift({x_dim: 1})) / 2
    v_t_grid = (v_vel + v_vel.shift({y_dim: 1})) / 2
    return numpy.sqrt(u_t_grid**2 + v_t_grid**2)


def __calc_pressure(depth, latitude):
    pressure = []
    try:
        pressure = [seawater.pres(d, latitude) for d in depth]
    except TypeError:
        pressure = seawater.pres(depth, latitude)

    return np.array(pressure)


def __validate_depth_lat_temp_sal(depth, latitude, temperature, salinity):

    if type(depth) is not np.ndarray:
        depth = np.array(depth)

    if type(latitude) is not np.ndarray:
        latitude = np.array(latitude)

    if type(temperature) is not np.ndarray:
        temperature = np.array(temperature)

    if type(salinity) is not np.ndarray:
        salinity = np.array(salinity)

    return depth, latitude, np.squeeze(temperature), np.squeeze(salinity)


def __find_depth_index_of_min_value(data: np.ndarray, depth_axis=0) -> np.ndarray:

    # Mask out NaN values to prevent an exception blow-up.
    masked = np.ma.masked_array(data, np.isnan(data))

    return np.argmin(masked, axis=depth_axis)


def __find_depth_index_of_max_value(data: np.ndarray, depth_axis=0) -> np.ndarray:
    # Mask out NaN values to prevent an exception blow-up.
    masked = np.ma.masked_array(data, np.isnan(data))

    return np.argmax(masked, axis=depth_axis)


def oxygensaturation(temperature: np.ndarray,
                     salinity: np.ndarray) -> np.ndarray:
    """
    Calculate the solubility (saturation) of
    Oxygen (O2) in seawater.

    Required Arguments:

    * temperature: temperature values in Celsius.
    * salinity: salinity values.
    """

    return seawater.satO2(salinity, temperature)


def nitrogensaturation(temperature: np.ndarray,
                       salinity: np.ndarray) -> np.ndarray:
    """
    Calculate the solubility (saturation) of
    Nitrogen (N2) in seawater.

    Required Arguments:

    * temperature: temperature values in Celsius.
    * salinity: salinity values.
    """

    return seawater.satN2(salinity, temperature)


def sspeed(depth: Union[np.ndarray, xr.Variable],
           latitude: np.ndarray,
           temperature: np.ndarray,
           salinity: np.ndarray) -> np.ndarray:
    """
    Calculates the speed of sound.

    Required Arguments:

    * depth: The depth(s) in meters
    * latitude: The latitude(s) in degrees North
    * temperature: The temperatures(s) in Celsius
    * salinity: The salinity (unitless)
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity)

    press = __calc_pressure(depth, latitude)

    if salinity.shape != press.shape:
        # pad array shape to match otherwise seawater freaks out
        press = press[..., np.newaxis]

    speed = seawater.svel(salinity, temperature, press)
    return np.squeeze(speed)


def density(depth, latitude, temperature, salinity) -> np.ndarray:
    """
    Calculates the density of sea water.

    Parameters:
    depth: The depth(s) in meters
    latitude: The latitude(s) in degrees North
    temperature: The temperatures(s) in Celsius
    salinity: The salinity (unitless)
    """

    press = __calc_pressure(depth, latitude)

    density = seawater.dens(salinity, temperature, press)
    return np.array(density)


def heatcap(depth, latitude, temperature, salinity) -> np.ndarray:
    """
    Calculates the heat capacity of sea water.

    Parameters:
    depth: The depth(s) in meters
    latitude: The latitude(s) in degrees North
    temperature: The temperatures(s) in Celsius
    salinity: The salinity (unitless)
    """

    press = __calc_pressure(depth, latitude)

    heatcap = seawater.cp(salinity, temperature, press)
    return np.array(heatcap)


def tempgradient(depth, latitude, temperature, salinity) -> np.ndarray:
    """
    Calculates the adiabatic temp gradient of sea water.

    Required Arguments:
        * depth: Depth in meters
        * latitude: Latitude in degrees North
        * temperature: Temperatures in Celsius
        * salinity: Salinity
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity)

    press = __calc_pressure(depth, latitude)

    tempgradient = seawater.adtg(salinity, temperature, press)
    return np.array(tempgradient)


def soniclayerdepth(depth, latitude, temperature, salinity) -> np.ndarray:
    """
    Find and return the depth of the maximum value of the speed
    of sound ABOVE the deep sound channel.

    Required Arguments:
        * depth: Depth in meters
        * latitude: Latitude in degrees North
        * temperature: Temperatures in Celsius
        * salinity: Salinity
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity)

    sound_speed = sspeed(depth, latitude, temperature, salinity)

    min_indices = __find_depth_index_of_min_value(sound_speed)

    # Mask out values below deep sound channel
    mask = min_indices.ravel()[..., np.newaxis] < np.arange(
        sound_speed.shape[0])
    mask = mask.T.reshape(sound_speed.shape)

    sound_speed[mask] = np.nan

    # Find sonic layer depth indices
    max_indices = __find_depth_index_of_max_value(sound_speed)

    return depth[max_indices]


def deepsoundchannel(depth, latitude, temperature, salinity) -> np.ndarray:
    """
    Find and return the depth of the minimum value of the
    speed of sound.

    https://en.wikipedia.org/wiki/SOFAR_channel

     Required Arguments:
        * depth: Depth in meters
        * latitude: Latitude in degrees North
        * temperature: Temperatures in Celsius
        * salinity: Salinity
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity)

    sound_speed = sspeed(depth, latitude, temperature, salinity)

    min_indices = __find_depth_index_of_min_value(sound_speed)

    return depth[min_indices]


def _metpy(func, data, lat, lon, dim):
    """Wrapper for MetPy functions

    Parameters:
    func -- the MetPy function
    data -- the xarray or netcdf variable (already sliced)
    lat -- an array of latitudes, the shape must match that of data
    lon -- an array of longitudes, the shape must match that of data
    dim -- the dimension to return, a string, x or y
    """
    if hasattr(data, "dims"):
        dims = data.dims
    else:
        dims = data.dimensions

    dx, dy = metpy.calc.lat_lon_grid_deltas(np.array(lon), np.array(lat))
    dim_order = "".join([d for d in dims if d in 'yx'])

    if dim_order == "yx":
        deltas = [dy, dx]
    else:
        deltas = [dx, dy]

    if len(dims) > 2:
        axes = list(range(0, len(dims)))
        new_axes = list(axes)
        new_dims = list(dims)
        if dim_order == 'yx':
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0,
                                                                     len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0,
                                                                     len(dims))))]

        data = np.transpose(np.array(data), new_axes)

        oshape = data.shape
        extra_axes = data.shape[:-2]
        data = np.reshape(data, (functools.reduce(np.multiply, extra_axes),
                                 *data.shape[-2:]))

        result = []
        for j in range(0, len(data)):
            result.append(
                func(np.array(data[j]), deltas=deltas, dim_order=dim_order)[
                    dim_order.index(dim)].magnitude
            )

        result = np.array(result)
        result = np.reshape(result, oshape)

        result = np.transpose(result, restore_axes)

        return result
    else:
        return func(np.array(data), deltas=deltas, dim_order=dim_order)[dim_order.index(dim)].magnitude


def _metpy_uv(func, u, v, lat, lon):
    """Wrapper for MetPy vector functions

    Parameters:
    func -- the MetPy function
    u -- the u-component xarray or netcdf variable (already sliced)
    v -- the v-component xarray or netcdf variable (already sliced)
    lat -- an array of latitudes, the shape must match that of data
    lon -- an array of longitudes, the shape must match that of data
    """
    if hasattr(u, "dims"):
        dims = u.dims
    else:
        dims = u.dimensions

    dx, dy = metpy.calc.lat_lon_grid_deltas(np.array(lon), np.array(lat))
    dim_order = "".join([d for d in dims if d in 'yx'])

    if len(dims) > 2:
        axes = list(range(0, len(dims)))
        new_axes = list(axes)
        new_dims = list(dims)
        if dim_order == 'yx':
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0,
                                                                     len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0,
                                                                     len(dims))))]

        u = np.transpose(np.array(u), new_axes)
        v = np.transpose(np.array(v), new_axes)

        oshape = u.shape
        extra_axes = u.shape[:-2]
        u = np.reshape(u, (functools.reduce(
            np.multiply, extra_axes), *u.shape[-2:]))
        v = np.reshape(v, (functools.reduce(
            np.multiply, extra_axes), *v.shape[-2:]))

        result = []
        for j in range(0, len(u)):
            result.append(
                func(
                    np.array(u[j]) * units.meter / units.second,
                    np.array(v[j]) * units.meter / units.second,
                    dx, dy, dim_order=dim_order).magnitude
            )

        result = np.array(result)
        result = np.reshape(result, oshape)

        result = np.transpose(result, restore_axes)

        return result
    else:
        u = np.array(u) * units.meter / units.second
        v = np.array(v) * units.meter / units.second
        return func(u, v, dx, dy, dim_order=dim_order).magnitude


def geostrophic_x(h, lat, lon):
    """Calculates the X component of geostrophic currents

    Parameters:
    h -- Sea Surface Height, xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of h
    lon -- an array of longitudes, the shape must match that of h
    """
    if isinstance(lat, xr.Variable):
        lat = lat.values

    if hasattr(h, "dims"):
        dims = h.dims
    else:
        dims = h.dimensions

    dim_order = "".join([d for d in dims if d in 'yx'])

    def f(heights, **kwargs):
        c = metpy.calc.coriolis_parameter(lat * _ureg.degrees)
        if dim_order == "yx":
            dy, dx = kwargs['deltas']
        else:
            dx, dy = kwargs['deltas']

        return metpy.calc.geostrophic_wind(xr.DataArray(heights), c, dx, dy,
                                           dim_order=kwargs['dim_order'])

    return _metpy(f, h, lat, lon, dim_order[0])


def geostrophic_y(h, lat, lon):
    """Calculates the Y component of geostrophic currents

    Parameters:
    h -- Sea Surface Height, xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of h
    lon -- an array of longitudes, the shape must match that of h
    """
    if isinstance(lat, xr.Variable):
        lat = lat.values

    if hasattr(h, "dims"):
        dims = h.dims
    else:
        dims = h.dimensions

    dim_order = "".join([d for d in dims if d in 'yx'])

    def f(heights, **kwargs):
        c = metpy.calc.coriolis_parameter(lat * _ureg.degrees)
        if dim_order == "yx":
            dy, dx = kwargs['deltas']
        else:
            dx, dy = kwargs['deltas']

        return metpy.calc.geostrophic_wind(xr.DataArray(heights), c, dx, dy,
                                           dim_order=kwargs['dim_order'])

    return _metpy(f, h, lat, lon, dim_order[1])


def vorticity(u, v, lat, lon):
    """Calculates the vorticity

    Parameters:
    u -- u component of the current, xarray or netcdf variable, already sliced
    v -- v component of the current, xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of u and v
    lon -- an array of longitudes, the shape must match that of u and v
    """
    return _metpy_uv(metpy.calc.vorticity, u, v, lat, lon)


def divergence(u, v, lat, lon):
    """Calculates the divergence

    Parameters:
    u -- u component of the current, xarray or netcdf variable, already sliced
    v -- v component of the current, xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of u and v
    lon -- an array of longitudes, the shape must match that of u and v
    """
    return _metpy_uv(metpy.calc.divergence, u, v, lat, lon)


def gradient_x(d, lat, lon):
    """Calculates the X component of the gradient of a variable

    Parameters:
    d -- xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of d
    lon -- an array of longitudes, the shape must match that of d
    """
    return _metpy(metpy.calc.gradient, d, lat, lon, 'x')


def gradient_y(d, lat, lon):
    """Calculates the Y component of the gradient of a variable

    Parameters:
    d -- xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of d
    lon -- an array of longitudes, the shape must match that of d
    """
    return _metpy(metpy.calc.gradient, d, lat, lon, 'y')
