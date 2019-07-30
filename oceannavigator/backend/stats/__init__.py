#!/usr/bin/env python3

import json
from matplotlib.path import Path
from netCDF4 import Dataset, chartostring
import numpy as np
import scipy.stats as stats
from data import open_dataset
from oceannavigator.dataset_config import DatasetConfig
from oceannavigator.dataset_config import VariableConfig
from data.nearest_grid_point import find_nearest_grid_point


def __compute_std_dev_from_variance(variance: np.ndarray):
    """[summary]
    
    Arguments:
        variance {np.ndarray} -- [description]

    Returns:
        np.ndarray -- Standard deviation from variance.
    """
    
    return np.sqrt(variance)


def __check_for_valid_points(data_array: np.ndarray):
    """
    Counts the number of non-nan elements in an array.
    Note the boolean flip.

    https://stackoverflow.com/a/21778195/2231969

    Arguments:
        data_array {np.ndarray} -- An array-like of data values for a variable.
    
    Returns:
        int -- Number of non-zero values in the array.
    """

    return np.count_nonzero(~np.isnan(data_array))

    
def __calculate_median(data_array: np.ndarray):
    """ Calculates median of the given data.

    Arguments: 
       Data_array {np.ndarray} -- An array-like of data values for a variable.

       Returns:
       A ndarray holding the result.
    """
    
    return np.median(data_array)



def __calculate_variable_stats(data_array: np.ndarray):
    """Calculates the stats for a single data array (variable).
    
    Arguments:
        data_array {np.ndarray} -- An array-like of data values for a variable.
    
    Returns:
        dict -- Dictionary containing stats for the given data_array (variable).
    """

    variable_stats = {}

    sampled_points, min_max, mean, variance, skewness, kurtosis = stats.describe(data_array)

    variable_stats["sampled_points"] = sampled_points

    variable_stats["mean"] = np.round(mean.item(), 5)

    variable_stats["min"] = np.round(min_max[0].item(),5)

    variable_stats["max"] = np.round(min_max[1].item())

    variable_stats["variance"] = np.round(variance.item(), 5)

    variable_stats["skewness"] = np.round(skewness, 5)

    variable_stats["kurtosis"] = np.round(kurtosis, 5)

    variable_stats["standard_dev"] = np.round(__compute_std_dev_from_variance(variance).item(), 5)

    variable_stats["median"] = np.round(__calculate_median(data_array).item(),5)
   

    return variable_stats

# TODO: support ISO time string in addition to raw time indices
def calculate_stats(dataset: str, variables: list, time: (int, str), depth: (int, str), area: np.ndarray):
    """Calculates the statistics for given variables for a given area.
    Current stats provided:
    * mean
    * median
    * variance
    * standard deviation
    * biased skewness (based on moment calculations with denominator equal to the number of observations, i.e. no degrees of freedom correction).
    * biased kurtosis (kurtosis is normalized so that it is zero for the normal distribution. No degrees of freedom or bias correction is used).
    * min
    * max
    
    Arguments:
        dataset {str} -- URL pointing a dataset OR a dataset key found in datasetconfig.json.
        variables {list} -- Variable keys to compute the stats of.
        time {int} -- Time index in dataset.
        depth {int} -- Depth index in dataset.
        area {np.ndarray} -- Lats/lons describing the area: [[lats...], [lons...]]
    
    Returns:
        str -- JSON string containing stats for all requested variables.
    """
    stats = {}
    config = DatasetConfig(dataset)
    area = area[0]['polygons'][0]
    polygon_vertics = []

    with open_dataset(config) as ds:

        for var in variables:

            datasetpoints = ds.latlon_variables
            latvar = (ds.latlon_variables[0])
            lonvar = (ds.latlon_variables[1])
            len_lat = latvar.shape[0]
            len_lon = latvar.shape[1]
            
            for point in area:

                lat = point[0]
                lon = point[1]

                y, x, d = find_nearest_grid_point(lat, lon, dataset, latvar, lonvar, 1)

                nearest_grid_point = np.array((latvar[y][x], lonvar[y][x]))
                
                polygon_vertics.append(nearest_grid_point)

                
            poly = np.array(polygon_vertics)
            poly_tuple = tuple(map(tuple, poly))
            latlon = np.dstack((latvar, lonvar))
            latlon_flat = latlon.reshape((-1,2))

            mpath = Path(poly_tuple)
            mask_flat = mpath.contains_points(latlon_flat)
            mask = mask_flat.reshape(latvar.shape)
            
            new_mask = []
            

            _mask = np.asarray(mask).astype(int)
            final_mask = np.asarray(_mask)

            final_lon = np.asarray(lonvar)
            final_lat = np.asarray(latvar)

            masked_latvar = final_mask*final_lat 
            masked_lonvar = final_mask*final_lon
            
            final_masked_latvar = masked_latvar[masked_latvar !=0]
            final_masked_lonvar = masked_lonvar[masked_lonvar !=0]

            newArea = np.asarray([final_masked_latvar, final_masked_lonvar])
            
           

            variableName = VariableConfig(config,var).name
            variableUnit = VariableConfig(config,var).unit
              
            data_array = ds.get_area(newArea, depth, time, var, "nearest", 25000, 10).ravel()
            stats[var] = __calculate_variable_stats(data_array)
            stats[var]["name"] = variableName
            stats[var]["unit"] = variableUnit
            stats[var]["depth"] = depth
                
        return json.dumps(stats)
