#!env python
# vim: set fileencoding=utf-8 :

"""
Handles API Queries

This module handles all API Queries
"""

import base64
import datetime
import gzip
import io
import json
import os
import re
import shutil
import sqlite3
from io import BytesIO

import netCDF4
import numpy as np
import pytz
from flask import (Response, current_app, jsonify, request, send_file,
                   send_from_directory)
from flask_babel import format_date, gettext
from PIL import Image

import data.class4 as class4
import plotting.colormap
import plotting.scale
import plotting.tile
import utils.misc
from data import open_dataset
from oceannavigator import DatasetConfig
from plotting.class4 import Class4Plotter
from plotting.drifter import DrifterPlotter
from plotting.hovmoller import HovmollerPlotter
from plotting.map import MapPlotter
from plotting.observation import ObservationPlotter
from plotting.profile import ProfilePlotter
from plotting.sound import SoundSpeedPlotter
from plotting.stats import stats as areastats
from plotting.stick import StickPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.transect import TransectPlotter
from plotting.ts import TemperatureSalinityPlotter
from utils.errors import APIError, ClientError

MAX_CACHE = 315360000
FAILURE = ClientError("Bad API usage")


"""
    Error handler
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
    return jsonify("This is the Ocean Navigator API - Additional Parameters are required to complete a request, help can be found at ...")


def query_impl(q: str):
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
        data = class4.list_class4_files()
    else:
        raise APIError(
            "Invalid API Query - Please review the API documentation for help.")

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


def query_id_impl(q: str, q_id: str):
    """
    API Format: /api/<string:q>/<string:q_id>.json'

    <string:q>    : Type of Data (areas, class4, drifters, observation)
    <string:q_id> : 

    """
    if q == 'areas':
        data = utils.misc.list_areas(q_id)
    elif q == 'class4':
        data = class4.list_class4(q_id)
    elif q == 'drifters' and q_id == 'meta':
        data = utils.misc.drifter_meta()
    elif q == 'observation' and q_id == 'meta':
        data = utils.misc.observation_meta()
    else:
        raise APIError(
            "The Specified Parameter is Invalid - Must be one of (areas, class4, drifters, observation)")

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


def get_data_impl(dataset: str, variable: str, time: int, depth: str, location: str):
    """
    API Format: /api/data/<string:dataset>/<string:variable>/<int:time>/<string:Depth>/<string:location>.json'

    <string:dataset>  : Dataset to extract data - Can be found using /api/datasets
    <string:variable> : Type of data to retrieve - found using /api/variables/?dataset='...'
    <int:time>        : Time retrieved data was gathered/modeled
    <string:depth>    : Water Depth - found using /api/depth/?dataset='...'
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


