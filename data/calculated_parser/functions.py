#!/usr/bin/env python

import functools
from typing import Union

import metpy.calc
import numpy as np
import numpy.ma
import scipy.signal as spsignal
import gsw
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
        np.ndarray -- magnitude of a and b
    """
    return np.sqrt(a**2 + b**2)


def bearing(north_vel: xr.DataArray, east_vel: xr.DataArray) -> xr.DataArray:
    """
    Calculates the bearing (degrees clockwise positive from North) from
    component East and North vectors.

    Returns:
        xr.DataArray -- bearing of east_vel and north_vel
    """

    east_vel = np.squeeze(east_vel)
    north_vel = np.squeeze(north_vel)

    bearing = np.arctan2(north_vel, east_vel)
    bearing = np.pi / 2.0 - bearing
    bearing = xr.where(bearing < 0, bearing + 2 * np.pi, bearing)
    bearing *= 180.0 / np.pi

    # Deal with undefined angles (where velocity is 0 or very close)
    inds = np.where(np.logical_and(np.abs(east_vel) < 10e-6, np.abs(north_vel) < 10e-6))
    bearing.values[inds] = np.nan

    return bearing


def unstaggered_speed(u_vel, v_vel):
    """Calculate the speed of seawater current from u and v velocity component
    array that are on the u and v points of an Akawara-C staggered grid;
    see https://en.wikipedia.org/wiki/Arakawa_grids

    To correctly calculate the speed of the current, the velocity components have to be
    "unstaggered" by interpolating their values to the T-grid points at the centres of
    the grid cells. Here that is accomplished by averaging u(i-1) and u(i) values to get
    u values at the T-points. Likewise, v(j-1) and v(j) values are averaged to get v
    values at the T-points.

    With those arrays of unstaggered values, the speed of the current is calculated as
    the element-wise magnitude of u and v:
      np.sqrt(u ** 2 + v ** 2)
    See: https://en.wikipedia.org/wiki/Hadamard_product_(matrices)

    We assume that the dimension order of the velocity component arrays is (t, depth,
    y, x) or (t, y, x). So, we can pick out the dimensions that we need to shift along
    to average the velocity components to the T-points by indexing to the appropriate
    one of the final two dimensions to get its name.

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
        pressure = [gsw.conversions.p_from_z(d, latitude) for d in depth]
    except TypeError:
        pressure = gsw.conversions.p_from_z(depth, latitude)

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
    if not np.ma.is_masked(data):
        # Mask out NaN values to prevent an exception blow-up.
        masked = np.ma.masked_array(data, np.isnan(data))
        # TODO: could we use a .view() here instead of copying stuff?
    else:
        masked = data

    return np.argmin(masked, axis=depth_axis)


def __find_depth_index_of_max_value(data: np.ndarray, depth_axis=0) -> np.ndarray:
    if not np.ma.is_masked(data):
        # Mask out NaN values to prevent an exception blow-up.
        masked = np.ma.masked_array(data, np.isnan(data))
        # TODO: could we use a .view() here instead of copying stuff?
    else:
        masked = data

    return np.argmax(masked, axis=depth_axis)


def oxygensaturation(temperature: np.ndarray, salinity: np.ndarray) -> np.ndarray:
    """
    Calculate the solubility (saturation) of
    Oxygen (O2) in seawater.

    Required Arguments:

    * temperature: temperature values in Celsius.
    * salinity: salinity values.
    """

    return gsw.O2sol_SP_pt(salinity, temperature)


def nitrogensaturation(temperature: np.ndarray, salinity: np.ndarray) -> np.ndarray:
    """
    Calculate the solubility (saturation) of
    Nitrogen (N2) in seawater.

    Required Arguments:

    * temperature: temperature values in Celsius.
    * salinity: salinity values.
    """

    # 01/19/2024 gsw-python has not brought over N2sol from MATLAB
    ##########################################################
    ## Calculation taken from gsw matlab: gsw_N2sol_SP_pt.m ##
    transposed = False
    if len(salinity) == 1:
        temperature = np.transpose(temperature)
        salinity = np.transpose(salinity)
        transposed = True
    x = salinity
    T0 = 273.15
    y = np.log((298.15 - temperature) / (T0 + temperature))
    # The coefficents below are from Table 4 of Hamme and Emerson (2004)
    a0 = 6.42931
    a1 = 2.92704
    a2 = 4.32531
    a3 = 4.69149
    b0 = -7.44129e-3
    b1 = -8.02566e-3
    b2 = -1.46775e-2

    N2sol = np.exp(a0 + y * (a1 + y * (a2 + a3 * y)) + x * (b0 + y * (b1 + b2 * y)))

    if transposed:
        N2sol = np.transpose(N2sol)

    return N2sol

    ##########################################################


