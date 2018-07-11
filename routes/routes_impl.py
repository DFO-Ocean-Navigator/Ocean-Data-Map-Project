#!env python
# vim: set fileencoding=utf-8 :

"""
Handles API Queries

This module handles all API Queries
"""

from flask import Response, Blueprint, request, redirect, send_file, send_from_directory, jsonify, current_app
from flask_babel import gettext, format_date
import json
import datetime
from io import BytesIO
from PIL import Image
import io

from oceannavigator.dataset_config import (
    get_variable_name, get_datasets,
    get_dataset_url, get_dataset_climatology, get_variable_scale,
    is_variable_hidden, get_dataset_cache, get_dataset_help,
    get_dataset_name, get_dataset_quantum, get_dataset_attribution
)
from utils.errors import ErrorBase, ClientError, APIError
import utils.misc

from plotting.transect import TransectPlotter
from plotting.drifter import DrifterPlotter
from plotting.map import MapPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.ts import TemperatureSalinityPlotter
from plotting.sound import SoundSpeedPlotter
from plotting.profile import ProfilePlotter
from plotting.hovmoller import HovmollerPlotter
from plotting.observation import ObservationPlotter
from plotting.class4 import Class4Plotter
from plotting.stick import StickPlotter
from plotting.stats import stats as areastats
import plotting.colormap
import plotting.tile
import plotting.scale
import numpy as np
import re
import os
import netCDF4
import base64
import pytz
from data import open_dataset

MAX_CACHE = 315360000
FAILURE = ClientError("Bad API usage")


