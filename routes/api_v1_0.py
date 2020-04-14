import base64
import datetime
import gzip
import json
import os
import shutil
import sqlite3
import pandas as pd
from io import BytesIO

import numpy as np
from flask import (Blueprint, Flask, Response, current_app, jsonify, request,
                   send_file, send_from_directory)
from PIL import Image
from dateutil.parser import parse as dateparse
from shapely.geometry import Polygon, LinearRing, Point

import data.class4 as class4
import plotting.colormap
import plotting.scale
import plotting.tile
import utils.misc
from data import open_dataset
from data.sqlite_database import SQLiteDatabase
from data.utils import (DateTimeEncoder, get_data_vars_from_equation,
                        time_index_to_datetime)
from data.observational import db as DB
from data.observational import Station, Platform, Sample, DataType
import data.observational.queries as ob_queries
from flask_babel import gettext
from oceannavigator import DatasetConfig
from plotting.class4 import Class4Plotter
from plotting.drifter import DrifterPlotter
from plotting.hovmoller import HovmollerPlotter
from plotting.map import MapPlotter
from plotting.observation import ObservationPlotter
from plotting.profile import ProfilePlotter
from plotting.scriptGenerator import generatePython, generateR
from plotting.sound import SoundSpeedPlotter
from plotting.stats import stats as areastats
from plotting.stick import StickPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.transect import TransectPlotter
from plotting.ts import TemperatureSalinityPlotter
from utils.errors import APIError, ClientError, ErrorBase

bp_v1_0 = Blueprint('api_v1_0', __name__)

# ~~~~~~~~~~~~~~~~~~~~~~~
# API INTERFACE V1.0
# ~~~~~~~~~~~~~~~~~~~~~~~

MAX_CACHE = 315360000
FAILURE = ClientError("Bad API usage")

