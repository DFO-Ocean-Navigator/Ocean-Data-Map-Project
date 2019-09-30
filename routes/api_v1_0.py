#!/usr/bin/env python

import datetime
import hashlib
import json

import numpy as np
from flask import (Blueprint, Flask, Response, jsonify, request, send_file,
                   send_from_directory)
from flask_babel import gettext

import routes.routes_impl
from data import open_dataset
from data.sqlite_database import SQLiteDatabase
from data.utils import (DateTimeEncoder, get_data_vars_from_equation,
                        time_index_to_datetime, datetime_to_timestamp)
from oceannavigator import DatasetConfig
from plotting.scriptGenerator import generatePython, generateR
from utils.errors import APIError, ErrorBase
bp_v1_0 = Blueprint('api_v1_0', __name__)

@bp_v1_0.errorhandler(ErrorBase)
def handle_error_v1(error):
    return routes.routes_impl.handle_error_impl(error)

@bp_v1_0.route("/api/v1.0/generatescript/<string:query>/<string:lang>/<string:scriptType>/")
def generateScript(query: str, lang: str, scriptType: str):

  if lang == "python":
    b = generatePython(query, scriptType)
    resp = send_file(b, as_attachment=True, attachment_filename='script_template.py', mimetype='application/x-python')
    
  elif lang == "r":
    b = generateR(query, scriptType)
    resp = send_file(b, as_attachment=True, attachment_filename='script_template.r', mimetype='application/x-python')
  
  return resp


#
# Unchanged from v0.0
#
# will be capable of processing additional arguments for meteorology, oceanography, and ice
#
@bp_v1_0.route('/api/v1.0/contacts/test/')
def query_contacts_test_v1_0():
  url = 'https://gpw.canmarnet.gc.ca/BETA-GEO/wfs?service=wfs&version=2.0.0&srsname=EPSG:3857&request=GetFeature&typeNames=postgis:v2_m_identities&outputFormat=application%2Fjson&count=5000&CQL_FILTER=DWITHIN(geopoint,Point(50%20-49),200,kilometers)'
  http = urllib3.PoolManager()
  headers = urllib3.util.make_headers(basic_auth='')
  response = http.request('GET', url, headers=headers)
  response = response.data
  #response = urllib3.urlopen(url)
  return response

#
# Unchanged from v0.0
#
# will be capable of processing additional arguments for meteorology, oceanography, and ice
#
@bp_v1_0.route('/api/v1.0/contacts/')
def query_contacts_v1_0():
  url = request.args.get('query')
  url = url.replace(' ', '%20')
  http = urllib3.PoolManager()
  headers = urllib3.util.make_headers(basic_auth='')
  response = http.request('GET', url, headers=headers)
  response = response.data
  #response = urllib3.urlopen(url)
  return response

@bp_v1_0.route('/api/v1.0/datasets/')
def datasets_query_v1_0():
    """
    API Format: /api/v1.0/datasets/
    Optional arguments:
    * id : Show only the name and id of the datasets
    Returns:
        Response -- Response object containing list of available datasets w/ some metadata.
    """
    return routes.routes_impl.query_datasets_impl(request.args)

@bp_v1_0.route('/api/v1.0/datasetconfig/')
def query_datasetconfig_v1_0():
  return routes.routes_impl.dataset_config()

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
    if 'vectors_only' not in args:
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
    if 'vectors' in args or 'vectors_only' in args:
        for variable in config.vector_variables:
            data.append({
                'id': variable,
                'value': config.variable[variable].name,
                'scale': config.variable[variable].scale,
            })
    data = sorted(data, key=lambda k: k['value'])
    return jsonify(data)

@bp_v1_0.route('/api/v1.0/observationvariables/')
def obs_vars_query_v1():
    return routes.routes_impl.obs_vars_query_impl()

#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/timestamps/old/')
def time_query_v1_0():
  if request.args['dataset'] == 'all':
    return routes.routes_impl.all_time_query_impl(request.args)
  else:
    return routes.routes_impl.time_query_impl(request.args)

