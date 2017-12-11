###############################################################################
# Find nearest grid point
#
# Author: Clyde Clements
# Created: 2017-07-19 14:44:58 -0230
#
# This module finds the indices of a point on a lat/lon grid that is closest to
# a specified lat/lon location.
###############################################################################

from math import pi
import sys

import xarray as xr
import numpy as np
from pykdtree.kdtree import KDTree


def find_nearest_grid_point(
        lat,           # type: float
        lon,           # type: float
        dataset,       # type: xr.Dataset
        lat_var_name,  # type: str
        lon_var_name,  # type: str
        n=1            # type: int
):  # type: (np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray)
    # Note the use of the squeeze method: it removes single-dimensional entries
    # from the shape of an array. For example, in the GIOPS mesh file the
    # longitude of the U velocity points is defined as an array with shape
    # (1, 1, 1021, 1442). The squeeze method converts this into the equivalent
    # array with shape (1021, 1442).
    latvar = dataset.variables[lat_var_name].squeeze()
    lonvar = dataset.variables[lon_var_name].squeeze()

    rad_factor = pi / 180.0
    latvals = latvar[:] * rad_factor
    lonvals = lonvar[:] * rad_factor
    clat, clon = np.cos(latvals), np.cos(lonvals)
    slat, slon = np.sin(latvals), np.sin(lonvals)
    triples = np.array(list(zip(np.ravel(clat * clon),
                                np.ravel(clat * slon),
                                np.ravel(slat))))
    kdt = KDTree(triples)
    shape = latvar.shape
    dist_sq, iy, ix = find_index(lat, lon, kdt, shape, n)
    # The results returned from find_index are two-dimensional arrays (if
    # n > 1) because it can handle the case of finding indices closest to
    # multiple lat/lon locations (i.e., where lat and lon are arrays, not
    # scalars). Currently, this function is intended only for a single lat/lon,
    # so we redefine the results as one-dimensional arrays.
    if n > 1:
        #dist_sq = dist_sq[0, :]
        iy = iy[0, :]
        ix = ix[0, :]
    """
    lat_near = latvar[iy, ix]
    lon_near = lonvar[iy, ix]
    
    return dist_sq, iy, ix, lat_near, lon_near
    """
    return iy, ix


def find_index(lat0, lon0, kdt, shape, n=1):
    """Finds the y, x indicies that are closest to a latitude, longitude pair.

    Arguments:
        lat0 -- the target latitude
        lon0 -- the target longitude
        n -- the number of indicies to return

    Returns:
        squared distance, y, x indicies
    """
    if hasattr(lat0, "__len__"):
        lat0 = np.array(lat0)
        lon0 = np.array(lon0)
        multiple = True
    else:
        multiple = False
    rad_factor = pi / 180.0
    lat0_rad = lat0 * rad_factor
    lon0_rad = lon0 * rad_factor
    clat0, clon0 = np.cos(lat0_rad), np.cos(lon0_rad)
    slat0, slon0 = np.sin(lat0_rad), np.sin(lon0_rad)
    q = [clat0 * clon0, clat0 * slon0, slat0]
    if multiple:
        q = np.array(q).transpose()
    else:
        q = np.array(q)
        q = q[np.newaxis, :]
    dist_sq_min, minindex_1d = kdt.query(np.float32(q), k=n)
    iy_min, ix_min = np.unravel_index(minindex_1d, shape)
    return dist_sq_min, iy_min, ix_min