def query_file_impl(q: str, projection: str, resolution: int, extent: str, file_id: str):
    """
    API Format: /api/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json

    <string:q>          : Type of data (points, lines, areas, class4, drifters, observations)
    <string:projection> : Current projection of the map (EPSG:3857, EPSG:32661, EPSG:3031)
    <int:resolution>    : Current zoom level of the map
    <string:extent>     : The current bounds of the map view
    <string:file_id>    : 

    **All components must be included**
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
        data = class4.class4(
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

        if 'envType' in args:
            for key in DatasetConfig.get_datasets():
                config = DatasetConfig(key)
                types = config.envtype
                
                if args.get('envType') in types:
                    data.append({
                        'id': key,
                        'value': config.name,
                        'quantum': config.quantum,
                        'help': config.help,
                        'attribution': config.attribution,
                    })
        else:
            for key in DatasetConfig.get_datasets():
                config = DatasetConfig(key)
                data.append({
                    'id': key,
                    'value': config.name,
                    'quantum': config.quantum,
                    'help': config.help,
                    'attribution': config.attribution,
                })
    else:
        for key in DatasetConfig.get_datasets():
            data.append({
                'id': key,
                'value': config.name
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

    # Checking for valid Query
    if 'variable' not in args or ('dataset' not in args):
        if 'dataset' in args:
            raise APIError("Please Specify a variable using &variable='...' ")
        if 'variable' in args:
            raise APIError("Please Specify a Dataset using &dataset='...' ")
        raise APIError(
            "Please Specify a Dataset and Variable using ?dataset='...'&variable='...' ")

    var = args.get('variable')
    variables = var.split(',')

    data = []

    dataset = args['dataset']
    config = DatasetConfig(dataset)

    with open_dataset(config) as ds:
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

    if 'dataset' not in args:
        raise APIError("Please Specify a dataset Using ?dataset='...' ")

    data = []
    dataset = args['dataset']
    config = DatasetConfig(dataset)

    with open_dataset(config) as ds:
        if 'vectors_only' not in args:  # Vectors_only -> Magnitude Only

            for v in ds.variables:

                # If a time period and at least one other unit type is specified
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
                        if not config.variable[v].is_hidden:

                            data.append({
                                'id': v.key,
                                'value': config.variable[v].name,
                                'scale': config.variable[v].scale
                            })

    # If Vectors are needed
    if 'vectors' in args or 'vectors_only' in args:
        for variable in config.vector_variables:
            data.append({
                'id': variable,
                'value': config.variable[variable].name,
                'scale': config.variable[variable].scale,
            })

    # Sorts data alphabetically using the value
    data = sorted(data, key=lambda k: k['value'])

    resp = jsonify(data)
    return resp

def dataset_config():
    """
    Returns all the data located in the dataset config file as JSON
    This does not perform any parsing in order to speed up the entire process.
    """
    datasetconfig = DatasetConfig._get_dataset_config()
    data = jsonify(datasetconfig)
    return data


def all_time_query_impl(args):
    """
    API Format: /api/v1.0/all/timestamps/

    Retrieves all timestamps for all available datasets
    """
    times = dict()

    for dataset in get_datasets():
        with open_dataset(get_dataset_url(dataset)) as ds:
            for date in ds.timestamps:
                if date.year not in times:
                    times[date.year] = {
                        date.month: {
                            date.day: { 
                                date.hour: [date.minute]
                            }
                        }
                    }
                else:
                    if date.month not in times[date.year]:
                        times[date.year][date.month] = {
                            date.day: {
                                date.hour: [date.minute]
                            }
                        }
                       
                        #times[date.year][date.month][date.day] = [date.hour]

                    else:
                        if date.day not in times[date.year][date.month]:
                            times[date.year][date.month][date.day] = {
                                date.hour: [date.minute]
                            }
                        
                        else:
                            if date.hour not in times[date.year][date.month][date.day]:
                                times[date.year][date.month][date.day][date.hour] = [date.minute]
                            elif date.minute not in times[date.year][date.month][date.day][date.hour]:
                                times[date.year][date.month][date.day][date.hour].append(date.minute)


    #print(times)
    js = json.dumps(times)
    return js

def time_query_impl(args):
    """
    API Format: /api/timestamps/?dataset=' '
    dataset : Dataset to extract data - Can be found using /api/datasets
    Finds all data timestamps available for a specific dataset
    """

    if 'dataset' not in args:
        raise APIError("Please Specify a Dataset Using ?dataset='...' ")

    data = []
    dataset = args['dataset']
    config = DatasetConfig(dataset)
    quantum = args.get('quantum')

    with open_dataset(config) as ds:
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



def timestamp_for_date_impl(old_dataset: str, date: int, new_dataset: str):
    """
    API Format: /api/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>

    <string:old_dataset> : Previous dataset used
    <int:date>           : Date of desired data - Can be found using /api/timestamps/?datasets='...'
    <string:new_dataset> : Dataset to extract data - Can be found using /api/datasets

    **Used when changing datasets.**
    """

    old_config = DatasetConfig(old_dataset)
    new_config = DatasetConfig(new_dataset)
    with open_dataset(old_config) as ds:
        timestamp = ds.timestamps[date]

    with open_dataset(new_config) as ds:
        timestamps = ds.timestamps

    diffs = np.vectorize(lambda x: x.total_seconds())(timestamps - timestamp)
    idx = np.where(diffs <= 0)[0]
    res = 0
    if len(idx) > 0:
        res = idx.max().item()  # https://stackoverflow.com/a/11389998/2231969

    return Response(json.dumps(res), status=200, mimetype='application/json')


def scale_impl(dataset: str, variable: str, scale: str, colourmap: str, orientation: str, transparency: str, label: str):
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
        'colourmap': colourmap,
        'orientation': orientation,
        'transparency': transparency,
        'label': label
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
    im.save(f, format='PNG', optimize=True)  # For cache

    bytesIOBuff.seek(0)
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)

def tile_impl(projection: str, interp: str, radius: int, neighbours: int, dataset: str, variable: str, time: int, depth: str, scale: str, masked: int, display: str, zoom: int, x: int, y: int):
    """
        Produces the map data tiles
    """

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    # Check if the tile/image is cached and send it
    #if _is_cache_valid(dataset, f):
    #    return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it
    #else:

    display = display.split(',')
    
    if depth != "bottom" and depth != "all":
        depth = int(depth)
        if display[0] == 'colour':
            img = plotting.tile.plot(projection, x, y, zoom, {
                'interp': interp,
                'radius': radius*1000,
                'neighbours': neighbours,
                'dataset': dataset,
                'variable': variable,
               'time': time,
                'depth': depth,
                'scale': scale,
                'masked': masked,
                'display': display[1]
            })
        elif display[0] == 'contours':
            img = plotting.tile.contour(projection, x, y, zoom, {
                'interp': interp,
                'radius': radius*1000,
                'neighbours': neighbours,
                'dataset': dataset,
                'variable': variable,
                'time': time,
                'depth': depth,
                'scale': scale,
                'masked': masked,
                'contours': display[1],
            })
        elif display[0] == 'windbarbs':
            img = plotting.tile.wind_barbs(projection, x, y, zoom, {
                'interp': interp,
                'radius': radius*1000,
                'neighbours': neighbours,
                'dataset': dataset,
                'variable': variable,
                'time': time,
                'depth': depth,
                'scale': scale,
                'masked': masked,
                'wind_barbs': display[1],   
            })
        else:
            raise ValueError
            return
    return _cache_and_send_img(img, f)


def topo_impl(projection: str, zoom: int, x: int, y: int, shaded_relief: bool):
    """
        Generates topographical tiles
    """
    shape_file_dir = current_app.config['SHAPE_FILE_DIR']

    if zoom > 7:
        return send_file(shape_file_dir + "/blank.png")

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, shaded_relief)

        return _cache_and_send_img(bytesIOBuff, f)


def bathymetry_impl(projection: str, zoom: int, x: int, y: int):
    """
       Generates bathymetry tiles
    """

    shape_file_dir = current_app.config['SHAPE_FILE_DIR']

    if zoom > 7:
        return send_file(shape_file_dir + "/blank.png")

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        img = plotting.tile.bathymetry(projection, x, y, zoom, {})
        return _cache_and_send_img(img, f)


def mbt_impl(projection: str, tiletype: str, zoom: int, x: int, y: int):
    """
         Serves mbt files
    """
    cache_dir = current_app.config['CACHE_DIR']
    shape_file_dir = current_app.config['SHAPE_FILE_DIR']
    requestf = str(os.path.join(cache_dir, request.path[1:]))
    basedir = requestf.rsplit("/", 1)[0]

    # Send blank tile if conditions aren't met
    if (zoom < 7) or (projection != "EPSG:3857"):
        return send_file(shape_file_dir + "/blank.mbt")

# Send file if cached or select data in SQLite file
    if os.path.isfile(requestf):
        return send_file(requestf)
    else:
        y = (2**zoom-1) - y
        connection = sqlite3.connect(
            shape_file_dir + "/{}.mbtiles".format(tiletype))
        selector = connection.cursor()
        sqlite = "SELECT tile_data FROM tiles WHERE zoom_level = {} AND tile_column = {} AND tile_row = {}".format(
            zoom, x, y)
        selector.execute(sqlite)
        tile = selector.fetchone()
        if tile == None:
            return send_file(shape_file_dir + "/blank.mbt")

        # Write tile to cache and send file
        if not os.path.isdir(basedir):
            os.makedirs(basedir)
        with open(requestf + ".pbf", 'wb') as f:
            f.write(tile[0])
        with gzip.open(requestf + ".pbf", 'rb') as gzipped:
            with open(requestf, 'wb') as tileout:
                shutil.copyfileobj(gzipped, tileout)
        return send_file(requestf)


def drifter_query_impl(q: str, drifter_id: str):
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


def class4_query_impl(q: str, class4_id: str, index: str):
    """
    API Format: /api/class4/<string:q>/<string:class4_id>/

    <string:q>         : forecasts / models (Data Request)
    <string:class4_id> : ID of the desired class4 - Can be found using /api/class4/

    Returns a list of class4 datapoints for a given day 
    """

    if class4_id == None:
        raise APIError("Please Specify an ID ")

    if q == 'forecasts':
        pts = class4.list_class4_forecasts(class4_id)
    elif q == 'models':
        pts = class4.list_class4_models(class4_id)
    else:
        raise APIError(gettext(
            "Please specify either forecasts or models using /models/ or /forecasts/"))

    resp = jsonify(pts)
    resp.cache_control.max_age = 86400
    return resp


def subset_query_impl(args):
    raise APIError(
        gettext("This endpoint is deprecated. Use /api/v1.0/subset/... instead."))


def plot_impl(query: dict, args):
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

    fmt = args.get('format')
    if fmt == 'json':
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
    plottype = query.get('type')

    """
    if 'station' in query:
        station = query.get('station')

        def wrapdeg(num):   #Ensures the lat and lon are between -180 and 180deg
            num = num % 360
            if num > 180:
                num = num - 360
            return num

        for index in range(0, len(station)):
            if station[index][0] >= 0:
                station[index][0] = wrapdeg(station[index][0])
            else:
                station[index][0] = wrapdeg(station[index][0])

            if station[index][1] >= 0:
                station[index][1] = wrapdeg(station[index][1])
            else:
                station[index][1] = wrapdeg(station[index][1])
    """

    options = {}
    options['format'] = fmt
    options['size'] = args.get('size', '15x9')
    options['dpi'] = args.get('dpi', 72)

    # Determine which plotter we need.
    if plottype == 'map':
        plotter = MapPlotter(dataset, query, **options)
    elif plottype == 'transect':
        plotter = TransectPlotter(dataset, query, **options)
    elif plottype == 'timeseries':
        plotter = TimeseriesPlotter(dataset, query, **options)
    elif plottype == 'ts':
        plotter = TemperatureSalinityPlotter(dataset, query, **options)
    elif plottype == 'sound':
        plotter = SoundSpeedPlotter(dataset, query, **options)
    elif plottype == 'profile':
        plotter = ProfilePlotter(dataset, query, **options)
    elif plottype == 'hovmoller':
        plotter = HovmollerPlotter(dataset, query, **options)
    elif plottype == 'observation':
        plotter = ObservationPlotter(dataset, query, **options)
    elif plottype == 'drifter':
        plotter = DrifterPlotter(dataset, query, **options)
    elif plottype == 'class4':
        plotter = Class4Plotter(dataset, query, **options)
    elif plottype == 'stick':
        plotter = StickPlotter(dataset, query, **options)
    else:
        raise APIError(
            "You have not provided a supported plottype argument - please review your query")

    filename = 'png'

    if 'data' in request.args:
        data = plotter.prepare_plot()
        return data

    img, mime, filename = plotter.run()

    if img:
        response = make_response(img, mime)
    else:
        raise FAILURE

    if 'save' in args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename

    response.cache_control.max_age = 300

    return response


def stats_impl(args, query=None):
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
        # Invalid API Check
        if 'query' not in args:  # Invalid API Check
            raise APIError(
                "A Query must be specified in the form /stats/?query='...' ")
        # Retrieves Query as JSON based on Request Method
        query = json.loads(args.get('query'))

    dataset = query.get('dataset')  # Retrieves dataset from query

    data = areastats(dataset, query)
    return Response(data, status=200, mimetype='application/json')


def _is_cache_valid(dataset: str, f: str) -> bool:
    """
        Returns True if dataset cache is valid
    """

    config = DatasetConfig(dataset)
    if os.path.isfile(f):
        cache_time = config.cache
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