"""

"""
def handle_error_impl(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


"""
Range Query V0.1
"""
def range_query_impl(interp, radius, neighbours, dataset, projection, extent, variable, depth, time):
    extent = list(map(float, extent.split(",")))

    min, max = plotting.scale.get_scale(
        dataset, variable, depth, time, projection, extent, interp, radius*1000, neighbours)
    resp = jsonify({
        'min': min,
        'max': max,
    })
    resp.cache_control.max_age = MAX_CACHE
    return resp


def info_impl():
    raise APIError("This is the Ocean Navigator API - Additional Parameters are required to complete a request, help can be found at ...")

def query_impl(q):
    """
    API Format: /api/<string:q>/

    <string:q> : Zone Type Can be (points,lines, areas, or class4)

    Returns predefined  points / lines / areas / class4's
    """

    data = []
    
    if q == 'points':
        data = utils.misc.list_kml_files('point')
    elif q == 'lines':
        data = utils.misc.list_kml_files('line')
    elif q == 'areas':
        data = utils.misc.list_kml_files('area')
    elif q == 'class4':
        data = utils.misc.list_class4_files()
    else:
        raise APIError("Invalid API Query - Please review the API Documentation for Help")

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


def query_id_impl(q, q_id):
    """
    API Format: /api/<string:q>/<string:q_id>.json'

    <string:q>    : Type of Data (areas, class4, drifters, observation)
    <string:q_id> : 

    """
    if q == 'areas':
        data = utils.misc.list_areas(q_id)
    elif q == 'class4':
        data = utils.misc.list_class4(q_id)
    elif q == 'drifters' and q_id == 'meta':
        data = utils.misc.drifter_meta()
    elif q == 'observation' and q_id == 'meta':
        data = utils.misc.observation_meta()
    else:
        raise APIError("The Specified Parameter is Invalid - Must be one of (areas, class4, drifters, observation)")

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


def get_data_impl(dataset, variable, time, depth, location):
    """
    API Format: /api/data/<string:dataset>/<string:variable>/<int:time>/<string:Depth>/<string:location>.json'

    <string:dataset>  : Dataset to extract data - Can be found using /api/datasets
    <string:variable> : Type of data to retrieve - found using /api/variables/?dataset='...'
    <int:time>        : Time retrieved data was gathered/modeled
    <string:Depth>    : Water Depth - found using /api/depth/?dataset='...'
    <string:location> : Location of the data you want to retrieve (Lat, Long)
    **All Components Must be Included**
    """
    data = utils.misc.get_point_data(
        dataset, variable, time, depth,
        list(map(float, location.split(",")))
    )
    resp = jsonify(data)
    resp.cache_control.max_age = 2
    return resp


def query_file_impl(q, projection, resolution, extent, file_id):
    """
    API Format: /api/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json

    <string:q>          : Type of data (points, lines, areas, class4, drifters, observations)
    <string:projection> : Current projection of the map (EPSG:3857, EPSG:32661, EPSG:3031)
    <int:resolution>    : Current zoom level of the map
    <string:extent>     : The current bounds of the map view
    <string:file_id>    : 

    **All Components Must be Included**
    **Used Primarily by WebPage**
    """

    data = []
    max_age = 86400

    if q == 'points':
        data = utils.misc.points(
            file_id, projection, resolution, extent)
    elif q == 'lines':
        data = utils.misc.lines(
            file_id, projection, resolution, extent)
    elif q == 'areas':
        data = utils.misc.areas(
            file_id, projection, resolution, extent)
    elif q == 'class4':
        data = utils.misc.class4(
            file_id, projection, resolution, extent)
    elif q == 'drifters':
        data = utils.misc.drifters(
            file_id, projection, resolution, extent)
        max_age = 3600
    elif q == 'observations':
        data = utils.misc.observations(
            file_id, projection, resolution, extent)
    else:
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


def query_datasets_impl(args):
    """
    API Format: /api/datasets/
    ?id : will show only the name and id of the dataset

    Will return a list of possible datasets and their corresponding data
    """

    data = []
    if 'id' not in args:
        for key in get_datasets():
            data.append({
                'id': key,
                'value': get_dataset_name(key),
                'quantum': get_dataset_quantum(key),
                'help': get_dataset_help(key),
                'attribution': get_dataset_attribution(key),
            })
    else:
        for key in get_datasets():
            data.append({
                'id': key,
                'value': get_dataset_name(key)
            })
    data = sorted(data, key=lambda k: k['value'])
    resp = jsonify(data)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


def colors_impl(args):
    """
    API Format: /api/colors/

    Returns a list of colours for use in colour maps
    """
    data = [
        {'id': 'k', 'value': gettext('Black')},
        {'id': 'b', 'value': gettext('Blue')},
        {'id': 'g', 'value': gettext('Green')},
        {'id': 'r', 'value': gettext('Red')},
        {'id': 'c', 'value': gettext('Cyan')},
        {'id': 'm', 'value': gettext('Magenta')},
        {'id': 'y', 'value': gettext('Yellow')},
        {'id': 'w', 'value': gettext('White')},
    ]
    if args.get('random'):
        data.insert(0, {'id': 'rnd', 'value': gettext('Randomize')})
    if args.get('none'):
        data.insert(0, {'id': 'none', 'value': gettext('None')})
    
    resp = jsonify(data)
    return resp


def colormaps_impl():
    """
    API Format: /api/colormaps/

    Returns a list of colourmaps
    """

    data = sorted([
        {
            'id': i,
            'value': n
        }
        for i, n in list(plotting.colormap.get_colormap_names().items())
    ], key=lambda k: k['value'])
    data.insert(0, {'id': 'default', 'value': gettext('Default for Variable')})

    resp = jsonify(data)
    return resp


def colormap_image_impl():
    """
    API Format: /colormaps.png

    Returns image of colourmap example configurations
    """

    img = plotting.colormap.plot_colormaps()
    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = 86400
    return resp


def depth_impl(args):
    """
    API Format: /api/depth/?dataset=''&variable=' '

    dataset  : Dataset to extract data - Can be found using /api/datasets
    variable : Type of data to retrieve - found using /api/variables/?dataset='...'

    Returns all depths available for that variable in the dataset
    """

    #Checking for valid Query
    if 'variable' not in args or ('dataset' not in args):
        if 'dataset' in args:
            raise APIError("Please Specify a variable using &variable='...' ")
        if 'variable' in args:
            raise APIError("Please Specify a Dataset using &dataset='...' ")
        raise APIError("Please Specify a Dataset and Variable using ?dataset='...'&variable='...' ")
    #~~~~~~~~~~~~~~~~~~~~~~~~

    var = args.get('variable')
    variables = var.split(',')
    variables = [re.sub('_anom$', '', v) for v in variables]

    data = []
   
    dataset = args['dataset']

    with open_dataset(get_dataset_url(dataset)) as ds:
        for variable in variables:
            if variable and \
                variable in ds.variables and \
                    set(ds.depth_dimensions) & \
               set(ds.variables[variable].dimensions):
                if str(args.get('all')).lower() in ['true',
                                                            'yes',
                                                            'on']:
                    data.append(
                        {'id': 'all', 'value': gettext('All Depths')})

                for idx, value in enumerate(np.round(ds.depths)):
                    data.append({
                        'id': idx,
                        'value': "%d m" % (value)
                    })

            if len(data) > 0:
                data.insert(
                    0, {'id': 'bottom', 'value': gettext('Bottom')})
    data = [
        e for i, e in enumerate(data) if data.index(e) == i
    ]

    resp = jsonify(data)
    return resp


def obs_vars_query_impl():
    """
    API Format: /api/observationvariables/

    Returns a list of the possible observation variables
    """

    data = []
    for idx, v in enumerate(utils.misc.observation_vars()):
        data.append({'id': idx, 'value': v})

    resp = jsonify(data)
    return resp


def vars_query_impl(args):
    """
    API Format: /api/variables/?dataset='...'&3d_only='...'&vectors_only='...'&vectors='...'

    **Only use variables required for your specific request**

    dataset      : Dataset to extract data - Can be found using /api/datasets
    3d_only      : Boolean Value; When True, only variables with depth will be shown
    vectors_only : Boolean Value; When True, ONLY variables with magnitude will be shown 
    vectors      : Boolean Value; When True, magnitude components will be included

    **Boolean: True / False**
    """ 

    if 'dataset' not in args.keys():
        raise APIError("Please Specify a Dataset Using ?dataset='...' ")

    data = []       #Initializes empty data list
    dataset = args['dataset']   #Dataset Specified in query

    #Queries config files
    if get_dataset_climatology(dataset) != "" and 'anom' in args:   #If a url exists for the dataset and an anomaly
            
        with open_dataset(get_dataset_climatology(dataset)) as ds:
            climatology_variables = list(map(str, ds.variables))
    
    else:
        climatology_variables = []

    #three_d = '3d_only' in args     #Checks if 3d_only is in args
    #If three_d is true - Only 3d variables will be returned

    with open_dataset(get_dataset_url(dataset)) as ds:
        if 'vectors_only' not in args:      #Vectors_only -> Magnitude Only

            # 'v' is a Variable in the Dataset
            #  v Contains:  dimensions, key, name, unit, valid_min, valid_max
            for v in ds.variables:  #Iterates through all the variables in the dataset

                #If a time period and at least one other unit type is specified
                if ('time_counter' in v.dimensions or   
                    'time' in v.dimensions) \
                        and ('y' in v.dimensions or
                             'yc' in v.dimensions or
                             'node' in v.dimensions or
                             'nele' in v.dimensions or
                             'latitude' in v.dimensions or
                             'lat' in v.dimensions):
                    if ('3d_only' in args) and not (
                        set(ds.depth_dimensions) & set(v.dimensions)
                    ):
                        continue
                    else:
                        if not is_variable_hidden(dataset, v):
                             
                            data.append({
                                'id': v.key,
                                'value': get_variable_name(dataset, v),
                                'scale': get_variable_scale(dataset, v)
                            })
                            if v.key in climatology_variables:
                                data.append({
                                    'id': v.key + "_anom",
                                    'value': get_variable_name(dataset, v) + " Anomaly",
                                    'scale': [-10, 10]
                                })
     
        VECTOR_MAP = {
            'vozocrtx': 'vozocrtx,vomecrty',
            'itzocrtx': 'itzocrtx,itmecrty',
            'iicevelu': 'iicevelu,iicevelv',
            'ice_east_vel': 'ice_east_vel,ice_north_vel',
            'u_wind': 'u_wind,v_wind',
            'u': 'u,v',
            'ua': 'ua,va',
            'u-component_of_wind_height_above_ground': 'u-component_of_wind_height_above_ground,v-component_of_wind_height_above_ground',
            'east_vel': 'east_vel,north_vel',
            'wind_east_vel': 'wind_east_vel,wind_north_vel',
        }

        #If Vectors are needed
        if 'vectors' in args or 'vectors_only' in args:
            rxp = r"(?i)(zonal |meridional |northward |eastward | east | north)"
            for key, value in list(VECTOR_MAP.items()):
                if key in ds.variables:
                    n = get_variable_name(dataset, ds.variables[key]) #Returns a normal variable type   
                    if re.search(rxp, n): # Extra if for datasets with non-eastward vozocrtx
                        data.append({
                            'id': value,
                            'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                            'scale': [0, get_variable_scale(
                                      dataset,
                                      ds.variables[key]
                                       )[1]]
                        })

    data = sorted(data, key=lambda k: k['value'])      #Sorts data alphabetically using the value
    
    #Data is set of scale, id, value objects
    resp = jsonify(data)
    return resp


