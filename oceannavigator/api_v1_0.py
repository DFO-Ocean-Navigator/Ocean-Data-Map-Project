from flask import Response, request, redirect, send_file, send_from_directory, jsonify
from flask_babel import gettext, format_date
import json
import datetime
from io import BytesIO
from PIL import Image
import io

from oceannavigator import app
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
from plotting.scripter import constructScript
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

# API INTERFACE 

#
# Time Conversion Test Functions
#
@app.route('/api/timestampconversion/')
def conversion():
  return convert_to_timestamp(request.args.get('date'))


#
#
#
@app.route('/api/v1.0/range/<string:interp>/<int:radius>/<int:neighbours>/<string:dataset>/<string:projection>/<string:extent>/<string:depth>/<string:time>/<string:variable>.json')
def range_query_v1_0(interp, radius, neighbours, dataset, projection, extent, variable, depth, time):
  return None
  

#
#
#
@app.route('/api/v1.0/data/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:location>.json')
def get_data(dataset, variable, time, depth, location):
  return None

#
#
#
@app.route('/api/v1.0/tiles/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v0_1(projection, interp, radius, neighbours, dataset, variable, time, depth, scale, zoom, x, y):
  return None

#
#
#
@app.route('/api/v1.0/plot/', methods=['GET', 'POST'])
def plot():
  return None

#
#
#
@app.route('/api/v1.0/stats/', methods=['GET', 'POST'])
def stats():
  return None





