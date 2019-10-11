import numpy as np
import seawater
import metpy.calc
from metpy.units import units
import functools
import numpy.ma
import xarray as xr
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


def sspeedmin(depth, lat, lon, temperature, salinity):
    """
    Finds the global minimum of the speed of sound

    Parameters:
    sspeed: Speed of Sound
    latitude: The latitude(s) in degrees North
    """
    
    speed = sspeed(depth, lat, temperature, salinity)
    speed = speed.transpose()
    
    for x in range(speed.shape[0]):
        for y in range(speed.shape[1]):
            min_val = np.nanmin(speed[x][y])
            idx = np.where(speed[x][y] == min_val)
            if (np.isnan(min_val)):
                pass
            elif idx[0].shape[0] > 1:
                idx = idx[0][0]

                speed[x][y] = depth.values[idx]
            else:
                speed[x][y] = depth.values[idx]
            #speed[x][y] = depth[np.where(speed[x][y] == np.nanmin(speed[x][y]))]  #np.nanmin(speed[x][y])
    
    speed = speed.transpose()

    speed = speed[0]

    return np.array(speed)

def soniclayerdepth(depth, lat, lon, temperature, salinity):
    """
    Finds the local maxima of the speed of sound

    Parameters:
    sspeed: Speed of Sound
    latitude: The latitude(s) in degrees North
    """
    
    speed = sspeed(depth, lat, temperature, salinity)
    speed = speed.transpose()
    print(something)
    sld = 0
    for x in range(speed.shape[0]):
        for y in range(speed.shape[1]):
            sca_value = np.nanmin(speed[x][y])
            sca_idx = np.where(speed[x][y] == sca_value)
            
            if (np.isnan(sca_value)):
                pass
            else:
                sca_idx = sca_idx[0][0]

                subset = speed[x][y][0:int(sca_idx) + 1]
                sld_value = subset.max()
                
                if (np.isnan(sld_value)):
                    pass
                else:
                    sld_idx = np.where(subset == sld_value)[0][0]
                    sld = depth.values[sld_idx]
                    speed[x][y] = sld

    speed = speed.transpose()
    speed = speed[0]
    return np.array(speed)


def find_sca_idx(speed):
    """


    Parameters:
    speed: np.ndarray as point profile
    """
    
    sca_value = np.nanmin(speed)
    idx = np.where(speed == sca_value)

    if np.isnan(sca_value):
        return np.nan

    idx = idx[0][0]

    return int(idx)


def find_sld_idx(sca_idx, speed):
    """
    Returns the index of the sound layer depth
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
    Finds the index in speed[x][y] of the Critical Depth

    Parameters:
    sca_idx: integer indicating location of value in speed[x][y]
    sld_idx: integer indicating location of vlaue in speed[x][y]
    speed: np.array of data values in a single point profile
    """

    # No critical depth exists
    if sca_idx == sld_idx:
        return np.nan

    # Find Sound Layer Depth
    sld_value = speed[sld_idx]

    # Find total_idx
    total_idx = speed.size - np.count_nonzero(np.isnan(speed)) - 1
    
    # Create Layer Subset
    lower_subset = speed[sca_idx + 1: total_idx + 1]

    # Find min and max value of subset
    min_value = np.nanmin(lower_subset)
    max_value = np.nanmax(lower_subset)

    # Determine if Critical Depth exists
    if max_value < sld_value:
        return np.nan

    # Find closest idx to sld_value
    idx = np.abs(lower_subset - sld_value).argmin()

    # Find size of lower subset
    subset_size = lower_subset.size - np.count_nonzero(np.isnan(lower_subset)) - 1

    # Shift to get index for non subset
    cd_idx = total_idx - (subset_size - idx)

    return cd_idx