def time_query_impl(args):
    """
    API Format: /api/timestamps/?dataset=' '

    dataset : Dataset to extract data - Can be found using /api/datasets

    Finds all data timestamps available for a specific dataset
    """

    if 'dataset' not in args:
        raise APIError("Please Specify a Dataset Using ?dataset='...' ")
    #~~~~~~~~~~~~~~~~~~~~~~~

    data = []
    dataset = args['dataset']
    quantum = args.get('quantum')
    
    with open_dataset(get_dataset_url(dataset)) as ds:
        for idx, date in enumerate(ds.timestamps):
            if quantum == 'month':
                date = datetime.datetime(
                    date.year,
                    date.month,
                    15
                )
            data.append(
                {'id': idx, 'value': date.replace(tzinfo=pytz.UTC)})

    data = sorted(data, key=lambda k: k['id'])

    class DateTimeEncoder(json.JSONEncoder):
    
        def default(self, o):
            if isinstance(o, datetime.datetime):
                return o.isoformat()

            return json.JSONEncoder.default(self, o)
    js = json.dumps(data, cls=DateTimeEncoder)
    
    resp = Response(js, status=200, mimetype='application/json')
    return resp
    

def time_query_conversion(dataset, index):
    """
    API Format: /api/timestamps/?dataset=' '

    dataset : Dataset to extract data - Can be found using /api/datasets

    Finds all data timestamps available for a specific dataset
    """

    
    with open_dataset(get_dataset_url(dataset)) as ds:
        for idx, date in enumerate(ds.timestamps):
            if idx == index:
                return date.replace(tzinfo=pytz.UTC).isoformat()
        return APIError("Timestamp does not exist")
    
    
