#!/usr/bin/env python3

import numpy as np
import xarray as xr

from data import open_dataset


def __compute_mean(variable: xr.DataArray):
    return np.mean(variable, dtype=np.float64)


def __check_for_valid_points(variable: xr.DataArray):
    """
    Counts the number of non-nan elements in an array.
    Note the boolean flip.

    https://stackoverflow.com/a/21778195/2231969

    Arguments:
        variable {xr.DataArray} -- [description]
    
    Returns:
        int -- Number of non-zero values in the array.
    """

    return np.count_nonzero(~np.isnan(variable))


def __calculate_variable_stats(variable: xr.DataArray):
    """[summary]
    
    Arguments:
        variable {xr.DataArray} -- [description]
    
    Returns:
        dict -- [description]
    """
    variable_stats = {}

    # Check if there are any data points to run calculations over
    num_valid_points = __check_for_valid_points(variable)
    variable_stats["sampled_points"] = num_valid_points
    if num_valid_points == 0:
        return variable_stats

    if "units" in variable.attrs:
        variable_stats["units"] = variable["units"]

    # Finally compute our stats
    variable_stats["mean"] = __compute_mean(variable)

    return variable_stats


def __slice_dataset(dataset: xr.Dataset, time_idx: int, depth: (int, str), area: list):
    return {}


def calculate_stats(dataset: str, variables: list, time_idx: int, depth: (int, str), area: list):

    with open_dataset(dataset) as ds:
        
        # subset dataset time depth and area
        subset = __slice_dataset(ds, time_idx, depth, area)

        stats = {}
        for var in variables:
            data_array = subset[var]

            stats[var] = __calculate_variable_stats(data_array)

        return stats