def criticaldepth(depth, lat, lon, temperature, salinity):
    """
    Finds the next location of the sonic layer depth.

    Parameters:
    sspeed: Speed of Sound
    latitude: The latitude(s) in degrees North
    """

    speed = sspeed(depth, lat, temperature, salinity)
    speed = speed.transpose()
    sld = 0
    sca = 0
    for x in range(speed.shape[0]):
        for y in range(speed.shape[1]):
            if (speed[x][y].size - np.count_nonzero(np.isnan(speed[x][y]))) != 0:
                speed_point = speed[x][y]
                sca_idx = find_sca_idx(speed_point)
                if not np.isnan(sca_idx):
                
                    sld_idx = find_sld_idx(sca_idx, speed_point)

                    if not np.isnan(sld_idx):
                        cd_idx = find_cd_idx(sca_idx, sld_idx, speed_point)
                        if not np.isnan(cd_idx):
                            cd_value = speed_point[cd_idx]
                        else:
                            cd_value = np.nan
                    else:
                        cd_value = np.nan

            speed[x][y] = cd_value
                #sca_value = np.nanmin(speed[x][y])
                #sca_idx = np.where(speed[x][y] == sca_value)


                #if (np.isnan(sca_value)):
                #    speed[x][y] = np.nan
                #else:
                #    sca_idx = sca_idx[0][0]

                    # Set the SCA
                #    sca = depth.values[sca_idx]

                #if (np.isnan(sca_value)):
                #    speed[x][y] = np.nan
                #else:

                #    last_idx = speed[x][y].size - np.count_nonzero(np.isnan(speed[x][y])) - 1
                #    subset = speed[x][y][0:int(sca_idx) + 1]
                #    lower_subset = speed[x][y][int(sca_idx) +1: last_idx + 1]
                #    if lower_subset.size == 0:
                #        speed[x][y] = np.nan
                #    else:
                #        sld_value = subset.max()

                #        lower_subset_max = np.nanmax(lower_subset)

                #        if lower_subset_max < sld_value and sld_value != sca_value:
                #            speed[x][y] = np.nan
                #        else:
                #            cd_idx = np.abs(lower_subset - sld_value).argmin()
                #            cd_idx = last_idx - lower_subset.size - 1 - cd_idx
                #            print(something)
                            
                #            cd_value = speed[x][y][cd_idx]

                #            if cd_value > sld_value:
                #                # Find previous point
                #                cd_idx_1 = cd_idx - 1
                #                cd_idx_2 = cd_idx

                #                cd_value_1 = speed[x][y][cd_idx_1]
                #                cd_value_2 = speed[x][y][cd_idx_2]

                #                cd_depth_1 = depth.values[cd_idx_1]
                #                cd_depth_2 = depth.values[cd_idx_2]
                #                print(something)

                #            elif cd_value < sld_value:
                                # Find next point
                #                cd_idx_1 = cd_idx
                #                cd_idx_2 = cd_idx + 1

                #                cd_value_1 = speed[x][y][cd_idx_1]
                #                cd_value_2 = speed[x][y][cd_idx_2]

                #                cd_depth_1 = depth.values[cd_idx_1]
                #                cd_depth_2 = depth.values[cd_idx_2]
                #                print(something)                    
                    
                    
                    #if (np.isnan(sld_value)):
                    #    speed[x][y] = np.nan
                    #    pass
                    #else:
                    #    #speed[x][y] = depth.values[sca_idx]
                    #    sld_idx = np.where(subset == sld_value)[0][0]
                    #    sld = depth.values[sld_idx]
                        
                        # Count non nan values
                    #    last_idx = speed[x][y].size - np.count_nonzero(np.isnan(speed[x][y])) - 1
                    #    lower_subset = speed[x][y][int(sca_idx) + 1:last_idx + 1]
                    #    if lower_subset.size != 0:
                    #        cd_lower_idx = (np.abs(lower_subset - sld_value)).argmin() + 1
                            
                    #        cd_idx = cd_lower_idx + int(sca_idx)
                            
                    #        cd = depth.values[cd_idx]
                    #        cd_value = speed[x][y][cd_idx]
                    #        def linearInterp(x1, y1, x2, y2, x):
                    #            """
                    #            Finds the linear interpolation given 2 points
                    #            """    
                    #            y = y1 + ((x - x1) * ((y2 - y1) / (x2 - x1)))
                    #            return y
                            # Perform linear interpolation to improve accuracy
                    #        if cd_idx == last_idx and cd_value < sld_value:
                    #            cd = np.nan
                    #        elif cd_value < sld_value:
                    #            cd_idx_1 = cd_idx
                    #            cd_idx_2 = cd_idx + 1
                    #            cd_value_1 = cd_value
                    #            cd_value_2 = speed[x][y][cd_idx_2]
                    #            cd_depth_1 = depth.values[cd_idx_1]
                    #            cd_depth_2 = depth.values[cd_idx_2]
                    #            cd = linearInterp(cd_value_1, cd_depth_1, cd_value_2, cd_depth_2, sld_value)
                    #        elif cd_value > sld_value:
                    #            cd_idx_1 = cd_idx - 1
                    #            cd_idx_2 = cd_idx
                    #            cd_value_1 = speed[x][y][cd_idx_1]
                    #            cd_value_2 = cd_value
                    #            cd_depth_1 = depth.values[cd_idx_1]
                    ###            cd_depth_2 = depth.values[cd_idx_2]
                    #            cd = linearInterp(cd_value_1, cd_depth_1, cd_value_2, cd_depth_2, sld_value)
                    #        if cd >10000 or cd < 0:
                    #            print(something)
                    #        speed[x][y] = cd
                    #    """
                
                #if (np.isnan(sld_value)):
                #    speed[x][y] = 0
                #else:
                #    lower_subset = speed[x][y][int(sca_idx) + 1:]
                #    criticaldepth_idx = 0
                    #print(something)
                #    if True: #lower_subset.max() >= sld_value and (sld_value != sca_value):
                #        criticaldepth_idx = (np.abs(lower_subset - sld_value)).argmin()
                        
                        # Initialize IDX variables
                #        depth_idx_1 = 0
                #        depth_idx_2 = 0

                        # Decide on the order of points for linear interpolation
                #        if lower_subset[criticaldepth_idx] < sld_value:
                #            depth_idx_1 = criticaldepth_idx + int(sca_idx) + 1
                #            depth_idx_2 = depth_idx_1 + 1
                #        else:
                #            depth_idx_2 = criticaldepth_idx + int(sca_idx) + 1
                #            depth_idx_1 = depth_idx_2 - 1
                        
                        # Organize values for linear interpolation
                #        depth_value_1 = depth.values[depth_idx_1]
                #        depth_value_2 = depth.values[depth_idx_2]
                #        cd_value_1 = speed[x][y][depth_idx_1]
                #        cd_value_2 = speed[x][y][depth_idx_2]

                        # Perform Linear Interpolation Calculation
                #        cd_final = depth_value_1 + (sld_value - cd_value_1) * ((depth_value_2 - depth_value_1) / (cd_value_2 - cd_value_1))
                #        speed[x][y] = cd_final
                    
                #    else:
                #        speed[x][y] = 0

    speed = speed.transpose()
    speed = speed[0]
    return np.array(speed)

