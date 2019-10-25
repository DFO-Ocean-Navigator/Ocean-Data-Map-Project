#!/usr/bin/env python

import functools

import metpy.calc
import numpy as np
import numpy.ma
import seawater
import xarray as xr
from metpy.units import units
from pint import UnitRegistry
from scipy.signal import argrelextrema
from scipy.stats import linregress
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


def count_numerical_vals(array):
    return array.size - np.count_nonzero(np.isnan(array))

def find_sca_idx(speed):
    """
    (Helper Function)
    Finds the idx (depth layer) of the Sound Channel Axis

    Parameters:
    speed: np.array of sound speed values in a single point profile

    note: sca - Sound Channel Axis
    """
    
    sca_value = np.nanmin(speed)
    if np.isnan(sca_value):
        return np.nan

    idx = np.where(speed == sca_value)    
    idx = int(idx[0][0])

    if idx is 0:
        return np.nan
    
    return idx


def find_sld_idx(sca_idx, speed):
    """
    (Helper Function)
    Returns the idx (depth layer) of the Sonic Layer Depth

    Parameters:
    sca_idx: integer indicating location of value inn speed[x][y]
    speed: np.array of sound speed values in a single point profile

    note: sld - Sonic Layer Depth
    """
    
    subset = speed[0:int(sca_idx) + 1]
    sld_value = subset.max()
    if np.isnan(sld_value):
        return np.nan
    
    # No shifting, idx in subset is same as idx in full array
    sld_idx = np.where(subset == sld_value)[0][0]

    return int(sld_idx)


def find_cd_idx(sca_idx, sld_idx, speed):
    """
    (Helper Function)
    Finds the index in speed[x][y] of the Critical Depth

    Parameters:
    sca_idx: integer indicating location of value in speed[x][y]
    sld_idx: integer indicating location of vlaue in speed[x][y]
    speed: np.array of data values in a single point profile

    note: cd - Critical Depth
    """

    # No critical depth exists
    if sca_idx == sld_idx:
        return np.nan

    # Find Sound Layer Depth
    sld_value = speed[sld_idx]

    # Find total_idx
    total_idx = count_numerical_vals(speed) - 1  #speed.size - np.count_nonzero(np.isnan(speed)) - 1
    
    # Create Layer Subset
    lower_subset = speed[sca_idx + 1: total_idx + 1]

    if lower_subset.size == 0:
        return np.nan

    # Find min and max value of subset
    min_value = np.nanmin(lower_subset)
    max_value = np.nanmax(lower_subset)

    # Determine if Critical Depth exists
    if max_value < sld_value:
        return np.nan

    # Find closest idx to sld_value
    idx = np.abs(lower_subset - sld_value).argmin()

    # Find size of lower subset
    subset_size = count_numerical_vals(lower_subset) - 1 #lower_subset.size - np.count_nonzero(np.isnan(lower_subset)) - 1

    # Shift to get index for non subset
    cd_idx = total_idx - (subset_size - idx)

    return cd_idx

def cd_interpolation(cd_idx, sld_idx, speed_point, depth):

    """
    (Helper Function)
    Finds the Critical Depth using linear interpolation

    Parameters:
    cd_idx: Index of the nearest value to critical depth
    sld_idx: Index of the Sound Layer Depth
    speed_point: np.array of sound speed for a water column
    depth: np.array of available depths
    """

    # Now that we have the nearest critical depth idx we must perform linear interpolation
    def linearInterp(x1, y1, x2, y2, x):
        """
        Finds the linear interpolation given 2 points

        x1: X value (sspeed) of the first point
        y1: Y value (depth) of the first point
        x2: X value (sspeed) of the second point
        y2: Y value (depth) of the seconnd point
        """
        y = y1 + ((x - x1) * ((y2 - y1) / (x2 - x1)))
        return y

    sld_value = speed_point[sld_idx]
    cd_value = speed_point[cd_idx]
    cd_depth = depth.values[cd_idx]

    if cd_value < sld_value:
        
        # Find 2 Points
        cd_value_1 = cd_value
        cd_value_2 = speed_point[cd_idx + 1]

        cd_depth_1 = depth.values[cd_idx]
        cd_depth_2 = depth.values[cd_idx + 1]

        cd_depth = linearInterp(cd_value_1, cd_depth_1, cd_value_2, cd_depth_2, sld_value)

    elif cd_value > sld_value:
        
        # Find 2 Points
        cd_value_1 = speed_point[cd_idx - 1]
        cd_value_2 = cd_value

        cd_depth_1 = depth.values[cd_idx - 1]
        cd_depth_2 = depth.values[cd_idx]

        cd_depth = linearInterp(cd_value_1, cd_depth_1, cd_value_2, cd_depth_2, sld_value)

    return cd_depth


