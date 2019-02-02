import numpy as np
import seawater
import metpy.calc
from metpy.units import units
import functools
import numpy.ma

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

def sspeed(depth, latitude, temperature, salinity):
    """
    Calculates the speed of sound.

    Parameters:
    depth: The depth(s) in meters
    latitude: The latitude(s) in degrees North
    temperature: The temperatures(s) in Celsius
    salinity: The salinity (unitless)
    """
    try:
        press = [seawater.pres(d, latitude) for d in depth]
    except TypeError:
        press = seawater.pres(depth, latitude)

    speed = seawater.svel(salinity, temperature, press)
    return np.array(speed)

def _metpy(func, data, lat, lon, dim):
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
            restore_axes = [x for _,x in sorted(zip(new_axes, range(0,
                len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            restore_axes = [x for _,x in sorted(zip(new_axes, range(0,
                len(dims))))]


        data = np.transpose(np.array(data), new_axes)
        
        oshape = data.shape
        extra_axes = data.shape[:-2]
        data = np.reshape(data, (functools.reduce(np.multiply, extra_axes),
            *data.shape[-2:]))

        result = []
        for j in range(0, len(u)):
            result.append(
                func(np.array(u[j]), deltas=deltas)[dim_order.index(dim)].magnitude
            )

        result = np.array(result)
        result = np.reshape(result, oshape)

        result = np.transpose(result, restore_axes)

        return result
    else:
        return func(np.array(data), deltas=deltas)[dim_order.index(dim)].magnitude

def _metpy_uv(func, u, v, lat, lon):
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
            restore_axes = [x for _,x in sorted(zip(new_axes, range(0,
                len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index('x'))]
            new_dims += [new_dims.pop(new_dims.index('x'))]
            new_axes += [new_axes.pop(new_dims.index('y'))]
            new_dims += [new_dims.pop(new_dims.index('y'))]
            restore_axes = [x for _,x in sorted(zip(new_axes, range(0,
                len(dims))))]

        u = np.transpose(np.array(u), new_axes)
        v = np.transpose(np.array(v), new_axes)
        
        oshape = u.shape
        extra_axes = u.shape[:-2]
        u = np.reshape(u, (functools.reduce(np.multiply, extra_axes), *u.shape[-2:]))
        v = np.reshape(v, (functools.reduce(np.multiply, extra_axes), *v.shape[-2:]))

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

def vorticity(u, v, lat, lon):
    return _metpy_uv(metpy.calc.vorticity, u, v, lat, lon)

def divergence(u, v, lat, lon):
    return _metpy_uv(metpy.calc.divergence, u, v, lat, lon)

def gradient_x(d, lat, lon):
    return _metpy(metpy.calc.gradient, d, lat, lon, 'x')

def gradient_y(d, lat, lon):
    return _metpy(metpy.calc.gradient, d, lat, lon, 'y')