def timestamp_for_date_impl(old_dataset, date, new_dataset):
    """
    API Format: /api/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>

    <string:old_dataset> : Previous dataset used
    <int:date>           : Date of desired data - Can be found using /api/timestamps/?datasets='...'
    <string:new_dataset> : Dataset to extract data - Can be found using /api/datasets

    **Used when Changing datasets**
    """

    with open_dataset(get_dataset_url(old_dataset)) as ds:
        timestamp = ds.timestamps[date]

    with open_dataset(get_dataset_url(new_dataset)) as ds:
        timestamps = ds.timestamps

    diffs = np.vectorize(lambda x: x.total_seconds())(timestamps - timestamp)
    idx = np.where(diffs <= 0)[0]
    res = 0
    if len(idx) > 0:
        res = idx.max().item() # https://stackoverflow.com/a/11389998/2231969

    return Response(json.dumps(res), status=200, mimetype='application/json')


def scale_impl(dataset, variable, scale):
    """
    API Format: /scale/<string:dataset>/<string:variable>/<string:scale>.png

    <string:dataset>  : Dataset to extract data
    <string:variable> : Type of data to retrieve - found using /api/variables/?dataset='...'
    <string:scale>    : Desired Scale

    Returns a scale bar
    """

    bytesIOBuff = plotting.tile.scale({
        'dataset': dataset,
        'variable': variable,
        'scale': scale,
    })
    
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)

def _cache_and_send_img(bytesIOBuff: BytesIO, f: str):
    """
        Caches a rendered image buffer on disk and sends it to the browser

        bytesIOBuff: BytesIO object containing image data
        f: filename of image to be cached
    """
    p = os.path.dirname(f)
    if not os.path.isdir(p):
        os.makedirs(p)

    # This seems excessive
    bytesIOBuff.seek(0)
    dataIO = BytesIO(bytesIOBuff.read())
    im = Image.open(dataIO)
    im.save(f, format='PNG', optimize=True) # For cache

    bytesIOBuff.seek(0)
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)