def __is_min(p1, p2, p3):
    if p2 < p1 and p2 < p3:
        return p2
    else:
        return np.nan

def sscp_point(sspeed, max_idx):
    """
    sscp - Secondary Sound Channel Potential (above 1000m)
    This function determines if a secondary sound channel could exist in a water column

    Parameters:
    sspeed: np.array of sound speeds for a single water column
    
    Ensures:
    Returns either np.nan or 1
    """
    
    mins = argrelextrema(sspeed, np.less)
    if len(mins[0]) > 2:
        return 1
    else:
        return 0

            
def sscp(depth, lat, temperature,salinity):
    """
    Determines if a Secondary Sound Channel could exist (above 1000m)

    Parameters:
    depth: The depth(s) in meters
    lat: The latitude(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)
    """

    speed = sspeed(depth, lat, temperature, salinity)

    # Find last index before 1000m
    max_depth = np.abs(depth.values - 1000).argmin()
    if depth.values[max_depth] > 1000:
        max_depth = max_depth - 1
    
    #speed = speed[:max_depth] # Don't need anything beyond 1000m

    result = np.empty((speed.shape[-2], speed.shape[-1]))
    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            speed_point = speed[:,y,x]
            num = count_numerical_vals(speed_point)
            if num != 0:
                speed_point = speed_point[:num]
                result[y,x] = sscp_point(speed_point, max_depth)
            else:
                result[y,x] = 0

    return result

def slopeofsomething_point(sspeed, depth):
    """
    Finds the slope of the subset before the change in slope becomes too positvie
    => Threshold must still be determined

    Parameters:
    sspeed: Speed of sound subsetted from Sonic Layer Depth to Sound Channel Axis of a sound channel
    depth: Depth layers subsetted using the criteria as sspeed
    """

    temp_sspeed = sspeed
    temp_depth = depth
    previous_slope, intercept, r_value, p_value, std_err = linregress(temp_sspeed, temp_depth)

    while True:

        temp_sspeed = temp_sspeed[:temp_sspeed.shape[0]-1]
        temp_depth = temp_sspeed[:temp_depth.shape[0]-1]
        if np.isnan(np.min(temp_sspeed)) or np.isnan(np.min(temp_depth)):
            print(something)
        new_slope, intercept, r_value, p_value, std_err = linregress(temp_sspeed, temp_depth)

        # Determine breaking condition
        if previous_slope - new_slope < 0.5:
            return previous_slope
        elif temp_sspeed.shape[0] == 2:
            return np.nan
        
        previous_slope = new_slope

    return np.nan

def slopeofsomething(depth, lat, temperature, salinity):
    """
    Find the slope of the change in sound speed after the sonic layer depth

    Parameters:
    depth: The depth(s) in meters
    lat: The latitudes(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)
    """

    speed = sspeed(depth, lat, temperature, salinity)
    result = np.empty((speed.shape[-2], speed.shape[-1]))

    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            speed_point = speed[:,y,x]
            num = count_numerical_vals(speed_point)
            if num != 0:
                sca_idx = find_sca_idx(speed_point)
                if np.isnan(sca_idx):
                    return sca_idx
                
                sld_idx = find_sld_idx(sca_idx, speed_point)
                if np.isnan(sld_idx):
                    return sld_idx
                
                speed_point = speed_point[sld_idx:sca_idx]
                num = count_numerical_vals(speed_point)
                slope = slopeofsomething_point(speed_point[:num], depth[:num])
                result[y,x] = slope

    return result

def soundchannelaxis(depth, lat, temperature, salinity):
    """
    Finds the global minimum of the speed of sound

    Parameters:
    depth: The depth(s) in meters
    lat: The latitude(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)
    """
    
    speed = sspeed(depth, lat, temperature, salinity)
    result = np.empty((speed.shape[-2], speed.shape[-1]))
    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            speed_point = speed[:,y,x]
            if count_numerical_vals(speed_point) != 0:
                idx = find_sca_idx(speed_point)
                if np.isnan(idx):
                    result[y,x] = idx
                else:
                    result[y,x] = depth.values[idx]
            else:
                result[y,x] = np.nan
                
    return result