def depthexcess(depth, lat, lon, temperature, salinity):
    """
    Finds the next location of the sonic layer depth.

    Parameters:
    sspeed: Speed of Sound
    latitude: The latitude(s) in degrees North
    """

    speed = sspeed(depth, lat, temperature, salinity)
    speed = speed.transpose()
    sld = 0
    for x in range(speed.shape[0]):
        for y in range(speed.shape[1]):
            

            sca_value = np.nanmin(speed[x][y])
            
            if (np.isnan(sca_value)):
                speed[x][y] = 0
            else:
                sca_idx = np.where(speed[x][y] == sca_value)
                sca_idx = sca_idx[0][0]

                subset = speed[x][y][0:int(sca_idx) + 1]
                sld_value = subset.max()
                
                
                if (np.isnan(sld_value)):
                    speed[x][y] = 0
                else:
                    lower_subset = speed[x][y][int(sca_idx) + 1:]
                    criticaldepth_idx = 0
                    if lower_subset.max() >= sld_value and (sld_value != sca_value):
                        criticaldepth_idx = (np.abs(lower_subset - sld_value)).argmin()
                        
                        # Initialize IDX variables
                        depth_idx_1 = 0
                        depth_idx_2 = 0

                        # Decide on the order of points for linear interpolation
                        if lower_subset[criticaldepth_idx] < sld_value:
                            depth_idx_1 = criticaldepth_idx + int(sca_idx) + 1
                            depth_idx_2 = depth_idx_1 + 1
                        else:
                            depth_idx_2 = criticaldepth_idx + int(sca_idx) + 1
                            depth_idx_1 = depth_idx_2 - 1
                        
                        # Organize values for linear interpolation
                        depth_value_1 = depth.values[depth_idx_1]
                        depth_value_2 = depth.values[depth_idx_2]
                        cd_value_1 = speed[x][y][depth_idx_1]
                        cd_value_2 = speed[x][y][depth_idx_2]

                        # Perform Linear Interpolation Calculation
                        cd_final = depth_value_1 + (sld_value - cd_value_1) * ((depth_value_2 - depth_value_1) / (cd_value_2 - cd_value_1))

                        # Find sea floor depth at this point
                        max_depth_idx = speed[x][y].size - np.count_nonzero(np.isnan(speed[x][y]))
                        max_depth = depth.values[max_depth_idx - 1]
                        depthexcess = max_depth - cd_final
                        speed[x][y] = depthexcess
                        
                    else:
                        speed[x][y] = 0

    speed = speed.transpose()
    speed = speed[0]
    return np.array(speed)


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
        for j in range(0, len(data)):
            result.append(
                func(np.array(data[j]), deltas=deltas, dim_order=dim_order)[dim_order.index(dim)].magnitude
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
