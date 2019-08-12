import hashlib
import json

from flask import Blueprint, Flask, Response, jsonify, request, send_file

import routes.routes_impl
from data import open_dataset
from data.utils import time_index_to_datetime
from data.sqlite_database import SQLiteDatabase
from oceannavigator import DatasetConfig
from plotting.scriptGenerator import generatePython, generateR
from utils.errors import APIError, ErrorBase

bp_v1_0 = Blueprint('api_v1_0', __name__)

# ~~~~~~~~~~~~~~~~~~~~~~~
# API INTERFACE
# ~~~~~~~~~~~~~~~~~~~~~~~

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


@bp_v1_0.route('/api/v1.0/datasets/')
def query_datasets_v1_0():
    return routes.routes_impl.query_datasets_impl(request.args)


@bp_v1_0.route('/api/v1.0/variables/')
def variables_query_v1_0():
    """
    API Format: /api/variables/?dataset='...'&3d_only='...'&vectors_only='...'&vectors='...'

    dataset      : Dataset - Can be found using /api/datasets
    3d_only      : Boolean Value; When True, only variables with depth will be shown
    vectors_only : Boolean Value; When True, only variables with magnitude will be shown 
    vectors      : Boolean Value; When True, magnitude components will be included

    **Boolean value: True / False**
    """

    if 'dataset' not in args:
        raise APIError("Please Specify a dataset Using ?dataset='...' ")

    dataset = args.get('dataset')
    config = DatasetConfig(dataset)

    data = []

    if 'vectors_only' not in args:
        with open_dataset(config) as ds:

            for v in ds.variables:
                if ('3d_only' in args) and not (set(ds.depth_dimensions) & set(v.dimensions)):
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


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/observationvariables/')
def obs_vars_query_v1():
    return routes.routes_impl.obs_vars_query_impl()

#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/depth/')
def depth_v1():
    return routes.routes_impl.depth_impl(request.args)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale_v1_0(dataset: str, variable: str, scale: str):
    return routes.routes_impl.scale_impl(dataset, variable, scale)


#
# Change to timestamp from v0.0
#
@bp_v1_0.route('/api/v1.0/range/<string:dataset>/<string:variable>/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:extent>/<string:depth>/<string:time>.json')
def range_query_v1_0(dataset: str, variable: str, interp: str, radius: int, neighbours: int, projection: str, extent: str, depth: str, time: str):
    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        date = ds.convert_to_timestamp(time)
        return routes.routes_impl.range_query_impl(interp, radius, neighbours, dataset, projection, extent, variable, depth, date)


# Changes from v0.0:
# ~ Added timestamp conversion
#
@bp_v1_0.route('/api/v1.0/data/<string:dataset>/<string:variable>/<string:time>/<string:depth>/<string:location>.json')
def get_data_v1_0(dataset: str, variable: str, time: str, depth: str, location: str):
    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        date = ds.convert_to_timestamp(time)
        # print(date)
        return routes.routes_impl.get_data_impl(dataset, variable, date, depth, location)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/class4/<string:q>/<string:class4_id>/')
def class4_query_v1_0(q: str, class4_id: str):
    return routes.routes_impl.class4_query_impl(q, class4_id, 0)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/drifters/<string:q>/<string:drifter_id>')
def drifter_query_v1_0(q: str, drifter_id: str):
    return routes.routes_impl.drifter_query_impl(q, drifter_id)


#
# Change to timestamp from v0.0
#
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


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/subset/')
def subset_query_v1_0():
    query = json.loads(request.args.get('query'))
    return routes.routes_impl.subset_query_impl(query)


#
# Change to timestamp from v0.0
#
@bp_v1_0.route('/api/v1.0/plot/', methods=['GET', 'POST'])
def plot_v1_0():

    if request.method == 'GET':
        args = request.args
    else:
        args = request.form

    if "query" not in args:
        raise APIError("Please provide a query.")

    query = json.loads(args.get('query'))

    config = DatasetConfig(query.get('dataset'))
    with open_dataset(config) as dataset:
        if 'time' in query:
            query['time'] = dataset.convert_to_timestamp(query.get('time'))
        else:
            query['starttime'] = dataset.convert_to_timestamp(
                query.get('starttime'))
            query['endtime'] = dataset.convert_to_timestamp(
                query.get('endtime'))

        resp = routes.routes_impl.plot_impl(args, query)

        m = hashlib.md5()
        m.update(str(resp).encode())
        if 'data' in request.args:
            plotData = {
                'data': str(resp),
                'shape': resp.shape,
                'mask': str(resp.mask)
            }
            plotData = json.dumps(plotData)
            return Response(plotData, status=200, mimetype='application/json')
        return resp