# Renders the map images and sends it to the browser
def tile_impl(projection, interp, radius, neighbours, dataset, variable, time, depth, scale, zoom, x, y):
    """
    Produces the Main Map Tiles
    """
    
    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    
    # Check if the tile/image is cached and send it
    if _is_cache_valid(dataset, f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it
    else:
        if depth != "bottom" and depth != "all":
            depth = int(depth)

        img = plotting.tile.plot(projection, x, y, zoom, {
            'interp': interp,
            'radius': radius*1000,
            'neighbours': neighbours,
            'dataset': dataset,
            'variable': variable,
            'time': time,
            'depth': depth,
            'scale': scale,
        })

        return _cache_and_send_img(img, f)

# Renders basemap
def topo_impl(projection, zoom, x, y):
    """
    Generates Topographical Tiles for the Main Map
    """

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    
    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, {})
        
        return _cache_and_send_img(bytesIOBuff, f)


# Renders bathymetry contours
def bathymetry_impl(projection, zoom, x, y):
    """
    Generates Bathymetry Tiles for the Main Map
    """

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        img = plotting.tile.bathymetry(projection, x, y, zoom, {})
        return _cache_and_send_img(img, f)


def drifter_query_impl(q, drifter_id):
    """
    API Format: /api/drifters/<string:q>/<string:drifter_id>

    <string:q>          : vars / time (Data Request)
    <string:drifter_id> : ID of Drifter of Interest - Options can be found using /api/

    Vars - Returns a list of Variables applicable to the specified drifter
    Time - Returns the max and min time of the specified drifter
    }
    """
    
    if q == 'vars':
        pts = utils.misc.drifters_vars(drifter_id)
    elif q == 'time':
        pts = utils.misc.drifters_time(drifter_id)
    else:
        raise FAILURE

    resp = jsonify(pts)
    resp.cache_control.max_age = 3600
    return resp


def class4_query_impl(q, class4_id, index):
    """
    API Format: /api/class4/<string:q>/<string:class4_id>/

    <string:q>         : forecasts / models (Data Request)
    <string:class4_id> : ID of the desired class4 - Can be found using /api/class4/

    Returns a list of class4 datapoints for a given day 
    """

    if class4_id == None:
        raise APIError("Please Specify an ID ")
    if q == 'forecasts':
        pts = utils.misc.list_class4_forecasts(class4_id)
    elif q == 'models':
        pts = utils.misc.list_class4_models(class4_id)
    else:
        raise APIError(gettext("Please specify either forecasts or models using /models/ or /forecasts/"))

    resp = jsonify(pts)
    resp.cache_control.max_age = 86400
    return resp
    