#
# Gets all available timestamps for all the datasets
#
@bp_v1_0.route('/api/v1.0/all/timestamps/')
def all_time_query_v1_0():
  return routes.routes_impl.all_time_query_impl(request.args)

#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/colormaps.png')
def colormap_image_v1_0():
  return routes.routes_impl.colormap_image_impl()

#
#
#
@bp_v1_0.route('/api/v1.0/timestamps/convert/<string:dataset>/<string:date>/')
def convert(dataset: str, date: str):
  
  try:
    with open_dataset(get_dataset_url(dataset)) as ds:
      date = ds.convert_to_timestamp(date)
      resp = jsonify({
          'date': date,
      })
    return resp
  except:
    return Response(status=500)

@bp_v1_0.route('/api/v1.0/timeindex/convert/<string:dataset>/<string:index>/')
def num2date(dataset: str, index: str):
  #try:
  config = DatasetConfig(dataset)
  with open_dataset(config) as ds:
    date = ds.convert_to_date(index)
    resp = jsonify({
      'date': date
    })
    return resp
  #except:
    #return Response(status=500)

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


@bp_v1_0.route('/api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>/<string:colourmap>/<string:orientation>/<string:transparency>/<string:label>.png')
def scale_v1_0(dataset: str, variable: str, scale: str, colourmap: str, orientation: str, transparency: str, label: str):
    """
    API Format: /api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png

    <string:dataset>  : Dataset to extract data
    <string:variable> : Type of data to retrieve - found using /api/v1.0/variables/?dataset='...'
    <string:scale>    : Desired scale

    Returns a scale bar
    """

    return routes.routes_impl.scale_impl(dataset, variable, scale, colourmap, orientation, transparency, label)


@bp_v1_0.route('/api/v1.0/range/<string:dataset>/<string:variable>/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:extent>/<string:depth>/<string:time>.json')
def range_query_v1_0(dataset: str, variable: str, interp: str, radius: int, neighbours: int, projection: str, extent: str, depth: str, time: str):

    config = DatasetConfig(dataset)
    timestamp = datetime_to_timestamp(
        string_to_datetime(time), config.time_dim_units)

    return routes.routes_impl.range_query_impl(interp, radius, neighbours, dataset, projection, extent, variable, depth, timestamp)


@bp_v1_0.route('/api/v1.0/data/<string:dataset>/<string:variable>/<string:time>/<string:depth>/<string:location>.json')
def get_data_v1_0(dataset: str, variable: str, time: str, depth: str, location: str):

    config = DatasetConfig(dataset)
    timestamp = datetime_to_timestamp(
        string_to_datetime(time), config.time_dim_units)

    return routes.routes_impl.get_data_impl(dataset, variable, timestamp, depth, location)


@bp_v1_0.route('/api/v1.0/class4/<string:q>/<string:class4_id>/')
def class4_query_v1_0(q: str, class4_id: str):
    return routes.routes_impl.class4_query_impl(q, class4_id, 0)


@bp_v1_0.route('/api/v1.0/drifters/<string:q>/<string:drifter_id>')
def drifter_query_v1_0(q: str, drifter_id: str):
    return routes.routes_impl.drifter_query_impl(q, drifter_id)


@bp_v1_0.route('/api/v1.0/stats/', methods=['GET', 'POST'])
def stats_v1_0():

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

        return routes.routes_impl.stats_impl(args, query)


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
        working_dir, subset_filename = dataset.subset(args)

    return send_from_directory(working_dir, subset_filename, as_attachment=True)


@bp_v1_0.route('/api/v1.0/plot/', methods=['GET', 'POST'])
def plot_v1_0():

    args = None
    if request.method == 'GET':
        args = request.args
    else:
        args = request.form

    if "query" not in args:
        raise APIError("Please provide a query.")

    query = json.loads(args.get('query'))

    resp = routes.routes_impl.plot_impl(query, args)

    if 'data' in args:
        plotData = {
            'data': str(resp),
            'shape': resp.shape,
            'mask': str(resp.mask)
        }
        plotData = json.dumps(plotData)
        return Response(plotData, status=200, mimetype='application/json')

    return resp


