#!/usr/bin/env python

import functools

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


def __calc_pressure(depth, latitude):
    pressure = []
    try:
        pressure = [seawater.pres(d, latitude) for d in depth]
    except TypeError:
        pressure = seawater.pres(depth, latitude)

    return pressure


def sspeed(depth, latitude, temperature, salinity):
    """
    Calculates the speed of sound.

    Parameters:
    depth: The depth(s) in meters
    latitude: The latitude(s) in degrees North
    temperature: The temperatures(s) in Celsius
    salinity: The salinity (unitless)
    """
    press = __calc_pressure(depth, latitude)

    speed = seawater.svel(salinity, temperature, press)
    return np.array(speed)


def density(depth, latitude, temperature, salinity):
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


def heatcap(depth, latitude, temperature, salinity):
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


def tempgradient(depth, latitude, temperature, salinity):
    """
    Calculates the adiabatic temp gradient of sea water.

    Parameters:
    depth: The depth(s) in meters
    latitude: The latitude(s) in degrees North
    temperature: The temperatures(s) in Celsius
    salinity: The salinity (unitless)
    """

    press = __calc_pressure(depth, latitude)

    tempgradient = seawater.adtg(salinity, temperature, press)
    return np.array(tempgradient)


def deepsoundchannel(depth, latitude, temperature, salinity):
    """
    Finds the minimum of the speed of sound.

    # https://en.wikipedia.org/wiki/SOFAR_channel

    Required Arguments:
        * depth: The depth(s) in meters
        * lat: The latitude(s) in degrees North
        * temperature: The temperatures(s) (at all depths) in Celsius
        * salinity: The salinity (at all depths)
    """

    sound_speed = sspeed(depth, latitude, temperature, salinity)

    # The resulting shape of sound_speed is (full_depth, lat_slice, lon_slice)
    # So we simply need to find the minimum sound speed along each lat/lon index
    # Using numpy axis magic, we want the minimum along the full_depth axis = 0.
    # https://stackoverflow.com/a/52468964/2231969

    return np.nanmin(sound_speed, axis=0)


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
            dx, dy = kwgard['deltas']

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
            dx, dy = kwgard['deltas']

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