def subset_query_impl(args):
    """
    API Format: /subset/?query='...'
    
    **Query must be written in JSON and converted to encodedURI**
    **Not all components of query are required
    """

    working_dir = None
    subset_filename = None
    with open_dataset(get_dataset_url(args.get('dataset_name'))) as dataset:
        working_dir, subset_filename = dataset.subset(args)
        """
        # Export to NetCDF
        if output_format == "NETCDF3_NC":
            # "Special" netcdf export (┛ಠ_ಠ)┛彡┻━┻

            # This part only ever runs on giops files so no need to worry about variable
            # names changing
            subset.to_netcdf(working_dir + filename + ".nc", format="NETCDF3_CLASSIC")

            # Open the GIOPS NCOM file
            giops_file = netCDF4.Dataset(working_dir + filename + ".nc")
            giops_variables = giops_file.variables
                
            # Create converted ncdf file
            ds = netCDF4.Dataset(working_dir + filename + "_converted.nc", 'w', format="NETCDF3_CLASSIC")
            ds.description = "Converted GIOPS " + filename
            ds.history = "Created: " + str(datetime.datetime.now())
            ds.source = "www.navigator.oceansdata.ca | GIOPS source: dd.weather.gc.ca"

            # Find correct variable names in subset
            lat_var = find_variable('lat')
            lon_var = find_variable('lon')
            time_var = find_variable('time')
            depth_var = find_variable('depth')

            # Create the netcdf dimensions
            ds.createDimension('lat', len(giops_variables[lat_var][:]))
            ds.createDimension('lon', len(giops_variables[lon_var][:]))
            ds.createDimension('time', len(giops_variables[time_var][:]))
            ds.CreateDimension('depth', len(giops_variables[depth_var][:]))

            # Create the netcdf variables and assign the values
            latitudes = ds.createVariable('lat', 'f', ('lat',))
            longitudes = ds.createVariable('lon', 'f', ('lon',))
            latitudes = giops_variables[lat_var][:]
            longitudes = giops_variables[lon_var][:]

            times = ds.createVariable('time', 'i', ('time',))
            # Convert time from seconds to hours
            for i in range(0, len(giops_variables[time_var])):
                times[i] = giops_variables[time_var][i] / 3600

            # Variable Attributes, mimicking HYCOM headers
            latitudes.long_name = "Latitude"
            latitudes.units = "degrees_north"
            latitudes.NAVO_code = 1
            longitudes.long_name = "Longitude"
            longitudes.units = "degrees_east"
            longitudes.NAVO_code = 2
            times.long_name = "Validity time"
            times.units = "hours since 1950-01-01 00:00:00"
            times.time_origin = "hours since 1950-01-01 00:00:00"

            levels = ds.createVariable('depth', 'i', ('depth',))
            levels = giops_variables[depth_var][:]
            levels.long_name = "Depth"
            levels.units = "meter"
            levels.positive = "down"
            levels.NAVO_code = 5

            #Variables in Dataset
            for variable in giops_variables:

                #Salinity
                if variable == "vosaline":
                    salinity = ds.createVariable('salinity', 'f', ('time', 'depth', 'lat', 'lon', ), fill_value=-30000.0)
                    salinity = giops_variables['vosaline'][:]
                    salinity.long_name = "Salinity"
                    salinity.units = "psu"
                    salinity.valid_min = 0.0
                    salinity.valid_max = 45.0
                    salinity.NAVO_code = 16

                #Temperature
                if variable == "votemper":
                    temp = ds.createVariable('water_temp', 'f', ('time', 'depth', 'lat', 'lon', ), fill_value=-30000.0)
                    # Convert from Kelvin to Celcius
                    for i in range(0, len(giops_variables['depth'][:])):
                        temp[:,i, :, :] = giops_variables['votemper'][:,i,:,:] - 273.15
                    temp.valid_min = -100.0
                    temp.valid_max = 100.0
                    temp.NAVO_code = 15

                #Water Surface Elevation
                if variable == "sossheig":
                    height = ds.createVariable('surf_el', float, ('time', 'lat', 'lon'), fill_value=-30000.0)
                    height = giops_variables['sossheig'][:]
                    heights.long_name="Water Surface Elevation"
                    heights.units="meter"
                    heights.NAVO_code=32
                
                #Eastward Water Velocity
                if variable == "vozocrtx":
                    x_velo = ds.createVariable('water_u', float, ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                    x_velo = giops_variables['vozocrtx'][:]
                    x_velo.long_name = "Eastward Water Velocity"
                    x_velo.units = "meter/sec"
                    x_velo.NAVO_code = 17

                #Northward Water Velocity
                if variable == "vomecrty":
                    y_velo = ds.createVariable('water_v', float, ('time','depth','lat','lon'), fill_value=-30000.0)
                    y_velo = giops_variables['vomecrty'][:]
                    y_velo.long_name = "Northward Water Velocity"
                    y_velo.units = "meter/sec"
                    y_velo.NAVO_code = 18

            ds.close()
            giops_file.close()

            # (┛ಠ_ಠ)┛彡┻━┻
            return send_from_directory(working_dir, '%s_converted.nc' % filename, as_attachment=True)
        """
            
    return send_from_directory(working_dir, subset_filename, as_attachment=True)


