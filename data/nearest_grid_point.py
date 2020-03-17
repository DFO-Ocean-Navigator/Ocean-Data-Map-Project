"""
Find Nearest Grid Point
=======================

:Author: Clyde Clements
:Created: 2017-07-19

This module finds the indices of a point (or points) on a lat/lon grid that is
closest to a specified lat/lon location.
"""

from math import pi

import numpy as np
from pykdtree.kdtree import KDTree


def find_nearest_grid_point(lat, lon, latvar, lonvar, n=1):
    """Find the nearest grid point to a given lat/lon pair.

    Parameters
    ----------
    lat : float
        Latitude value at which to find the nearest grid point.
    lon : float
        Longitude value at which to find the nearest grid point.
    latvar : xarray.DataArray
        DataArray corresponding to latitude variable.
    lonVar : xarray.DataArray
        DataArray corresponding to longitude variable.
    n : int, optional
        Number of nearest grid points to return. Default is to return the
        single closest grid point.

    Returns
    -------
    iy, ix, dist_sq
        A tuple of numpy arrays:

        - ``iy``: the y indices of the nearest grid points
        - ``ix``: the x indices of the nearest grid points
        - dist_sq: squared distance
    """

    # Note the use of the squeeze method: it removes single-dimensional entries
    # from the shape of an array. For example, in the GIOPS mesh file the
    # longitude of the U velocity points is defined as an array with shape
    # (1, 1, 1021, 1442). The squeeze method converts this into the equivalent
    # array with shape (1021, 1442).
    latvar = latvar.squeeze()
    lonvar = lonvar.squeeze()

    rad_factor = pi / 180.0
    latvals = latvar[:] * rad_factor
    lonvals = lonvar[:] * rad_factor
    clat, clon = np.cos(latvals), np.cos(lonvals)
    slat, slon = np.sin(latvals), np.sin(lonvals)
    if latvar.ndim == 1:
        # If latitude and longitude are 1D arrays (as is the case with the
        # GIOPS forecast data currently pulled from datamart), then we need to
        # handle this situation in a special manner. The clat array will be of
        # some size m, say, and the clon array will be of size n. By virtue of
        # being defined with different dimensions, the product of these two
        # arrays will be of size (m, n) because xarray will automatically
        # broadcast the arrays so that the multiplication makes sense to do.
        # Thus, the array calculated from
        #
        #   np.ravel(clat * clon)
        #
        # will be of size mn. However, the array
        #
        #   np.ravel(slat)
        #
        # will be of size m and this will cause the KDTree() call to fail. To
        # resolve this issue, we broadcast slat to the appropriate size and
        # shape.
        shape = (slat.size, slon.size)
        slat = np.broadcast_to(slat.values[:, np.newaxis], shape)
    else:
        shape = latvar.shape
    triples = np.array([np.ravel(clat * clon), np.ravel(clat * slon),
                        np.ravel(slat)]).transpose()

    kdt = KDTree(triples)
    dist_sq, iy, ix = _find_index(lat, lon, kdt, shape, n)
    # The results returned from _find_index are two-dimensional arrays (if
    # n > 1) because it can handle the case of finding indices closest to
    # multiple lat/lon locations (i.e., where lat and lon are arrays, not
    # scalars). Currently, this function is intended only for a single lat/lon,
    # so we redefine the results as one-dimensional arrays.
    if n > 1:
        return iy, ix, dist_sq
    else:
        return int(iy), int(ix), dist_sq


def _find_index(lat0, lon0, kdt, shape, n=1):
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
