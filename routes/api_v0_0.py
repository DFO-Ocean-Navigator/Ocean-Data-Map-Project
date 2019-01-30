from flask import Blueprint, Response, request, redirect, send_file, send_from_directory, jsonify
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
from data.netcdf_data import NetCDFData
import routes.routes_impl

bp_v0_0 = Blueprint('api_v0_0', __name__)



@bp_v0_0.errorhandler(ErrorBase)
def handle_error_v0(error):
    return routes.routes_impl.handle_error_impl(error)

# Check if a given time index is within the bounds of
# the given dataset time index range
def timestamp_outOfBounds(dataset: str, time: int):

    length = 0
    with open_dataset(get_dataset_url(dataset)) as ds:
        length = len(ds.timestamps)
        
    return not (0 <= time < length)

@bp_v0_0.route('/api/v0.1/range/<string:interp>/<int:radius>/<int:neighbours>/<string:dataset>/<string:projection>/<string:extent>/<string:depth>/<int:time>/<string:variable>.json')
def range_query_v0(interp: str, radius: int, neighbours: int, dataset: str, projection: str, extent: str, depth: str, time: int, variable: str):
  
    if (timestamp_outOfBounds(dataset, time)):
        raise ValueError

    return routes.routes_impl.range_query_impl(interp, radius, neighbours, dataset, projection, extent, variable, depth, time)

@bp_v0_0.route('/api/')
def info_v0():
    return routes.routes_impl.info_impl()


@bp_v0_0.route('/api/<string:q>/')
def query_v0(q: str):
    return routes.routes_impl.query_impl(q)


@bp_v0_0.route('/api/<string:q>/<string:q_id>.json')
def query_id_v0(q: str, q_id: str):
    return routes.routes_impl.query_id_impl(q, q_id)


@bp_v0_0.route('/api/data/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:location>.json')
def get_data_v0(dataset: str, variable: str, time: int, depth: str, location: str):
    
    if (timestamp_outOfBounds(dataset, time)):
        raise ValueError
    
    return routes.routes_impl.get_data_impl(dataset, variable, time, depth, location)


@bp_v0_0.route('/api/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def query_file_v0(q: str, projection: str, resolution: int, extent: str, file_id: str):
    return routes.routes_impl.query_file_impl(q, projection, resolution, extent, file_id)


@bp_v0_0.route('/api/datasets/')
def query_datasets_v0():
    return routes.routes_impl.query_datasets_impl(request.args)


@bp_v0_0.route('/api/colors/')
def colors_v0():
    return routes.routes_impl.colors_impl(request.args)


@bp_v0_0.route('/api/colormaps/')
def colormaps_v0():
    return routes.routes_impl.colormaps_impl()


@bp_v0_0.route('/colormaps.png')
def colormap_image_v0():
    return routes.routes_impl.colormap_image_impl()


@bp_v0_0.route('/api/depth/')
def depth_v0():
    return routes.routes_impl.depth_impl(request.args)


# Lists all observation variables
@bp_v0_0.route('/api/observationvariables/')
def obs_vars_query_v0():
    return routes.routes_impl.obs_vars_query_impl()


# Lists available variable from the given dataset argument and vector flags
@bp_v0_0.route('/api/variables/')
def vars_query_v0():
    return routes.routes_impl.vars_query_impl(request.args)


# List all the timestamps from the given dataset argument
@bp_v0_0.route('/api/timestamps/')
def time_query_v0():
    return routes.routes_impl.time_query_impl(request.args)


@bp_v0_0.route('/api/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>')
def timestamp_for_date_v0(old_dataset: str, date: int, new_dataset: str):

    return routes.routes_impl.timestamp_for_date_impl(old_dataset, date, new_dataset)


@bp_v0_0.route('/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale_v0(dataset: str, variable: str, scale: str):
    return routes.routes_impl.scale_impl(dataset, variable, scale)


@bp_v0_0.route('/tiles/v0.1/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:masked>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v0(projection: str, interp: str, radius: int, neighbours: int, dataset: str, variable: str, time: int, depth: str, scale: str, masked: int, zoom: int, x: int, y: int):
    
    if (timestamp_outOfBounds(dataset, time)):
        raise ValueError
    
    return routes.routes_impl.tile_impl(projection, interp, radius, neighbours, dataset, variable, time, depth, scale, masked, zoom, x, y)


@bp_v0_0.route('/tiles/topo/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo_v0(projection: str, zoom: int, x: int, y: int):
    return routes.routes_impl.topo_impl(projection, zoom, x, y, True)


@bp_v0_0.route('/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def bathymetry_v0(projection: str, zoom: int, x: int, y: int):
    return routes.routes_impl.bathymetry_impl(projection, zoom, x, y)


@bp_v0_0.route('/api/drifters/<string:q>/<string:drifter_id>')
def drifter_query_v0(q: str, drifter_id: str):
    return routes.routes_impl.drifter_query_impl(q, drifter_id)


@bp_v0_0.route('/api/class4/<string:q>/<string:class4_id>/<string:index>')
def class4_query_v0(q: str, class4_id: str, index: str):
    return routes.routes_impl.class4_query_impl(q, class4_id, index)


@bp_v0_0.route('/subset/')
def subset_query_v0():
    return routes.routes_impl.subset_query_impl(request.args)


@bp_v0_0.route('/plot/', methods=['GET', 'POST'])
def plot_v0():
    if request.method == "GET":
        if 'query' not in request.args:
            raise APIError("Please Provide a Query")
        query = json.loads(request.args.get('query'))
        #if (timestamp_outOfBounds(query.get('dataset'), query.get('time'))):
            #raise ValueError
        return routes.routes_impl.plot_impl(request.args)
    else:
        if 'query' not in request.args:
            raise APIError("Please Provide a Query")
        query = json.loads(request.form.get('query'))
        if (timestamp_outOfBounds(query.get('dataset'), query.get('time'))):
            raise ValueError
        return routes.routes_impl.plot_impl(request.form)


@bp_v0_0.route('/stats/', methods=['GET', 'POST'])
def stats_v0():
    if request.method == "GET":
        query = json.loads(request.args.get('query'))
        if (timestamp_outOfBounds(query.get('dataset'), query.get('time'))):
            raise ValueError
        return routes.routes_impl.stats_impl(request.args)
    else:
        query = json.loads(request.form.get('query'))
        if (timestamp_outOfBounds(query.get('dataset'), query.get('time'))):
            raise ValueError
        return routes.routes_impl.stats_impl(request.form)