def plot_impl(args, query = None):
    """
    API Format: /plot/?query='...'&format

    query = {
        dataset   : Dataset to extract data
        names     :
        plottitle : Title of Plot (Default if blank)
        quantum   : (year, month, day, hour)
        showmap   : Include a map of the plots location on the map
        station   : Coordinates of the point/line/area/etc
        time      : Time retrieved data was gathered/modeled
        type      : File / Plot Type (Check Navigator for Possible options)
        variable  : Type of data to plot - Options found using /api/variables/?dataset='...'
    }
    **Query must be written in JSON and converted to encodedURI**
    **Not all components of query are required
    """
    if query == None:
        if 'query' not in args:
            raise APIError("Please Specify a Query - This should be written in JSON and converted to an encodedURI")
        query = json.loads(args.get('query'))
    
    if ("format" in args and args.get("format") == "json"):
        # Generates a Base64 encoded string
        def make_response(data, mime):
            b64 = base64.encodebytes(data).decode()

            return Response(json.dumps("data:%s;base64,%s" % (
                mime,
                b64
            )), status=200, mimetype="application/json")
    else:
        def make_response(data, mime):
            return Response(data, status=200, mimetype=mime)

    dataset = query.get('dataset')
    
    opts = {
        'dpi': 72,
        'query': query,
    }
    plottype = query.get('type')

    size = None
    if 'save' in args:
        if 'size' in args:
            size = args.get('size')
        if 'dpi' in args:
            opts['dpi'] = args.get('dpi')

    if 'format' in args:
        opts['format'] = args.get('format')


    if size is None:
        opts['size'] = '11x9'
    else:
        opts['size'] = size

    filename = 'png'
    img = ""

    # Determine which plotter we need.
    if plottype == 'map':
        plotter = MapPlotter(dataset, query, args.get('format'))
    elif plottype == 'transect':
        plotter = TransectPlotter(dataset, query, args.get('format'))
    elif plottype == 'timeseries':
        plotter = TimeseriesPlotter(dataset, query, args.get('format'))
    elif plottype == 'ts':
        plotter = TemperatureSalinityPlotter(dataset, query, args.get('format'))
    elif plottype == 'sound':
        plotter = SoundSpeedPlotter(dataset, query, args.get('format'))
    elif plottype == 'profile':
        plotter = ProfilePlotter(dataset, query, args.get('format'))
    elif plottype == 'hovmoller':
        plotter = HovmollerPlotter(dataset, query, args.get('format'))
    elif plottype == 'observation':
        plotter = ObservationPlotter(dataset, query, args.get('format'))
    elif plottype == 'drifter':
        plotter = DrifterPlotter(dataset, query, args.get('format'))
    elif plottype == 'class4':
        plotter = Class4Plotter(dataset, query, args.get('format'))
    elif plottype == 'stick':
        plotter = StickPlotter(dataset, query, args.get('format'))
    else:
        raise APIError("You Have Not Selected a Plot Type - Please Review your Query")

    # Get the data from the selected plotter.
    img, mime, filename = plotter.run(size=size, dpi=args.get('dpi'))
    
    if img != "":
        response = make_response(img, mime)
    else:
        raise FAILURE

    if 'save' in args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename

    response.cache_control.max_age = 300

    return response


def stats_impl(args, query = None):
    """
    API Format: /stats/?query='...'

    query = {
        dataset  : Dataset to extract data
        variable : Type of data to plot - Options found using /api/variables/?dataset='...'
        time     : Time retrieved data was gathered/modeled
        depth    : Water Depth - found using /api/depth/?dataset='...'
        area     : Selected Area
    }
    **Query must be written in JSON and converted to encodedURI**
    **Not all components of query are required
    """
    if query == None:
        #Invalid API Check
        if 'query' not in args: #Invalid API Check
            raise APIError("A Query must be specified in the form /stats/?query='...' ")
        #Retrieves Query as JSON based on Request Method
        query = json.loads(args.get('query'))

    dataset = query.get('dataset')  #Retrieves dataset from query

    data = areastats(dataset, query)
    return Response(data, status=200, mimetype='application/json')


def _is_cache_valid(dataset: str, f: str) -> bool:
    """
    Returns True if the cache is valid
    """

    if os.path.isfile(f):
        cache_time = get_dataset_cache(dataset)
        if cache_time is not None:
            modtime = datetime.datetime.fromtimestamp(
                os.path.getmtime(f)
            )
            age_hours = (
                datetime.datetime.now() - modtime
            ).total_seconds() / 3600
            if age_hours > cache_time:
                os.remove(f)
                return False
            else:
                return True
        else:
            return True
    else:
        return False
