#!env python
# vim: set fileencoding=utf-8 :

from flask import Response, request, redirect, send_file, send_from_directory
from flask_babel import gettext, format_date
import json
import datetime

from oceannavigator import app
from oceannavigator.util import (
    get_variable_name, get_datasets,
    get_dataset_url, get_dataset_climatology, get_variable_scale,
    is_variable_hidden, get_dataset_cache
)
from oceannavigator.nearest_grid_point import find_nearest_grid_point

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
import plotting.tile
import plotting.scale
import numpy as np
import re
import oceannavigator.misc
import os, subprocess, shlex
import plotting.colormap
import geopy
import base64
import pytz
from data import open_dataset
import xarray as xr
import pandas
import zipfile

MAX_CACHE = 315360000
FAILURE = redirect("/", code=302)


@app.route('/api/range/<string:dataset>/<string:projection>/<string:extent>/<string:depth>/<int:time>/<string:variable>.json')
def range_query(dataset, projection, extent, variable, depth, time):
    extent = list(map(float, extent.split(",")))
    min, max = plotting.scale.get_scale(
        dataset, variable, depth, time, projection, extent)

    js = json.dumps({
        'min': min,
        'max': max,
    })
    resp = Response(js, status=200, mimetype='application/json')
    resp.cache_control.max_age = MAX_CACHE
    return resp


@app.route('/api/<string:q>/')
def query(q):
    data = []
    max_age = 86400
    if q == 'points':
        data = oceannavigator.misc.list_kml_files('point')
    elif q == 'lines':
        data = oceannavigator.misc.list_kml_files('line')
    elif q == 'areas':
        data = oceannavigator.misc.list_kml_files('area')
    elif q == 'class4':
        data = oceannavigator.misc.list_class4_files()
    else:
        return FAILURE

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.cache_control.max_age = max_age
    return resp


@app.route('/api/<string:q>/<string:q_id>.json')
def query_id(q, q_id):
    if q == 'areas':
        data = oceannavigator.misc.list_areas(q_id)
    elif q == 'class4':
        data = oceannavigator.misc.list_class4(q_id)
    elif q == 'drifters' and q_id == 'meta':
        data = oceannavigator.misc.drifter_meta()
    elif q == 'observation' and q_id == 'meta':
        data = oceannavigator.misc.observation_meta()
    else:
        return FAILURE

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/data/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:location>.json')
def get_data(dataset, variable, time, depth, location):
    data = oceannavigator.misc.get_point_data(
        dataset, variable, time, depth,
        list(map(float, location.split(",")))
    )
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    # resp.cache_control.max_age = MAX_CACHE
    resp.cache_control.max_age = 2
    return resp


