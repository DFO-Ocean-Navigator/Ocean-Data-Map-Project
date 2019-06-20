#!/usr/bin/env python3

import json

import numpy as np
import scipy.stats as stats

from data import open_dataset
from oceannavigator.dataset_config import DatasetConfig
from oceannavigator.dataset_config import VariableConfig
#from oceannavigator import VariableConfig


def __compute_median(data_array: np.ndarray):
    """[summary]
    
    Arguments:
        data_array {np.ndarray} -- [description]
    """
    
    return


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
    """ Calculates median of thegiven data.

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

    # compute our stats
    sampled_points, min_max, mean, variance, skewness, kurtosis = stats.describe(data_array)

    variable_stats["sampled_points"] = sampled_points

    variable_stats["mean"] = round(mean.item(),2)

    variable_stats["min"] = round(min_max[0].item(),2)

    variable_stats["max"] = round(min_max[1].item(),2)

    variable_stats["variance"] = round(variance.item(),2)

    variable_stats["skewness"] = round(skewness,2)

    variable_stats["kurtosis"] = round(kurtosis,2)

    variable_stats["standard_dev"] = round(__compute_std_dev_from_variance(variance).item(),2)

    variable_stats["median"] = round(__calculate_median(data_array).item(),2)
   

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
        dataset {str} -- URL pointing a dataset.
        variables {list} -- Variable keys to compute the stats of.
        time {int} -- Time index in dataset.
        depth {int} -- Depth index in dataset.
        area {np.ndarray} -- [description]
    
    Returns:
        str -- JSON string containing stats for all requested variables.
    """
    
    config = DatasetConfig(dataset)
    
    with open_dataset(config) as ds:
        
        stats = {}
        for var in variables:
            variableName = VariableConfig(config,var).name
            variableUnit = VariableConfig(config,var).unit
            
            area = area[0]['polygons'][0]
            area = np.asarray([[c[0]for c in area], [c[1]for c in area]])
            
            
            data_array = ds.get_area(area, depth, time, var, "nearest", 25000, 10).ravel()
            
            
            stats[var] = __calculate_variable_stats(data_array)
            
            stats[var]["name"] = variableName
            stats[var]["unit"] = variableUnit
            
            
        return json.dumps(stats)
