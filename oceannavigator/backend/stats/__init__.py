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
import xarray as xr
from data.fvcom import Fvcom
from data.mercator import Mercator



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

    variable_stats["max"] = np.round(min_max[1].item(),5)

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
        area {list} -- Points describing the area: {[lats...], [lons...]}
    
    Returns:
        str -- JSON string containing stats for all requested variables.
    """
    
    config = DatasetConfig(dataset)
   
    with open_dataset(config) as ds:
       
        polygon_vertics = []
        polygon_lats = []
        polygon_lons = []
        stats = {}
        subset_lat = []
        subset_lon = []
        p = [] 
        
        area = area[0]['polygons'][0]
        
        
        if (isinstance(ds, Fvcom)):# data is unstructured
             
            for var in variables:
                
                datasetpoints= ds.latlon_vars(var)
                # latitudes and longitudes for each variable in dataset
                latvar = (datasetpoints[0])
                lonvar = (datasetpoints[1])
                # finding nearest grid point in dataset for each point of polygon
                for point in area:

                    lat = point[0]
                    lon = point[1]

                    index,d = ds.find_index(lat,lon,n=1)
                    
                    nearest_grid_point = np.array((latvar[index], lonvar[index]))
                    polygon_lats.append(latvar[index])
                    polygon_lons.append(lonvar[index])
                    polygon_vertics.append(nearest_grid_point)
                poly = np.array(polygon_vertics)
                
                # latvar and lonvar are netcdf4 so we convert them to xarray for data processing
                latvar = xr.Variable("latvar",latvar)
                lonvar = xr.Variable("lonvar",lonvar)
             
                # bounding box around the polygon
                min_lat = np.min(polygon_lats) 
                max_lat = np.max(polygon_lats)
                min_lon = np.min(polygon_lons) 
                max_lon = np.max(polygon_lons)
                
                # create a path with the polygon vertices 
                poly_tuple = tuple(map(tuple, poly))
                mpath = Path(poly_tuple)

                # create grid points for the bounding box around the polygon
                latvar_list = latvar.values
                lonvar_list = lonvar.values
                p = [ [lat, lon] for lat, lon in zip(latvar_list, lonvar_list) if (min_lon <= lon and lon <= max_lon and min_lat <= lat and lat <= max_lat)]
                grid_points = np.array(p) 
                
                # create a mask 
                mask = mpath.contains_points(grid_points)
                inside_grid_points = grid_points[mask]
                # lat and lon for all the grid points inside the polygon
                latvar = inside_grid_points[:, 0]
                lonvar = inside_grid_points[:, 1]
                
                variableName = VariableConfig(config,var).name
                variableUnit = VariableConfig(config,var).unit
                # variable values for the points inside the requested polygon
                data_array = ds.get_point(latvar, lonvar, depth, time, var).ravel()
                # statistics calculation
                stats[var] = __calculate_variable_stats(data_array)
                stats[var]["name"] = variableName
                stats[var]["unit"] = variableUnit
                stats[var]["depth"] = depth


        



        else:   # data is on a structured grid
    
            datasetpoints = ds.latlon_variables
            latvar = (datasetpoints[0])
            
            lonvar = (datasetpoints[1])
            
            
            if (isinstance(ds, Mercator)):
                
                newArea = []
                # latitude and longitude in mercator objects like 'Giops Forcast' are from 0 to 360 
                # so lat and lon for each point of polygon is converted to a proper format
                for c in area:
                    lat = c[0]
                    lon = c[1]
                    
                    newlon = lon+180
                    d = [lat,newlon]
                    newArea.append(d)
               
                area = newArea    

            for point in area:
                lat = point[0]
                lon = point[1]

                # handle the case of 2 dimensional lat/lon and finding nearest grid point in dataset for each point of polygon
                if (len(latvar.shape)==2):

                        y, x, d = find_nearest_grid_point(lat, lon, dataset, latvar, lonvar, 1)
                        nearest_grid_point = np.array((latvar[y][x], lonvar[y][x]))
                        polygon_vertics.append(nearest_grid_point)
                else:
                        y, x, d = find_nearest_grid_point(lat, lon, dataset, latvar, lonvar, 1)
                        nearest_grid_point = np.array((latvar[y], lonvar[x]))
                        polygon_lats.append(latvar[y])
                        polygon_lons.append(lonvar[x])
                        polygon_vertics.append(nearest_grid_point)

            # create a path with the polygon vertices
            poly = np.array(polygon_vertics)
            poly_tuple = tuple(map(tuple, poly))
            # creating grid points for 2 dimensional lat/lon 
            if (len(latvar.shape)==2):

                latlon = np.dstack((latvar, lonvar))
                latlon_flat = latlon.reshape((-1,2))
                mpath = Path(poly_tuple)
                mask_flat = mpath.contains_points(latlon_flat)
                inside_grid_points = latlon_flat[mask_flat]
                latvar = inside_grid_points[:, 0]
                lonvar = inside_grid_points[:, 1]



                
                
            else:
                 # handle the case of 1-d lat/lon data on a structured grid and creating grid points in dataset
                if (len(lonvar) > len(latvar)):
                    
                    for lon in lonvar:
                        
                        for lat in latvar:
                        
                            pnt = ([lat,lon])
                            p.append(pnt)
                else:
                    for lat in latvar: 
                        
                        for lon in lonvar:
                            pnt = ([lat,lon])
                            p.append(pnt)
                grid_points = np.array(p)  
                
                mpath = Path(poly_tuple)
                mask = mpath.contains_points(grid_points)
              
                inside_grid_points = grid_points[mask]
                latvar = (inside_grid_points[:, 0])
                lonvar = (inside_grid_points[:, 1])
                
           
            for var in variables:
               
                variableName =VariableConfig(config,var).name
                variableUnit =VariableConfig(config,var).unit
                
                data_array = ds.get_area(np.array([latvar, lonvar]), depth, time , var, "nearest", 25000, 10).ravel()
                
                stats[var] = __calculate_variable_stats(data_array)
                stats[var]["name"] = variableName
                stats[var]["unit"] = variableUnit
                stats[var]["depth"] = depth
            
    return json.dumps(stats)