@app.route('/api/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def query_file(q, projection, resolution, extent, file_id):
    data = []
    max_age = 86400

    if q == 'points':
        data = oceannavigator.misc.points(
            file_id, projection, resolution, extent)
    elif q == 'lines':
        data = oceannavigator.misc.lines(
            file_id, projection, resolution, extent)
    elif q == 'areas':
        data = oceannavigator.misc.areas(
            file_id, projection, resolution, extent)
    elif q == 'class4':
        data = oceannavigator.misc.class4(
            file_id, projection, resolution, extent)
    elif q == 'drifters':
        data = oceannavigator.misc.drifters(
            file_id, projection, resolution, extent)
        max_age = 3600
    elif q == 'observations':
        data = oceannavigator.misc.observations(
            file_id, projection, resolution, extent)
    else:
        return FAILURE

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.cache_control.max_age = max_age
    return resp


@app.route('/api/datasets/')
def query_datasets():
    data = []
    for key, ds in list(get_datasets().items()):
        data.append({
            'id': key,
            'value': ds['name'],
            'quantum': ds['quantum'],
            'help': ds.get('help'),
            'attribution': ds.get('attribution'),
        })

    data = sorted(data, key=lambda k: k['value'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/api/colors/')
def colors():
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
    if request.args.get('random'):
        data.insert(0, {'id': 'rnd', 'value': gettext('Randomize')})
    if request.args.get('none'):
        data.insert(0, {'id': 'none', 'value': gettext('None')})
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/colormaps/')
def colormaps():
    data = sorted([
        {
            'id': i,
            'value': n
        }
        for i, n in list(plotting.colormap.get_colormap_names().items())
    ], key=lambda k: k['value'])
    data.insert(0, {'id': 'default', 'value': gettext('Default for Variable')})

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/colormaps.png')
def colormap_image():
    img = plotting.colormap.plot_colormaps()
    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/depth/')
def depth():
    var = request.args.get('variable')

    if var is None:
        return FAILURE

    variables = var.split(',')
    variables = [re.sub('_anom$', '', v) for v in variables]

    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']

        with open_dataset(get_dataset_url(dataset)) as ds:
            for variable in variables:
                if variable and \
                    variable in ds.variables and \
                        set(ds.depth_dimensions) & \
                   set(ds.variables[variable].dimensions):
                    if str(request.args.get('all')).lower() in ['true',
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

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/observationvariables/')
def obs_vars_query():
    data = []
    for idx, v in enumerate(oceannavigator.misc.observation_vars()):
        data.append({'id': idx, 'value': v})

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/variables/')
def vars_query():
    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']

        if get_dataset_climatology(dataset) != "" and 'anom' in request.args:
            with open_dataset(get_dataset_climatology(dataset)) as ds:
                climatology_variables = list(map(str, ds.variables))
        else:
            climatology_variables = []

        three_d = '3d_only' in request.args
        with open_dataset(get_dataset_url(dataset)) as ds:
            if 'vectors_only' not in request.args:
                for v in ds.variables:
                    if ('time_counter' in v.dimensions or
                        'time' in v.dimensions) \
                            and ('y' in v.dimensions or
                                 'yc' in v.dimensions or
                                 'node' in v.dimensions or
                                 'nele' in v.dimensions or
                                 'latitude' in v.dimensions or
                                 'lat' in v.dimensions):
                        if three_d and not (
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
                'u_wind': 'u_wind,v_wind',
                'u': 'u,v',
                'ua': 'ua,va',
                'u-component_of_wind_height_above_ground': 'u-component_of_wind_height_above_ground,v-component_of_wind_height_above_ground'
            }

            if 'vectors' in request.args or 'vectors_only' in request.args:
                rxp = r"(?i)( x | y |zonal |meridional |northward |eastward)"

                for key, value in list(VECTOR_MAP.items()):
                    if key in ds.variables:
                        n = get_variable_name(dataset, ds.variables[key])
                        data.append({
                            'id': value,
                            'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                            'scale': [0, get_variable_scale(
                                dataset,
                                ds.variables[key]
                            )[1]]
                        })

    data = sorted(data, key=lambda k: k['value'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/timestamps/')
def time_query():
    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']
        quantum = request.args.get('quantum')
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


@app.route('/api/timestamp/<string:old_dataset>/<int:date>/<string:new_dataset>')
def timestamp_for_date(old_dataset, date, new_dataset):
    with open_dataset(get_dataset_url(old_dataset)) as ds:
        timestamp = ds.timestamps[date]

    with open_dataset(get_dataset_url(new_dataset)) as ds:
        timestamps = ds.timestamps

    diffs = np.vectorize(lambda x: x.total_seconds())(timestamps - timestamp)
    idx = np.where(diffs <= 0)[0]
    res = 0
    if len(idx) > 0:
        res = idx.max()

    return Response(json.dumps(res), status=200, mimetype='application/json')


@app.route('/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale(dataset, variable, scale):
    img = plotting.tile.scale({
        'dataset': dataset,
        'variable': variable,
        'scale': scale,
    })
    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = MAX_CACHE
    return resp


def _cache_and_send_img(img, f):
    p = os.path.dirname(f)
    if not os.path.isdir(p):
        os.makedirs(p)

    with open(f, 'wb') as out:
        out.write(img)

    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = MAX_CACHE
    return resp


# Renders the map images and sends it to the browser
@app.route('/tiles/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile(projection, dataset, variable, time, depth, scale, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    
    # Check of the tile/image is cached and send it
    if _is_cache_valid(dataset, f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it
    else:
        if depth != "bottom" and depth != "all":
            depth = int(depth)

        img = plotting.tile.plot(projection, x, y, zoom, {
            'dataset': dataset,
            'variable': variable,
            'time': time,
            'depth': depth,
            'scale': scale,
        })

        return _cache_and_send_img(img, f)


# Renders basemap
@app.route('/tiles/topo/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo(projection, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    
    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        img = plotting.tile.topo(projection, x, y, zoom, {})
        return _cache_and_send_img(img, f)


# Renders bathymetry contours
@app.route('/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def bathymetry(projection, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    else:
        img = plotting.tile.bathymetry(projection, x, y, zoom, {})
        return _cache_and_send_img(img, f)


@app.route('/api/drifters/<string:q>/<string:drifter_id>')
def drifter_query(q, drifter_id):
    if q == 'vars':
        pts = oceannavigator.misc.drifters_vars(drifter_id)
    elif q == 'time':
        pts = oceannavigator.misc.drifters_time(drifter_id)
    else:
        return FAILURE

    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/class4/<string:q>/<string:class4_id>/<int:index>')
def class4_query(q, class4_id, index):
    if q == 'forecasts':
        pts = oceannavigator.misc.list_class4_forecasts(class4_id)
    elif q == 'models':
        pts = oceannavigator.misc.list_class4_models(class4_id)
    else:
        return FAILURE

    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/subset/<string:output_format>/<string:dataset_name>/<string:variables>/<string:min_range>/<string:max_range>/<string:time>/<int:should_zip>')
def subset_query(output_format, dataset_name, variables, min_range, max_range, time, should_zip):
    
    # Bounding box extents
    bottom_left = [float(x) for x in min_range.split(',')]
    top_right = [float(x) for x in max_range.split(',')]

    # Time range
    time_range = [int(x) for x in time.split(',')]
    apply_time_range = False
    if time_range[0] != time_range[1]:
        apply_time_range = True

    # Ensure we have an output folder that will be cleaned by tmpreaper
    if not os.path.isdir("/tmp/subset"):
        os.makedirs("/tmp/subset")
    working_dir = "/tmp/subset/"

    with xr.open_dataset(get_dataset_url(dataset_name)) as dataset:

        # Finds a variable in a dictionary given a substring containing common characters
        # Not a fool-proof method but I want to avoid regex because I hate it.
        variable_list = list(dataset.variables.keys())
        def find_variable(substring):
            for key in variable_list:
                if substring in key:
                    variable_list.remove(key) # Remove from list to speed up search
                    return key

        # Get lat/lon variable names from dataset (since they all differ >.>)
        lat = find_variable("lat")
        lon = find_variable("lon")

        # Find closest indices in dataset corresponding to each calculated point
        # riops used "latitude" and "longitude"
        ymin_index, xmin_index = find_nearest_grid_point(
            bottom_left[0], bottom_left[1], dataset, lat, lon
        )
        ymax_index, xmax_index = find_nearest_grid_point(
            top_right[0], top_right[1], dataset, lat, lon
        )

        # Get nicely formatted bearings
        p0 = geopy.Point(bottom_left)
        p1 = geopy.Point(top_right)
        
        # Get timestamp
        time_variable = find_variable("time")
        timestamp = str(format_date(pandas.to_datetime(dataset[time_variable][int(time_range[0])].values), "yyyyMMdd"))
        if apply_time_range:
            endtimestamp = "-" + str(format_date(pandas.to_datetime(dataset[time_variable][int(time_range[1])].values), "yyyyMMdd"))
        else:
            endtimestamp = ""

        # Do subsetting
        if "riops" in dataset_name:
            # Riops has different coordinate names...why? ¯\_(ツ)_/¯
            subset = dataset.isel(yc=slice(ymin_index, ymax_index), xc=slice(xmin_index, xmax_index))
        elif dataset_name == "giops_forecast":
            subset = dataset.isel(latitude=slice(ymin_index, ymax_index), longitude=slice(xmin_index, xmax_index))
        else:
            subset = dataset.isel(y=slice(ymin_index, ymax_index), x=slice(xmin_index, xmax_index))
        # Select requested time (time range if applicable)
        if apply_time_range:
            subset = subset.isel(**{time_variable: slice(time_range[0], time_range[1] + 1)}) # slice doesn't include the last element
        else:
            subset = subset.isel(**{time_variable: int(time_range[0])})

        # Filter out unwanted variables
        output_vars = variables.split(',')
        output_vars.extend([find_variable('depth'), time_variable, lat, lon]) # Keep the coordinate variables
        for variable in subset.data_vars:
            if variable not in output_vars:
                subset = subset.drop(variable)

        filename =  dataset_name + "_" + "%dN%dW-%dN%dW" % (p0.latitude, p0.longitude, p1.latitude, p1.longitude) \
                    + "_" + timestamp + endtimestamp + "_" + output_format

        # Export to NetCDF
        subset.to_netcdf(working_dir + filename + ".nc", format=output_format)

    if should_zip == 1:
        myzip = zipfile.ZipFile('%s%s.zip' % (working_dir, filename), mode='w')
        myzip.write('%s%s.nc' % (working_dir, filename), os.path.basename('%s%s.nc' % (working_dir, filename)))
        myzip.comment = 'Generated from www.navigator.oceansdata.ca'
        myzip.close() # Must be called to actually create zip

        return send_from_directory(working_dir, '%s.zip' % filename, as_attachment=True)

    return send_from_directory(working_dir, '%s.nc' % filename, as_attachment=True)

@app.route('/plot/', methods=['GET', 'POST'])
def plot():
    if request.method == "GET":
        if 'query' not in request.args:
            return FAILURE

        query = json.loads(request.args.get('query'))
    else:
        if 'query' not in request.form:
            return FAILURE

        query = json.loads(request.form.get('query'))

    if ("format" in request.args and request.args.get("format") == "json") or \
       ("format" in request.form and request.form.get("format") == "json"):

        # Generates a Base64 encoded string
        def make_response(data, mime):
            b64 = base64.b64encode(data)

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
    if 'save' in request.args:
        if 'size' in request.args:
            size = request.args.get('size')
        if 'dpi' in request.args:
            opts['dpi'] = request.args.get('dpi')

    if 'format' in request.args:
        opts['format'] = request.args.get('format')

    if size is None:
        opts['size'] = '11x9'
    else:
        opts['size'] = size

    filename = 'png'
    img = ""

    # Determine which plotter we need.
    if plottype == 'map':
        plotter = MapPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'transect':
        plotter = TransectPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'timeseries':
        plotter = TimeseriesPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'ts':
        plotter = TemperatureSalinityPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'sound':
        plotter = SoundSpeedPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'profile':
        plotter = ProfilePlotter(dataset, query, request.args.get('format'))
    elif plottype == 'hovmoller':
        plotter = HovmollerPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'observation':
        plotter = ObservationPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'drifter':
        plotter = DrifterPlotter(dataset, query, request.args.get('format'))
    elif plottype == 'class4':
        plotter = Class4Plotter(dataset, query, request.args.get('format'))
    elif plottype == 'stick':
        plotter = StickPlotter(dataset, query, request.args.get('format'))
    else:
        return FAILURE

    # Get the data from the selected plotter.
    img, mime, filename = plotter.run(size=size, dpi=request.args.get('dpi'))
    
    if img != "":
        response = make_response(img, mime)
    else:
        return FAILURE

    if 'save' in request.args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename

    response.cache_control.max_age = 300

    return response


@app.route('/stats/', methods=['GET', 'POST'])
def stats():
    if request.method == "GET":
        if 'query' not in request.args:
            return FAILURE

        query = json.loads(request.args.get('query'))
    else:
        if 'query' not in request.form:
            return FAILURE

        query = json.loads(request.form.get('query'))

    dataset = query.get('dataset')

    data = areastats(dataset, query)
    return Response(data, status=200, mimetype='application/json')


def _is_cache_valid(dataset, f):
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