@bp_v1_0.errorhandler(ErrorBase)
def handle_error_v1(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


@bp_v1_0.route('/api/')
def info_v1():
    raise APIError(
        "This is the Ocean Navigator API - Additional Parameters are required to complete a request, help can be found at ...")


@bp_v1_0.route('/api/v1.0/')
def info_v1_0():
    raise APIError(
        "This is the Ocean Navigator API - Additional Parameters are required to complete a request, help can be found at ...")


@bp_v1_0.route("/api/v1.0/generatescript/<string:query>/<string:lang>/<string:scriptType>/")
def generateScript(query: str, lang: str, scriptType: str):

    if lang == "python":
        b = generatePython(query, scriptType)
        resp = send_file(b, as_attachment=True,
                         attachment_filename='script_template.py', mimetype='application/x-python')

    elif lang == "r":
        b = generateR(query, scriptType)
        resp = send_file(b, as_attachment=True,
                         attachment_filename='script_template.r', mimetype='application/x-python')

    return resp


@bp_v1_0.route('/api/v1.0/datasets/')
def datasets_query_v1_0():
    """
    API Format: /api/v1.0/datasets/

    Optional arguments:
    * id : Show only the name and id of the datasets

    Returns:
        Response -- Response object containing list of available datasets w/ some metadata.
    """

    data = []
    if 'id' in request.args:
        for key in DatasetConfig.get_datasets():
            config = DatasetConfig(key)
            data.append({
                'id': key,
                'value': config.name
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
    data = sorted(data, key=lambda k: k['value'])
    resp = jsonify(data)
    return resp


@bp_v1_0.route('/api/v1.0/quantum/')
def quantum_query_v1_0():
    """
    Returns the quantum of a given dataset.

    API Format: /api/v1.0/quantum/

    Raises:
        APIError: If `dataset` is not present in API arguments.

    Returns:
        Response -- Response object containing the dataset quantum string as JSON.
    """

    args = request.args

    if 'dataset' not in args:
        raise APIError("Please specify a dataset Using ?dataset='...' ")

    dataset = args.get('dataset')
    config = DatasetConfig(dataset)

    quantum = config.quantum

    return jsonify(quantum)


@bp_v1_0.route('/api/v1.0/variables/')
def variables_query_v1_0():
    """
    Returns the available variables for a given dataset.

    API Format: /api/v1.0/variables/?dataset='...'&3d_only='...'&vectors_only='...'&vectors='...'

    Required Arguments:
    * dataset      : Dataset key - Can be found using /api/v1.0/datasets/

    Optional Arguments:
    * 3d_only      : Boolean Value; When True, only variables with depth will be shown
    * vectors_only : Boolean Value; When True, only variables with magnitude will be shown
    * vectors      : Boolean Value; When True, magnitude components will be included

    **Boolean value: True / False**
    """

    args = request.args

    if 'dataset' not in args:
        raise APIError("Please specify a dataset Using ?dataset='...' ")

    dataset = args.get('dataset')
    config = DatasetConfig(dataset)

    data = []

    if 'vectors_only' in args:
        for variable in config.vector_variables:
            data.append({
                'id': variable,
                'value': config.variable[variable].name,
                'scale': config.variable[variable].scale,
            })
    else:
        with open_dataset(config, meta_only=True) as ds:
            for v in ds.variables:
                if ('3d_only' in args) and v.is_surface_only():
                    continue

                if not config.variable[v].is_hidden:
                    data.append({
                                'id': v.key,
                                'value': config.variable[v].name,
                                'scale': config.variable[v].scale
                                })

    data = sorted(data, key=lambda k: k['value'])

    return jsonify(data)


@bp_v1_0.route('/api/v1.0/observationvariables/')
def obs_vars_query_v1():
    data = []
    for idx, v in enumerate(utils.misc.observation_vars()):
        data.append({'id': idx, 'value': v})

    resp = jsonify(data)
    return resp


@bp_v1_0.route('/api/v1.0/depth/')
def depth_query_v1_0():
    """
    API Format: /api/v1.0/depth/?dataset=''&variable=''

    Required Arguments:
    * dataset  : Dataset key - Can be found using /api/v1.0/datasets/
    * variable : Variable key of interest - found using /api/v1.0/variables/?dataset='...'

    Returns:
        Response -- Response object containing all depths available for the given variable as a JSON array.
    """

    args = request.args

    if 'dataset' not in args:
        raise APIError("Please specify a dataset using &dataset='...'")
    if 'variable' not in args:
        raise APIError("Please specify a variable using &variable='...' ")

    dataset = args.get('dataset')
    variable = args.get('variable')

    config = DatasetConfig(dataset)

    data = []
    with open_dataset(config, variable=variable, timestamp=-1) as ds:
        if not variable in ds.variables:
            raise APIError("Variable not found in dataset: " + variable)

        v = ds.variables[variable]

        if v.has_depth():
            if str(args.get('all')).lower() in ['true', 'yes', 'on']:
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

    return jsonify(data)


@bp_v1_0.route('/api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale_v1_0(dataset: str, variable: str, scale: str):
    """
    API Format: /api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png

    <string:dataset>  : Dataset to extract data
    <string:variable> : Type of data to retrieve - found using /api/variables/?dataset='...'
    <string:scale>    : Desired scale

    Returns a scale bar
    """


    bytesIOBuff = plotting.tile.scale({
        'dataset': dataset,
        'variable': variable,
        'scale': scale,
    })

    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)


@bp_v1_0.route('/api/v1.0/range/<string:dataset>/<string:variable>/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:extent>/<string:depth>/<int:time>.json')
def range_query_v1_0(dataset: str, variable: str, interp: str, radius: int, neighbours: int, projection: str, extent: str, depth: str, time: int):
    extent = list(map(float, extent.split(",")))

    minValue, maxValue = plotting.scale.get_scale(
        dataset, variable, depth, time, projection, extent, interp, radius*1000, neighbours)
    resp = jsonify({
        'min': minValue,
        'max': maxValue,
    })
    resp.cache_control.max_age = MAX_CACHE
    return resp


@bp_v1_0.route('/api/v1.0/data/<string:dataset>/<string:variable>/<string:time>/<string:depth>/<string:location>.json')
def get_data_v1_0(dataset: str, variable: str, time: str, depth: str, location: str):
    """
    API Format: /api/v1.0/data/<string:dataset>/<string:variable>/<int:time>/<string:Depth>/<string:location>.json'

    <string:dataset>  : Dataset to extract data - Can be found using /api/v1.0/datasets
    <string:variable> : Type of data to retrieve - found using /api/v1.0/variables/?dataset='...'
    <int:time>        : Time retrieved data was gathered/modeled
    <string:depth>    : Water Depth - found using /api/v1.0/depth/?dataset='...'
    <string:location> : Location of the data you want to retrieve (Lat, Long)

    **All Components Must be Included**
    """


    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        date = ds.convert_to_timestamp(time)
        data = utils.misc.get_point_data(
            dataset, variable, date, depth,
            list(map(float, location.split(",")))
        )
        resp = jsonify(data)
        resp.cache_control.max_age = 2
        return resp


@bp_v1_0.route('/api/v1.0/class4/<string:q>/<string:class4_id>/')
def class4_query_v1_0(q: str, class4_id: str):
    """
    API Format: /api/v1.0/class4/<string:q>/<string:class4_id>/

    <string:q>         : forecasts / models (Data Request)
    <string:class4_id> : ID of the desired class4 - Can be found using /api/class4/

    Returns a list of class4 datapoints for a given day
    """

    if not class4_id:
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


@bp_v1_0.route('/api/v1.0/drifters/<string:q>/<string:drifter_id>')
def drifter_query_v1_0(q: str, drifter_id: str):
    """
    API Format: /api/v1.0/drifters/<string:q>/<string:drifter_id>

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


@bp_v1_0.route('/api/v1.0/stats/', methods=['GET', 'POST'])
def stats_v1_0():
    """
    API Format: /api/v1.0/stats/?query='...'

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

    if request.method == 'GET':
        args = request.args
    else:
        args = request.form
    query = json.loads(args.get('query'))

    config = DatasetConfig(query.get('dataset'))
    with open_dataset(config) as dataset:
        date = dataset.convert_to_timestamp(query.get('time'))
        date = {'time': date}
        query.update(date)
        if not query:
            # Invalid API Check
            if 'query' not in args:  # Invalid API Check
                raise APIError(
                    "A Query must be specified in the form /stats/?query='...' ")
            # Retrieves Query as JSON based on Request Method
            query = json.loads(args.get('query'))

        dataset = query.get('dataset')  # Retrieves dataset from query

        data = areastats(dataset, query)
        return Response(data, status=200, mimetype='application/json')


@bp_v1_0.route('/api/v1.0/subset/', methods=['GET', 'POST'])
def subset_query_v1_0():

    args = None
    if request.method == 'GET':
        args = request.args
    else:
        args = request.form

    working_dir = None
    subset_filename = None

    config = DatasetConfig(args.get('dataset_name'))
    time_range = args['time'].split(',')
    variables = args['variables'].split(',')
    with open_dataset(config, variable=variables, timestamp=int(time_range[0]), endtime=int(time_range[1])) as dataset:
        working_dir, subset_filename = dataset.nc_data.subset(args)

    return send_from_directory(working_dir, subset_filename, as_attachment=True)


@bp_v1_0.route('/api/v1.0/plot/', methods=['GET', 'POST'])
def plot_v1_0():
    """
    API Format: /api/v1.0/plot/?query='...'&format

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

    args = None
    if request.method == 'GET':
        args = request.args
    else:
        args = request.form

    if "query" not in args:
        raise APIError("Please provide a query.")

    query = json.loads(args.get('query'))

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
            "You Have Not Selected a Plot Type - Please Review your Query")

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

    if 'data' in args:
        plotData = {
            'data': str(resp),
            'shape': resp.shape,
            'mask': str(resp.mask)
        }
        plotData = json.dumps(plotData)
        return Response(plotData, status=200, mimetype='application/json')

    return response


@bp_v1_0.route('/api/v1.0/colors/')
def colors_v1_0():
    """
    API Format: /api/v1.0/colors/

    Returns a list of colours for use in colour maps
    """

    args = request.args
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


@bp_v1_0.route('/api/v1.0/colormaps/')
def colormaps_v1_0():
    """
    API Format: /api/v1.0/colormaps/

    Returns a list of colourmaps
    """

    data = sorted([
        {
            'id': i,
            'value': n
        }
        for i, n in plotting.colormap.colormap_names.items()
    ], key=lambda k: k['value'])
    data.insert(0, {'id': 'default', 'value': gettext('Default for Variable')})

    resp = jsonify(data)
    return resp


@bp_v1_0.route('/api/v1.0/colormaps.png')
def colormap_image_v1_0():
    """
    API Format: /api/v1.0/colormaps.png

    Returns image of colourmap example configurations
    """

    img = plotting.colormap.plot_colormaps()
    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = 86400
    return resp


@bp_v1_0.route('/api/v1.0/<string:q>/')
def query_v1_0(q: str):
    """
    API Format: /api/v1.0/<string:q>/

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


@bp_v1_0.route('/api/v1.0/<string:q>/<string:q_id>.json')
def query_id_v1_0(q: str, q_id: str):
    """
    API Format: /api/v1.0/<string:q>/<string:q_id>.json'

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


@bp_v1_0.route('/api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def query_file_v1_0(q: str, projection: str, resolution: int, extent: str, file_id: str):
    """
    API Format: /api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json

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


@bp_v1_0.route('/api/v1.0/timestamps/')
def timestamps():
    """
    Returns all timestamps available for a given variable in a dataset. This is variable-dependent
    because datasets can have multiple "quantums", as in surface 2D variables may be hourly, while
    3D variables may be daily.

    API Format: /api/v1.0/timestamps/?dataset=''&variable=''

    Required Arguments:
    * dataset : Dataset key - Can be found using /api/v1.0/datasets
    * variable : Variable key - Can be found using /api/v1.0/variables/?dataset='...'...

    Raises:
        APIError: if dataset or variable is not specified in the request

    Returns:
        Response object containing all timestamp pairs (e.g. [raw_timestamp_integer, iso_8601_date_string]) for the given
        dataset and variable.
    """

    args = request.args
    if "dataset" not in args:
        raise APIError("Please specify a dataset via ?dataset=dataset_name")

    dataset = args.get("dataset")
    config = DatasetConfig(dataset)

    if "variable" not in args:
        raise APIError("Please specify a variable via ?variable=variable_name")
    variable = args.get("variable")

    # Handle possible list of URLs for staggered grid velocity field datasets
    url = config.url if not isinstance(config.url, list) else config.url[0]
    if url.endswith(".sqlite3"):
        with SQLiteDatabase(url) as db:
            if variable in config.calculated_variables:
                data_vars = get_data_vars_from_equation(config.calculated_variables[variable]['equation'],
                                                        [v.key for v in db.get_data_variables()])
                vals = db.get_timestamps(data_vars[0])
            else:
                vals = db.get_timestamps(variable)
    else:
        with open_dataset(url, variable=variable) as ds:
            vals = list(map(int, ds.nc_data.time_variable.values))
    converted_vals = time_index_to_datetime(vals, config.time_dim_units)

    result = []
    for idx, date in enumerate(converted_vals):
        if config.quantum == 'month' or config.variable[variable].quantum == 'month':
            date = datetime.datetime(
                date.year,
                date.month,
                15
            )
        result.append({'id': vals[idx], 'value': date})
    result = sorted(result, key=lambda k: k['id'])

    js = json.dumps(result, cls=DateTimeEncoder)

    resp = Response(js, status=200, mimetype='application/json')
    return resp


@bp_v1_0.route('/api/v1.0/tiles/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v1_0(projection: str, interp: str, radius: int, neighbours: int, dataset: str, variable: str, time: int, depth: str, scale: str, zoom: int, x: int, y: int):
    """
        Produces the map data tiles
    """

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    # Check if the tile/image is cached and send it
    if _is_cache_valid(dataset, f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it

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


@bp_v1_0.route('/api/v1.0/tiles/topo/<string:shaded_relief>/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo_v1_0(shaded_relief: str, projection: str, zoom: int, x: int, y: int):
    """
        Generates topographical tiles
    """

    if shaded_relief == "true":
        bShaded_relief = True
    else:
        bShaded_relief = False

    shape_file_dir = current_app.config['SHAPE_FILE_DIR']

    if zoom > 7:
        return send_file(shape_file_dir + "/blank.png")

    cache_dir = current_app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)

    bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, bShaded_relief)
    return _cache_and_send_img(bytesIOBuff, f)


@bp_v1_0.route('/api/v1.0/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def bathymetry_v1_0(projection: str, zoom: int, x: int, y: int):
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

    img = plotting.tile.bathymetry(projection, x, y, zoom, {})
    return _cache_and_send_img(img, f)


@bp_v1_0.route('/api/v1.0/mbt/<string:projection>/<string:tiletype>/<int:zoom>/<int:x>/<int:y>')
def mbt(projection: str, tiletype: str, zoom: int, x: int, y: int):
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

    if (zoom > 11) and (tiletype == "bath"):
        return send_file(shape_file_dir + "/blank.mbt")

    # Send file if cached or select data in SQLite file
    if os.path.isfile(requestf):
        return send_file(requestf)

    y = (2**zoom-1) - y
    connection = sqlite3.connect(
        shape_file_dir + "/{}.mbtiles".format(tiletype))
    selector = connection.cursor()
    sqlite = f"SELECT tile_data FROM tiles WHERE zoom_level = {zoom} AND tile_column = {x} AND tile_row = {y}"
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


@bp_v1_0.route('/api/v1.0/observation/datatypes.json')
def observation_datatypes_v1_0():
    """
    API Format: /api/v1.0/observation/datatypes.json

    Returns the list of observational data types

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = [
        {
            'id': dt.key,
            'value': dt.name,
        }
        for dt in ob_queries.get_datatypes(DB.session)
    ]
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/meta_keys/<string:platform_types>.json')
def observation_keys_v1_0(platform_types: str):
    """
    API Format: /api/v1.0/observation/meta_keys/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types

    Gets the set of metadata keys for a list of platform types

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_keys(DB.session, platform_types.split(','))
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/meta_values/<string:platform_types>/<string:key>.json')
def observation_values_v1_0(platform_types: str, key: str):
    """
    API Format: /api/v1.0/observation/meta_values/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types
    <string:key> : Metadata key

    Gets the set of metadata values for a list of platform types and key

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_values(
        DB.session, platform_types.split(','), key
    )
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/tracktimerange/<string:platform_id>.json')
def observation_tracktime_v1_0(platform_id: str):
    """
    API Format: /api/v1.0/observation/tracktime/<string:platform_id>.json

    <string:platform_id> : Platform ID

    Queries the min and max times for the track

    **Used in TrackWindow**
    """
    max_age = 86400
    platform = DB.session.query(Platform).get(platform_id)
    data = DB.session.query(
        DB.func.min(Station.time),
        DB.func.max(Station.time),
    ).filter(Station.platform == platform).one()
    resp = jsonify({
        'min': data[0].isoformat(),
        'max': data[1].isoformat(),
    })
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route('/api/v1.0/observation/track/<string:query>.json')
def observation_track_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/track/<string:query>.json

    <string:query> : List of key=value pairs, seperated by ;
        valid query keys are: start_date, end_date, datatype, platform_type,
            meta_key, meta_value, mindepth, maxdepth, area, radius, quantum

    Observational query for tracks

    **Used in ObservationSelector**
    """
    query_dict = {
        key: value
        for key, value in [ q.split('=') for q in query.split(';')]
    }
    data = []
    max_age = 86400
    params = {}

    MAPPING = {
        'start_date': 'starttime',
        'end_date': 'endtime',
        'platform_type': 'platform_types',
        'meta_key': 'meta_key',
        'meta_value': 'meta_value',
    }
    for k,v in query_dict.items():
        if k not in MAPPING:
            continue

        if k in ['start_date', 'end_date']:
            params[MAPPING[k]] = dateparse(v)
        elif k in ['datatype', 'meta_key', 'meta_value']:
            if k == 'meta_key' and v == 'Any':
                continue
            if k == 'meta_value' and query_dict.get('meta_key') == 'Any':
                continue

            params[MAPPING[k]] = v
        elif k == 'platform_type':
            params[MAPPING[k]] = v.split(',')
        else:
            params[MAPPING[k]] = float(v)

    if 'area' in query_dict:
        area = json.loads(query_dict.get('area'))
        if len(area) > 1:
            lats = [c[0] for c in area]
            lons = [c[1] for c in area]
            params['minlat'] = min(lats)
            params['minlon'] = min(lons)
            params['maxlat'] = max(lats)
            params['maxlon'] = max(lons)
        else:
            params['latitude'] = area[0][0]
            params['longitude'] = area[0][1]
            params['radius'] = float(query_dict.get('radius', 10))

        platforms = ob_queries.get_platforms(DB.session, **params)
        for param in [
            'minlat', 'maxlat', 'minlon', 'maxlon', 'latitude', 'longitude',
            'radius'
        ]:
            if param in params:
                del params[param]

        params['platforms'] = platforms

    coordinates = ob_queries.get_platform_tracks(
        DB.session,
        query_dict.get("quantum", "day"),
        **params
    )

    if len(coordinates) > 1:
        df = pd.DataFrame(np.array(coordinates), columns=['id', 'type', 'lon', 'lat'])
        df['id'] = df.id.astype(int)

        vc = df.id.value_counts()
        for p_id in vc.where(vc > 1).dropna().index:
            d = { 
                'type': "Feature",
                'geometry': {
                    'type': "LineString",
                    'coordinates': df[['lon', 'lat']][df.id ==
                                                    p_id].values.tolist()
                },
                'properties': {
                    'id': int(p_id),
                    'type': df.type[df.id == p_id].values[0].name,
                    'class': 'observation',
                }
            }
            data.append(d)

    result = {
        'type': "FeatureCollection",
        'features': data,
    }
    resp = jsonify(result)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/point/<string:query>.json')
def observation_point_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/point/<string:query>.json

    <string:query> : List of key=value pairs, seperated by ;
        valid query keys are: start_date, end_date, datatype, platform_type,
            meta_key, meta_value, mindepth, maxdepth, area, radius

    Observational query for points

    **Used in ObservationSelector**
    """
    query_dict = {
        key: value
        for key, value in [ q.split('=') for q in query.split(';')]
    }
    data = []
    max_age = 86400
    params = {}
    MAPPING = {
        'start_date': 'starttime',
        'end_date': 'endtime',
        'datatype': 'variable',
        'platform_type': 'platform_types',
        'meta_key': 'meta_key',
        'meta_value': 'meta_value',
        'mindepth': 'mindepth',
        'maxdepth': 'maxdepth',
    }
    for k,v in query_dict.items():
        if k not in MAPPING:
            continue

        if k in ['start_date', 'end_date']:
            params[MAPPING[k]] = dateparse(v)
        elif k in ['datatype', 'meta_key', 'meta_value']:
            if k == 'meta_key' and v == 'Any':
                continue
            if k == 'meta_value' and query_dict.get('meta_key') == 'Any':
                continue

            params[MAPPING[k]] = v
        elif k == 'platform_type':
            params[MAPPING[k]] = v.split(',')
        else:
            params[MAPPING[k]] = float(v)

    checkpoly = False
    with_radius = False
    if 'area' in query_dict:
        area = json.loads(query_dict.get('area'))
        if len(area) > 1:
            lats = [c[0] for c in area]
            lons = [c[1] for c in area]
            params['minlat'] = min(lats)
            params['minlon'] = min(lons)
            params['maxlat'] = max(lats)
            params['maxlon'] = max(lons)
            poly = Polygon(LinearRing(area))
            checkpoly = True
        else:
            params['latitude'] = area[0][0]
            params['longitude'] = area[0][1]
            params['radius'] = float(query_dict.get('radius', 10))
            with_radius = True

    if with_radius:
        stations = ob_queries.get_stations_radius(session=DB.session, **params)
    else:
        stations = ob_queries.get_stations(session=DB.session, **params)

    if len(stations) > 500:
        stations = stations[::round(len(stations)/500)]

    for s in stations:
        if checkpoly and not poly.contains(Point(s.latitude, s.longitude)):
            continue

        d = { 
            'type': "Feature",
            'geometry': {
                'type': "Point",
                'coordinates': [s.longitude, s.latitude]
            },
            'properties': {
                'type': s.platform.type.name,
                'id': s.id,
                'class': 'observation',
            }
        }
        if s.name:
            d['properties']['name'] = s.name

        data.append(d)

    result = {
        'type': "FeatureCollection",
        'features': data,
    }
    resp = jsonify(result)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/meta.json')
def observation_meta_v1_0():
    """
    API Format: /api/v1.0/observation/meta.json

    Observational query for all the metadata for a platform or station

    **Used in Map for the observational tooltip**
    """
    key = request.args.get("type", "platform")
    identifier = request.args.get("id", "0")
    max_age = 86400
    data = {}
    if key == 'station':
        station = DB.session.query(Station).get(identifier)
        data['Time'] = station.time.isoformat(' ')
        if station.name:
            data['Station Name'] = station.name

        platform = station.platform
        
    elif key == 'platform':
        platform = DB.session.query(Platform).get(identifier)
    else:
        raise FAILURE

    data.update(platform.attrs)
    data['Platform Type'] = platform.type.name
    data = { k: data[k] for k in sorted(data) }
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp

@bp_v1_0.route('/api/v1.0/observation/variables/<string:query>.json')
def observation_variables_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/variables/<string:query>.json

    <string:query> : A key=value pair, where key is either station or platform
    and value is the id

    Observational query for variables for a platform or station

    **Used in PointWindow for the observational variable selection**
    """
    key, identifier = query.split('=')
    data = []
    max_age = 86400
    if key == 'station':
        station = DB.session.query(Station).get(identifier)
    elif key == 'platform':
        platform = DB.session.query(Platform).get(identifier)
        station = DB.session.query(Station).filter(
            Station.platform == platform
        ).first()
    else:
        raise FAILURE

    datatype_keys = [
        k[0]
        for k in DB.session.query(
            DB.func.distinct(Sample.datatype_key)
        ).filter(Sample.station == station).all()
    ]

    datatypes = DB.session.query(
        DataType
    ).filter(DataType.key.in_(datatype_keys)).order_by(DataType.key).all()

    data = [
        {
            'id': idx,
            'value': dt.name,
        }
        for idx, dt in enumerate(datatypes)
    ]

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.after_request
def after_request(response):
    # https://flask.palletsprojects.com/en/1.1.x/security/

    header = response.headers
    # Relying on iptables to keep this safe
    header['Access-Control-Allow-Origin'] = '*'
    header['X-XSS-Protection'] = '1; mode=block'
    header['X-Frame-Options'] = 'SAMEORIGIN'

    return response


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