def sspeed(
    depth: Union[np.ndarray, xr.Variable],
    latitude: np.ndarray,
    temperature: np.ndarray,
    salinity: np.ndarray,
) -> np.ndarray:
    """
    Calculates the speed of sound.

    Required Arguments:

    * depth: The depth(s) in meters
    * latitude: The latitude(s) in degrees North
    * temperature: The temperatures(s) in Celsius
    * salinity: The salinity (unitless)
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity
    )

    press = __calc_pressure(depth, latitude)

    if salinity.shape != press.shape:
        # Need to pad press so it can broadcast against temperature and salinity.
        # eg. if using GIOPS and salinity has shape (3, 50, 3, 12) then press has
        # shape (50, 3). This logic pads press to give shape (1, 50, 3, 1).
        for ax, val in enumerate(salinity.shape):
            if ax > press.ndim - 1 or press.shape[ax] != val:
                press = np.expand_dims(press, axis=ax)

    speed = gsw.sound_speed(salinity, temperature, press)
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

    density = gsw.density.rho(salinity, temperature, press)
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

    heatcap = gsw.cp_t_exact(salinity, temperature, press)
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
        depth, latitude, temperature, salinity
    )

    press = __calc_pressure(depth, latitude)

    tempgradient = gsw.adiabatic_lapse_rate_from_CT(salinity, temperature, press)
    # K/Pa
    return np.array(tempgradient)


def __get_soniclayerdepth_mask(
    soundspeed: np.ndarray, min_depth_indices: np.ndarray
) -> np.ndarray:
    """
    Create mask which masks out values BELOW deep sound channel.
    """

    mask = min_depth_indices.ravel()[..., np.newaxis] <= np.arange(soundspeed.shape[0])

    return mask.T.reshape(soundspeed.shape)


def __soniclayerdepth_from_sound_speed(
    soundspeed: np.ndarray, depth: np.ndarray
) -> np.ndarray:
    min_indices = __find_depth_index_of_min_value(soundspeed)

    mask = __get_soniclayerdepth_mask(soundspeed, min_indices)

    soundspeed[mask] = np.nan

    # Find sonic layer depth indices
    max_indices = __find_depth_index_of_max_value(soundspeed)

    data = depth[max_indices]

    # Mask out surface depths, since sonic layer depth cannot physically
    # be present at the surface. Using np.nan  will make the main map have
    # transparent spots when the surface is masked out.
    data[data == depth[0]] = np.nan

    return data


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
        depth, latitude, temperature, salinity
    )

    sound_speed = sspeed(depth, latitude, temperature, salinity)
    if len(sound_speed.shape) > 3:  # if true dims are (time, depth, y, x)
        sound_speed = np.swapaxes(
            sound_speed, 0, 1
        )  # swap time and depth dims to ensure depth is 0th

    return __soniclayerdepth_from_sound_speed(sound_speed, depth)


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
        depth, latitude, temperature, salinity
    )

    sound_speed = sspeed(depth, latitude, temperature, salinity)
    if len(sound_speed.shape) > 3:  # if true dims are (time, depth, y, x)
        sound_speed = np.swapaxes(
            sound_speed, 0, 1
        )  # swap time and depth dims to ensure depth is 0th

    min_indices = __find_depth_index_of_min_value(sound_speed)

    return depth[min_indices]


def deepsoundchannelbottom(depth, latitude, temperature, salinity, bathy) -> np.ndarray:
    """
    Find and return the deep sound channel bottom (the second depth where
    the speed of sound is equal to the speed at the sonic layer depth).

    Note: Nearest Neighbour interpolation is used to find the depth value
          with closest sound speed value to the sonic layer depth.

    Required Arguments:
        * depth: Depth in meters
        * latitude: Latitude in degrees North
        * temperature: Temperatures in Celsius
        * salinity: Salinity
        * bathy: Model Bathymetry
    """

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity
    )

    # Use masked array to quickly enable/disable data (see below)
    sound_speed = np.ma.array(
        sspeed(depth, latitude, temperature, salinity), fill_value=np.nan
    )
    if len(sound_speed.shape) > 3:  # if true dims are (time, depth, y, x)
        sound_speed = np.swapaxes(
            sound_speed, 0, 1
        )  # swap time and depth dims to ensure depth is 0th

    min_indices = __find_depth_index_of_min_value(sound_speed)

    sound_speed.mask = __get_soniclayerdepth_mask(sound_speed, min_indices)

    # Find sonic layer depth indices
    max_indices = __find_depth_index_of_max_value(sound_speed)

    # Extract sound speed values for later comparison.
    sound_speed_values_at_sonic_layer_depth = np.squeeze(
        np.take_along_axis(
            sound_speed,
            max_indices[np.newaxis, :],  # pad to equate number of dims to sound_speed
            0,  # apply along depth axis
        )
    )
    sound_speed_values_at_sonic_layer_depth[np.where(max_indices == 0)] = np.nan

    # Flip the mask since we actually want to examine the values BELOW the sonic
    # layer depth.
    sound_speed.mask = ~sound_speed.mask

    # Use linear interpolation along axis 0 to compute DSCB. We find the two
    # points where sound_speed is closest to sound_speed_values_at_sonic_layer_depth
    # and interpolate between them.
    var_shape = sound_speed.shape
    if len(var_shape) == 3:
        grid = np.ogrid[: var_shape[-2], : var_shape[-1]]
    else:
        grid = np.ogrid[: var_shape[-3], : var_shape[-2], : var_shape[-1]]

    # Find closest sound speed values
    diff = np.abs(sound_speed - sound_speed_values_at_sonic_layer_depth)
    min_diff_0 = np.nanargmin(np.ma.masked_invalid(diff), axis=0)
    diff[tuple([min_diff_0, *grid])] = np.nan
    min_diff_1 = np.nanargmin(np.ma.masked_invalid(diff), axis=0)

    # Set up and perform linear interpolation
    x = sound_speed_values_at_sonic_layer_depth
    x0 = np.take_along_axis(sound_speed, min_diff_0[np.newaxis], axis=0)
    x1 = np.take_along_axis(sound_speed, min_diff_1[np.newaxis], axis=0)
    y0 = depth[min_diff_0]
    y1 = depth[min_diff_1]

    dscb = (y0 * (x1 - x) + y1 * (x - x0)) / (x1 - x0)
    dscb[dscb > bathy.data] = np.nan
    dscb[dscb < 0] = np.nan

    return np.squeeze(dscb)


def depthexcess(depth, latitude, temperature, salinity, bathy) -> np.ndarray:
    """
    Difference between the Deep Sound Channel Bottom and the Ocean Bottom.

    Required Arguments:

        * depth: Depth in meters

        * latitude: Latitude in degrees North

        * temperature: Temperatures in Celsius

        * salinity: Salinity

        * bathy: Model Bathymetry
    """

    dscb = deepsoundchannelbottom(depth, latitude, temperature, salinity, bathy)

    # Actually do the math.
    return np.abs(dscb - bathy.data)


def calculate_del_C(
    depth: np.ndarray,
    soundspeed: np.ndarray,
    minima: np.ndarray,
    maxima: np.ndarray,
    freq_cutoff: float,
    depth_index: int,
) -> np.ndarray:
    """
    Calculate ΔC from a given sound profile and freq cutoff
    Required Arguments:
       * depth: The depth(s) in meters
       * soundspeed: Speed of sound in m/s
       * minima: Minima ndarray of Speed of sound, which contains the index where the
                 minima occurs
       * maxima: Maxima ndarray of Speed of sound,  which contains the index where the
                 maxima occurs
       * freq_cutoff: Desired frequency cutoff in Hz
    Returns the value of ΔC, which will later be used inside the PSSC detection method
    """
    # Getting Cmin from the sound speed profile
    first_minimum = np.empty_like(minima, dtype="int64")
    # TODO: need to look at alternative for the following operation
    it = np.nditer(minima, flags=["refs_ok", "multi_index"])
    for x in it:
        array_size = x.tolist().size
        first_minimum[it.multi_index] = x.tolist()[0] if array_size > 0 else -1
    if depth_index == 1:
        Cmin = np.squeeze(
            np.take_along_axis(
                soundspeed, first_minimum[:, np.newaxis, :, :], axis=depth_index
            )
        )
    else:
        Cmin = np.squeeze(
            np.take_along_axis(
                soundspeed, first_minimum[np.newaxis, :, :], axis=depth_index
            )
        )
    Cmin[first_minimum == -1] = np.nan
    # calculating delZ
    first_maximum = np.empty_like(maxima, dtype="int64")
    it = np.nditer(maxima, flags=["refs_ok", "multi_index"])
    for x in it:
        array_size = x.tolist().size
        first_maximum[it.multi_index] = x.tolist()[0] if array_size > 0 else -1
    channel_start_depth = depth[first_maximum]
    channel_start_depth[first_maximum == -1] = np.nan
    if depth_index == 1:
        Cmax = np.squeeze(
            np.take_along_axis(
                soundspeed, first_maximum[:, np.newaxis, :, :], axis=depth_index
            )
        )
    else:
        Cmax = np.squeeze(
            np.take_along_axis(
                soundspeed, first_maximum[np.newaxis, :, :], axis=depth_index
            )
        )
    Cmax[first_minimum == -1] = np.nan
    # channel_end_depth = np.apply_along_axis(np.interp,0, Cmax,soundspeed,depth)
    channel_end_depth = np.empty_like(Cmax, dtype="float")
    it = np.nditer(Cmax, flags=["refs_ok", "multi_index"])
    if depth_index == 1:
        for x in it:
            channel_end_depth[it.multi_index] = np.interp(
                x,
                soundspeed[it.multi_index[0], :, it.multi_index[1], it.multi_index[2]],
                depth,
            )
    else:
        for x in it:
            channel_end_depth[it.multi_index] = np.interp(
                x, soundspeed[:, it.multi_index[0], it.multi_index[1]], depth
            )

    del_Z = channel_end_depth - channel_start_depth
    numerator = freq_cutoff * del_Z
    denominator = 0.2652 * Cmin
    final_denom = numerator / denominator
    final_denom = np.power(final_denom, 2)
    delC = Cmin / final_denom
    return delC


def potentialsubsurfacechannel(
    depth, latitude, temperature, salinity, freq_cutoff=2755.03
) -> np.ndarray:
    """
    Detect if there is sub-surface channel.
    Required Arguments:
       * depth: Depth in meters
       * latitude: Latitude in degrees North
       * temperature: Temperatures in Celsius
       * salinity: Salinity
       * freq_cutoff: Desired frequency cutoff in Hz
    Returns 1 if the profile has a sub-surface channel, 0 if the profile does not have
    a sub-surface channel
    """

    def find_point_extrema(sound_speed, depth_index):
        sound_speed_rolled = np.rollaxis(sound_speed, depth_index)
        sound_speed_rs = sound_speed_rolled.reshape(sound_speed_rolled.shape[0], -1)

        minima = np.empty(sound_speed_rs.shape[-1], dtype=object)
        maxima = np.empty(sound_speed_rs.shape[-1], dtype=object)

        for idx, row in enumerate(sound_speed_rs.transpose()):
            minima[idx] = spsignal.find_peaks(-row)[0]
            maxima[idx] = spsignal.find_peaks(row)[0]

        minima = minima.reshape(sound_speed_rolled.shape[1:])
        maxima = maxima.reshape(sound_speed_rolled.shape[1:])

        return minima, maxima

    depth, latitude, temperature, salinity = __validate_depth_lat_temp_sal(
        depth, latitude, temperature, salinity
    )

    # Trimming the profile considering the depth above 1000m
    depth = depth[depth < 1000]
    depth_length = len(depth)
    if temperature.ndim == 4:
        # data has time dimension
        depth_index = 1
    elif temperature.ndim == 3:
        depth_index = 0
    temp = np.take(temperature, indices=range(0, depth_length), axis=depth_index)
    sal = np.take(salinity, indices=range(0, depth_length), axis=depth_index)

    sound_speed = sspeed(depth, latitude, temp, sal)
    minima, maxima = find_point_extrema(sound_speed, depth_index)

    delC = calculate_del_C(depth, sound_speed, minima, maxima, freq_cutoff, depth_index)
    hasPSSC = np.zeros_like(minima, dtype="float")

    it = np.nditer(minima, flags=["refs_ok", "multi_index"])
    for minima_array in it:
        minima_list = minima_array.tolist()
        maxima_list = maxima[it.multi_index].tolist()
        if len(minima_list) >= 2:
            p1 = 0
            p2 = minima[it.multi_index].tolist()[0]
            if len(maxima_list) >= 2:
                p1 = maxima_list[0]
                p3 = maxima_list[1]
            else:
                p3 = maxima_list[0]
            if (
                p3 > p2
            ):  # if the only maximum is not higher in the water column than the minima
                if depth_index == 1:
                    p1_sound_speed = sound_speed[
                        it.multi_index[0], p1, it.multi_index[1], it.multi_index[2]
                    ]
                    p2_sound_speed = sound_speed[
                        it.multi_index[0], p2, it.multi_index[1], it.multi_index[2]
                    ]
                    p3_sound_speed = sound_speed[
                        it.multi_index[0], p3, it.multi_index[1], it.multi_index[2]
                    ]
                else:
                    p1_sound_speed = sound_speed[
                        p1, it.multi_index[0], it.multi_index[1]
                    ]
                    p2_sound_speed = sound_speed[
                        p2, it.multi_index[0], it.multi_index[1]
                    ]
                    p3_sound_speed = sound_speed[
                        p3, it.multi_index[0], it.multi_index[1]
                    ]

                c1 = abs(p1_sound_speed - p2_sound_speed)
                c2 = abs(p3_sound_speed - p2_sound_speed)

                if c1 > delC[it.multi_index] and c2 > delC[it.multi_index]:
                    hasPSSC[it.multi_index] = 1

    return hasPSSC


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
    dim_order = "".join([d for d in dims if d in "yx"])

    if dim_order == "yx":
        deltas = [dy, dx]
    else:
        deltas = [dx, dy]

    if len(dims) > 2:
        axes = list(range(0, len(dims)))
        new_axes = list(axes)
        new_dims = list(dims)
        if dim_order == "yx":
            new_axes += [new_axes.pop(new_dims.index("y"))]
            new_dims += [new_dims.pop(new_dims.index("y"))]
            new_axes += [new_axes.pop(new_dims.index("x"))]
            new_dims += [new_dims.pop(new_dims.index("x"))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0, len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index("x"))]
            new_dims += [new_dims.pop(new_dims.index("x"))]
            new_axes += [new_axes.pop(new_dims.index("y"))]
            new_dims += [new_dims.pop(new_dims.index("y"))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0, len(dims))))]

        data = np.transpose(np.array(data), new_axes)

        oshape = data.shape
        extra_axes = data.shape[:-2]
        data = np.reshape(
            data, (functools.reduce(np.multiply, extra_axes), *data.shape[-2:])
        )

        result = []
        for j in range(0, len(data)):
            result.append(
                func(np.array(data[j]), deltas=deltas, dim_order=dim_order)[
                    dim_order.index(dim)
                ].magnitude
            )

        result = np.array(result)
        result = np.reshape(result, oshape)

        result = np.transpose(result, restore_axes)

        return result
    else:
        return func(np.array(data), deltas=deltas, dim_order=dim_order)[
            dim_order.index(dim)
        ].magnitude


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
    dim_order = "".join([d for d in dims if d in "yx"])

    if len(dims) > 2:
        axes = list(range(0, len(dims)))
        new_axes = list(axes)
        new_dims = list(dims)
        if dim_order == "yx":
            new_axes += [new_axes.pop(new_dims.index("y"))]
            new_dims += [new_dims.pop(new_dims.index("y"))]
            new_axes += [new_axes.pop(new_dims.index("x"))]
            new_dims += [new_dims.pop(new_dims.index("x"))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0, len(dims))))]
        else:
            new_axes += [new_axes.pop(new_dims.index("x"))]
            new_dims += [new_dims.pop(new_dims.index("x"))]
            new_axes += [new_axes.pop(new_dims.index("y"))]
            new_dims += [new_dims.pop(new_dims.index("y"))]
            restore_axes = [x for _, x in sorted(zip(new_axes, range(0, len(dims))))]

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
                    dx,
                    dy,
                    dim_order=dim_order,
                ).magnitude
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

    dim_order = "".join([d for d in dims if d in "yx"])

    def f(heights, **kwargs):
        c = metpy.calc.coriolis_parameter(lat * _ureg.degrees)
        if dim_order == "yx":
            dy, dx = kwargs["deltas"]
        else:
            dx, dy = kwargs["deltas"]

        return metpy.calc.geostrophic_wind(
            xr.DataArray(heights), c, dx, dy, dim_order=kwargs["dim_order"]
        )

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

    dim_order = "".join([d for d in dims if d in "yx"])

    def f(heights, **kwargs):
        c = metpy.calc.coriolis_parameter(lat * _ureg.degrees)
        if dim_order == "yx":
            dy, dx = kwargs["deltas"]
        else:
            dx, dy = kwargs["deltas"]

        return metpy.calc.geostrophic_wind(
            xr.DataArray(heights), c, dx, dy, dim_order=kwargs["dim_order"]
        )

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
    return _metpy(metpy.calc.gradient, d, lat, lon, "x")


def gradient_y(d, lat, lon):
    """Calculates the Y component of the gradient of a variable

    Parameters:
    d -- xarray or netcdf variable, already sliced
    lat -- an array of latitudes, the shape must match that of d
    lon -- an array of longitudes, the shape must match that of d
    """
    return _metpy(metpy.calc.gradient, d, lat, lon, "y")