@bp_v1_0.route('/api/v1.0/colors/')
def colors_v1_0():
    return routes.routes_impl.colors_impl(request.args)


@bp_v1_0.route('/api/v1.0/colormaps/')
def colormaps_v1_0():
    return routes.routes_impl.colormaps_impl()


@bp_v1_0.route('/api/v1.0/')
def info_v1_0():
    return routes.routes_impl.info_impl()


@bp_v1_0.route('/api/v1.0/<string:q>/')
def query_v1_0(q: str):
    return routes.routes_impl.query_impl(q)


@bp_v1_0.route('/api/v1.0/<string:q>/<string:q_id>.json')
def query_id_v1_0(q: str, q_id: str):
    return routes.routes_impl.query_id_impl(q, q_id)


@bp_v1_0.route('/api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def query_file_v1_0(q: str, projection: str, resolution: int, extent: str, file_id: str):
    return routes.routes_impl.query_file_impl(q, projection, resolution, extent, file_id)


@bp_v1_0.route('/api/v1.0/timestamps/')
def timestamps():
    """
    Returns all timestamps available for a given variable in a dataset. This is variable-dependent
    because datasets can have multiple "quantums", as in surface 2D variables may be hourly, while
    3D variables may be daily.

    API Format: /api/timestamps/?dataset=''&variable=''

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

    vals = []
    with SQLiteDatabase(config.url) as db:
        if variable in config.calculated_variables:
            data_vars = get_data_vars_from_equation(config.calculated_variables[variable]['equation'],
                                                    [v.key for v in db.get_data_variables()])
            vals = db.get_timestamps(data_vars[0])
        else:
            vals = db.get_timestamps(variable)
    converted_vals = time_index_to_datetime(vals, config.time_dim_units)

    result = []
    for idx, date in enumerate(converted_vals): #TODO: dump the enumerate once the front-end is off the indexes.
        if config.quantum == 'month':
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

@bp_v1_0.route('/api/v1.0/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>')
def timestamp_for_date_v1_0(old_dataset: str, date: int, new_dataset: str):
    # TODO: migrate to new time interpolation method
    return routes.routes_impl.timestamp_for_date_impl(old_dataset, date, new_dataset)


@bp_v1_0.route('/api/v1.0/tiles/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<string:time>/<string:depth>/<string:scale>/<int:masked>/<string:display>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v1_0(projection: str, interp: str, radius: int, neighbours: int, dataset: str, variable: str, time: str, depth: str, scale: str, masked: int, display: str, zoom: int, x: int, y: int):

    timestamp = datetime_to_timestamp(
        string_to_datetime(time), config.time_dim_units)

    return routes.routes_impl.tile_impl(projection, interp, radius, neighbours, dataset, variable, timestamp, depth, scale, masked, display, zoom, x, y)


@bp_v1_0.route('/api/v1.0/tiles/topo/<string:shaded_relief>/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo_v1_0(shaded_relief: str, projection: str, zoom: int, x: int, y: int):
    hull_shade = shaded_relief == 'true'
    return routes.routes_impl.topo_impl(projection, zoom, x, y, hull_shade)


@bp_v1_0.route('/api/v1.0/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def bathymetry_v1_0(projection: str, zoom: int, x: int, y: int):
    return routes.routes_impl.bathymetry_impl(projection, zoom, x, y)


@bp_v1_0.route('/api/v1.0/mbt/<string:projection>/<string:tiletype>/<int:zoom>/<int:x>/<int:y>')
def mbt(projection: str, tiletype: str, zoom: int, x: int, y: int):
    return routes.routes_impl.mbt_impl(projection, tiletype, zoom, x, y)