#
# Unchanged from v0.0
#


@bp_v1_0.route('/api/v1.0/colors/')
def colors_v1_0():
    return routes.routes_impl.colors_impl(request.args)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/colormaps/')
def colormaps_v1_0():
    return routes.routes_impl.colormaps_impl()


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/colormaps.png')
def colormap_image_v1_0():
    return routes.routes_impl.colormap_image_impl()


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/')
def info_v1_0():
    return routes.routes_impl.info_impl()


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/<string:q>/')
def query_v1_0(q: str):
    return routes.routes_impl.query_impl(q)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/<string:q>/<string:q_id>.json')
def query_id_v1_0(q: str, q_id: str):
    return routes.routes_impl.query_id_impl(q, q_id)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def query_file_v1_0(q: str, projection: str, resolution: int, extent: str, file_id: str):
    return routes.routes_impl.query_file_impl(q, projection, resolution, extent, file_id)


@bp_v1_0.route('/api/v1.0/timestamps/')
def timestamps():
    """
    Returns all timestamps available for a given variable in a dataset. This is variable-dependent
    because datasets can have multiple "quantums", as in surface 2D variables may be hourly, while
    3D variables may be daily.

    Raises:
        APIError: if dataset or variable is not specified in the request
    """

    params = {}

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
        vals = db.get_all_timestamps(variable)
    vals = time_index_to_datetime(vals, config.time_dim_units)

    result = []
    for idx, date in enumerate(vals):
        if config.quantum == 'month' or config.variable[variable].quantum == 'month':
            date = datetime.datetime(
                date.year,
                date.month,
                15
            )
        result.append({'id': idx, 'value': date})
    result = sorted(result, key=lambda k: k['id'])

    class DateTimeEncoder(json.JSONEncoder):

        def default(self, o):
            if isinstance(o, datetime.datetime):
                return o.isoformat()

            return json.JSONEncoder.default(self, o)
    js = json.dumps(result, cls=DateTimeEncoder)

    resp = Response(js, status=200, mimetype='application/json')
    return resp

#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>')
def timestamp_for_date_v1_0(old_dataset: str, date: int, new_dataset: str):
    return routes.routes_impl.timestamp_for_date_impl(old_dataset, date, new_dataset)


#
# Change to timestamp from v0.0
#
@bp_v1_0.route('/api/v1.0/tiles/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<string:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v1_0(projection: str, interp: str, radius: int, neighbours: int, dataset: str, variable: str, time: str, depth: str, scale: str, zoom: int, x: int, y: int):

    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        date = ds.convert_to_timestamp(time)
        return routes.routes_impl.tile_impl(projection, interp, radius, neighbours, dataset, variable, date, depth, scale, zoom, x, y)


#
# Allow toggle of shaded relief
#
@bp_v1_0.route('/api/v1.0/tiles/topo/<string:shaded_relief>/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo_v1_0(shaded_relief: str, projection: str, zoom: int, x: int, y: int):
    hull_shade = shaded_relief == 'true'
    return routes.routes_impl.topo_impl(projection, zoom, x, y, hull_shade)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def bathymetry_v1_0(projection: str, zoom: int, x: int, y: int):
    return routes.routes_impl.bathymetry_impl(projection, zoom, x, y)


#
# Request shapefiles
#
@bp_v1_0.route('/api/v1.0/mbt/<string:projection>/<string:tiletype>/<int:zoom>/<int:x>/<int:y>')
def mbt(projection: str, tiletype: str, zoom: int, x: int, y: int):
    return routes.routes_impl.mbt_impl(projection, tiletype, zoom, x, y)