def soniclayerdepth(depth, lat, temperature, salinity):
    """
    Finds the local maxima of the speed of sound (local maxima is before the sound channel axis)

    Parameters:
    depth: The depth(s) in meters
    lat: The latitude(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)

    Note:
    sld is the critical depth (the DEPTH at which the sspeed local maxima occurs)
    sld_value, is the value of the sound speed at the critical depth
    """
    
    # Find speed of sound
    speed = sspeed(depth, lat, temperature, salinity)
    result = np.empty((speed.shape[-2], speed.shape[-1]))
    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            speed_point = speed[:,y,x]
            if (count_numerical_vals(speed_point) != 0):
                
                sca_idx = find_sca_idx(speed_point)
                if (np.isnan(sca_idx)):
                    result[y,x] = sca_idx
                else:
                    sld_idx = find_sld_idx(sca_idx, speed_point)

                    if (np.isnan(sld_idx)):
                        result[y,x] = sld_idx
                    else:
                        sld = depth.values[sld_idx]
                        result[y,x] = sld
            else:
                result[y,x] = np.nan

    return result # Only return one horizontal slice

def criticaldepth(depth, lat, temperature, salinity):
    """
    Finds the next occurence (after the sound channel axis) of the sound speed associated with the sonic layer depth

    Parameters:
    depth: The depth(s) in meters
    lat: The latitude(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)
    """

    speed = sspeed(depth, lat, temperature, salinity)
    result = np.empty((speed.shape[-2], speed.shape[-1]))
    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            speed_point = speed[:,y,x]
            if count_numerical_vals(speed_point):
            
                sca_idx = find_sca_idx(speed_point)

                # Sound Channel Axis Exists
                if not np.isnan(sca_idx):
                    sld_idx = find_sld_idx(sca_idx, speed_point)

                    # Sound Layer Depth Exists
                    if not np.isnan(sld_idx):
                        cd_idx = find_cd_idx(sca_idx, sld_idx, speed_point)
                        
                        # Critical Depth Exists
                        if not np.isnan(cd_idx):
                            # Now that we have the nearest critical depth idx we must perform linear interpolation
                            cd_depth = cd_interpolation(cd_idx, sld_idx, speed_point, depth)

                        else:
                            cd_depth = np.nan
                    else:
                        cd_depth = np.nan
            else:
                cd_depth = np.nan

            result[y,x] = cd_depth
                

    return result

def depthexcess(depth, lat, temperature, salinity):
    """
    Finds difference between the maximum depth and the critical depth for every point in a given area

    Parameters:
    depth: The depth(s) in meters
    lat: The latitude(s) in degrees North
    temperature: The temperatures(s) (at all depths) in celsius
    salinity: The salinity (at all depths) (unitless)
    """

    speed = sspeed(depth, lat, temperature, salinity)
    result = np.empty((speed.shape[-2], speed.shape[-1]))
    for x in range(speed.shape[-1]):
        for y in range(speed.shape[-2]):
            # Check for all nan slice
            speed_point = speed[:,y,x]
            if count_numerical_vals(speed_point):
                sca_idx = find_sca_idx(speed_point)
                if not np.isnan(sca_idx):
                
                    sld_idx = find_sld_idx(sca_idx, speed_point)

                    if not np.isnan(sld_idx):
                        cd_idx = find_cd_idx(sca_idx, sld_idx, speed_point)
                        if not np.isnan(cd_idx):
                            
                            # Now that we have the nearest critical depth idx we must perform linear interpolation
                            cd_depth = cd_interpolation(cd_idx, sld_idx, speed_point, depth)
                            total_idx = speed_point.size - np.count_nonzero(np.isnan(speed_point)) - 1
                            max_depth = depth.values[total_idx]
                            depth_excess = max_depth - cd_depth
                            if depth_excess < 0:
                                depth_excess = np.nan
                        else:
                            depth_excess = np.nan
                    else:
                        depth_excess = np.nan
            else:
                depth_excess = np.nan

            result[y,x] = depth_excess
                

    return result


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
