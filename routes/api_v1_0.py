from flask import Flask, render_template, Blueprint, Response, request, redirect, send_file, send_from_directory, jsonify
from flask_babel import gettext, format_date
import json
import datetime
from io import BytesIO
from PIL import Image
import io
import hashlib
from oceannavigator import DatasetConfig
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
from plotting.scriptGenerator import generatePython, generateR
from data import open_dataset
from data.netcdf_data import NetCDFData
import routes.routes_impl


bp_v1_0 = Blueprint('api_v1_0', __name__)

#~~~~~~~~~~~~~~~~~~~~~~~
# API INTERFACE 
#~~~~~~~~~~~~~~~~~~~~~~~

@bp_v1_0.route("/api/v1.0/generatescript/<string:url>/<string:type>/")
def generateScript(url: str, type: str):

  if type == "python":
    b = generatePython(url)
    resp = send_file(b, as_attachment=True, attachment_filename='script_template.py', mimetype='application/x-python')
    
  elif type == "r":
    b = generateR(url)
    resp = send_file(b, as_attachment=True, attachment_filename='script_template.r', mimetype='application/x-python')
  
  return resp

#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/datasets/')
def query_datasets_v1_0():
  return routes.routes_impl.query_datasets_impl(request.args)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/variables/')
def vars_query_v1_0():
  return routes.routes_impl.vars_query_impl(request.args)


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/observationvariables/')
def obs_vars_query_v1():
  return routes.routes_impl.obs_vars_query_impl()


#
# Unchanged from v0.0
#
@bp_v1_0.route('/api/v1.0/timestamps/')
def time_query_v1_0():
  return routes.routes_impl.time_query_impl(request.args)


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
    #print(date)
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
    date = {'time' : date}
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
  query = json.loads(args.get('query'))

  config = DatasetConfig(query.get('dataset'))
  with open_dataset(config) as dataset:
    if 'time' in query:
      query['time'] = dataset.convert_to_timestamp(query.get('time'))  
    else:
      query['starttime'] = dataset.convert_to_timestamp(query.get('starttime'))
      query['endtime'] = dataset.convert_to_timestamp(query.get('endtime'))
      
    resp = routes.routes_impl.plot_impl(args,query)

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