#!env python
# vim: set fileencoding=utf-8 :

from flask import Response, request, redirect, send_file
import json
from netCDF4 import Dataset, netcdftime
import datetime

from oceannavigator import app
from oceannavigator.database import log_query_to_db
from oceannavigator.util import get_variable_name, get_datasets, \
    get_dataset_url, get_dataset_climatology, get_variable_scale
from plotting.transect import plot as transect_plot
from plotting.drifter import plot as drifter_plot
from plotting.map import plot as map_plot
from plotting.overlays import list_overlays, list_overlays_in_file
from plotting.timeseries import plot as timeseries_plot
from plotting.ts import plot as ts_plot
from plotting.sound import plot as sound_plot
from plotting.profile import plot as profile_plot
from plotting.hovmoller import plot as hovmoller_plot
from plotting.class4 import plot as class4_plot
from plotting.stats import stats as areastats
import plotting.tile
import numpy as np
import re
import oceannavigator.misc
import os


@app.route('/api/datasets/')
def query_datasets():
    data = []
    for key, ds in get_datasets().items():
        data.append({
            'id': key,
            'value': ds['name'],
            'quantum': ds['quantum'],
            'help': ds.get('help'),
        })

    data = sorted(data, key=lambda k: k['value'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp


@app.route('/api/overlays/')
def overlays():
    if 'file' in request.args:
        f = request.args.get('file')
        if f is None or f == 'none' or f == '':
            data = []
        else:
            data = list_overlays_in_file(request.args.get('file'))
    else:
        data = list_overlays()
    data = sorted(data, key=lambda k: k['value'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/colors/')
def colors():
    data = [
        {'id': 'k', 'value': 'Black'},
        {'id': 'b', 'value': 'Blue'},
        {'id': 'g', 'value': 'Green'},
        {'id': 'r', 'value': 'Red'},
        {'id': 'c', 'value': 'Cyan'},
        {'id': 'm', 'value': 'Magenta'},
        {'id': 'y', 'value': 'Yellow'},
        {'id': 'w', 'value': 'White'},
    ]
    if request.args.get('random'):
        data.insert(0, {'id': 'rnd', 'value': 'Randomize'})
    if request.args.get('none'):
        data.insert(0, {'id': 'none', 'value': 'None'})
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/colormaps/')
def colormaps():
    data = [
        {'id': 'default', 'value': 'Default for Variable'},
        {'id': 'anomaly', 'value': 'Anomaly'},
        {'id': 'bathymetry', 'value': 'Bathymetry'},
        {'id': 'chlorophyll', 'value': 'Chlorophyll'},
        {'id': 'freesurface', 'value': 'Sea Surface Height (Free Surface)'},
        {'id': 'grey', 'value': 'Greyscale'},
        {'id': 'ice', 'value': 'Ice'},
        {'id': 'iron', 'value': 'Iron'},
        {'id': 'mercator_current', 'value': 'Mercator Ocean Current'},
        {'id': 'mercator', 'value': 'Mercator'},
        {'id': 'nitrate', 'value': 'Nitrate'},
        {'id': 'oxygen', 'value': 'Oxygen'},
        {'id': 'phosphate', 'value': 'Phosphate'},
        {'id': 'phytoplankton', 'value': 'Phytoplankton'},
        {'id': 'salinity', 'value': 'Salinity'},
        {'id': 'silicate', 'value': 'Silicate'},
        {'id': 'speed', 'value': 'Speed'},
        {'id': 'temperature', 'value': 'Temperature'},
        {'id': 'velocity', 'value': 'Velocity'},
        {'id': 'waveheight', 'value': 'Wave Height'},
        {'id': 'waveperiod', 'value': 'Wave Period'},
    ]
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/depth/')
def depth():
    var = request.args.get('variable')

    variables = var.split(',')
    variables = [re.sub('_anom$', '', v) for v in variables]

    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']

        with Dataset(get_dataset_url(dataset), 'r') as ds:
            for variable in variables:
                if variable and \
                    variable in ds.variables and \
                    ('deptht' in ds.variables[variable].dimensions or
                        'depth' in ds.variables[variable].dimensions):
                    if str(request.args.get('all')).lower() in ['true',
                                                                'yes',
                                                                'on']:
                        data.append({'id': 'all', 'value': 'All Depths'})

                    if 'deptht' in ds.variables:
                        depth_var = ds.variables['deptht']
                    elif 'depth' in ds.variables:
                        depth_var = ds.variables['depth']

                    for idx, value in enumerate(np.round(depth_var)):
                        data.append({
                            'id': idx,
                            'value': "%d " % (value) + depth_var.units % value
                        })

                data.insert(0, {'id': 'bottom', 'value': 'Bottom'})
    data = [
        e for i, e in enumerate(data) if data.index(e) == i
    ]

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/locations/')
def locations():
    data = [
        {
            'id': 'nwatlantic',
            'value': 'Northwest Atlantic',
            'help': 'Predefined Northwest Atlantic area, ' +
                    'Lambert Conformal Conic Projection',
        },
        {
            'id': 'arctic',
            'value': 'Arctic Circle',
            'help': 'Predefined Arctic area, ' +
                    'Polar Stereographic Projection',
        },
        {
            'id': 'nwpassage',
            'value': 'Northwest Passage',
            'help': 'Predefined Northwest Passage area, ' +
                    'Lambert Conformal Conic Projection',
        },
        {
            'id': 'pacific',
            'value': 'Northeast Pacific',
            'help': 'Predefined Northeast Pacific area, ' +
                    'Lambert Conformal Conic Projection',
        },
    ]
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route('/api/variables/')
def vars_query():
    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']

        if get_dataset_climatology(dataset) != "" and 'anom' in request.args:
            with Dataset(get_dataset_climatology(dataset), 'r') as ds:
                climatology_variables = map(str, ds.variables)
        else:
            climatology_variables = []

        three_d = '3d_only' in request.args
        with Dataset(get_dataset_url(dataset), 'r') as ds:
            if 'vectors_only' not in request.args:
                for k, v in ds.variables.iteritems():
                    if ('time_counter' in v.dimensions or
                        'time' in v.dimensions) \
                            and ('y' in v.dimensions or 'yc' in v.dimensions):
                        if three_d and ('deptht' not in v.dimensions and
                                        'depth' not in v.dimensions):
                            continue
                        else:
                            data.append({
                                'id': k,
                                'value': get_variable_name(dataset, v),
                                'scale': get_variable_scale(dataset, v)
                            })
                            if k in climatology_variables:
                                data.append({
                                    'id': k + "_anom",
                                    'value': get_variable_name(dataset, v) + " Anomaly",
                                    'scale': [-10, 10]
                                })

            if 'vectors' in request.args or 'vectors_only' in request.args:
                rxp = r"(?i)( x | y |zonal |meridional |northward |eastward)"
                if 'vozocrtx' in ds.variables:
                    n = get_variable_name(dataset, ds.variables['vozocrtx'])
                    data.append({
                        'id': 'vozocrtx,vomecrty',
                        'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                        'scale': [0, get_variable_scale(dataset,
                                                        'vozocrtx')[1]]
                    })
                if 'itzocrtx' in ds.variables:
                    n = get_variable_name(dataset, ds.variables['itzocrtx'])
                    data.append({
                        'id': 'itzocrtx,itmecrty',
                        'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                        'scale': [0, get_variable_scale(dataset,
                                                        'itzocrtx')[1]]
                    })
                if 'iicevelu' in ds.variables and not three_d:
                    n = get_variable_name(dataset, ds.variables['iicevelu'])
                    data.append({
                        'id': 'iicevelu,iicevelv',
                        'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                        'scale': [0, get_variable_scale(dataset,
                                                        'iicevelu')[1]]
                    })
                if 'u_wind' in ds.variables and not three_d:
                    n = get_variable_name(dataset, ds.variables['u_wind'])
                    data.append({
                        'id': 'u_wind,v_wind',
                        'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                        'scale': [0, get_variable_scale(dataset, 'u_wind')[1]]
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
        if quantum == 'month':
            dformat = "%B %Y"
        elif quantum == 'day':
            dformat = "%d %B %Y"
        elif quantum == 'hour':
            dformat = "%d %B %Y %H:%M"
        else:
            if 'month' in dataset:
                dformat = "%B %Y"
            else:
                dformat = "%d %B %Y"
        with Dataset(get_dataset_url(dataset), 'r') as ds:
            if 'time_counter' in ds.variables:
                time_var = ds.variables['time_counter']
            elif 'time' in ds.variables:
                time_var = ds.variables['time']

            t = netcdftime.utime(time_var.units)
            for idx, date in \
                    enumerate(t.num2date(time_var[:])):
                data.append({'id': idx, 'value': date})

    data = sorted(data, key=lambda k: k['id'])

    class DateTimeEncoder(json.JSONEncoder):

        def default(self, o):
            if isinstance(o, datetime.datetime):
                return o.strftime(dformat)

            return json.JSONEncoder.default(self, o)
    js = json.dumps(data, cls=DateTimeEncoder)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale(dataset, variable, scale):
    img = plotting.tile.scale({
        'dataset': dataset,
        'variable': variable,
        'scale': scale,
    })
    resp = Response(img, status=200, mimetype='image/png')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/tiles/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile(projection, dataset, variable, time, depth, scale, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=86400)
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

        p = os.path.dirname(f)
        if not os.path.isdir(p):
            os.makedirs(p)

        with open(f, 'w') as out:
            out.write(img)

        resp = Response(img, status=200, mimetype='image/png')
        resp.cache_control.max_age = 86400
        return resp


@app.route('/tiles/topo/<string:projection>/<int:zoom>/<int:x>/<int:y>.png')
def topo(projection, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    if os.path.isfile(f):
        return send_file(f, mimetype='image/png', cache_timeout=86400)
    else:
        img = plotting.tile.topo(projection, x, y, zoom, {})

        p = os.path.dirname(f)
        if not os.path.isdir(p):
            os.makedirs(p)

        with open(f, 'w') as out:
            out.write(img)

        resp = Response(img, status=200, mimetype='image/png')
        resp.cache_control.max_age = 86400
        return resp


@app.route('/api/points/')
def points():
    pts = oceannavigator.misc.list_point_files()
    data = json.dumps(pts)
    return Response(data, status=200, mimetype='application/json')


@app.route('/api/points/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def points_file(projection, resolution, extent, file_id):
    pts = oceannavigator.misc.points(file_id, projection, resolution, extent)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/lines/')
def lines():
    pts = oceannavigator.misc.list_line_files()
    data = json.dumps(pts)
    return Response(data, status=200, mimetype='application/json')


@app.route('/api/lines/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json')
def lines_file(projection, resolution, extent, file_id):
    pts = oceannavigator.misc.lines(file_id, projection, resolution, extent)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/areas/')
def areas():
    pts = oceannavigator.misc.list_area_files()
    data = json.dumps(pts)
    return Response(data, status=200, mimetype='application/json')


@app.route('/api/areas/<string:projection>/<int:resolution>/<string:extent>/<string:area_id>.json')
def areas_resolution(projection, resolution, extent, area_id):
    d = oceannavigator.misc.areas(area_id, projection,
                                  resolution, extent)
    data = json.dumps(d)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 1
    return resp


@app.route('/api/areas/<string:file_id>')
def areas_file(file_id):
    pts = oceannavigator.misc.list_areas(file_id)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/drifters/')
def drifters():
    pts = oceannavigator.misc.list_drifters()
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/drifters/<string:projection>/<int:resolution>/<string:extent>/<string:drifter_id>.json')
def drifter(projection, resolution, extent, drifter_id):
    d = oceannavigator.misc.drifters(drifter_id, projection,
                                     resolution, extent)
    data = json.dumps(d)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/drifters/vars/<string:drifter_id>')
def drifter_var(drifter_id):
    pts = oceannavigator.misc.drifters_vars(drifter_id)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/drifters/time/<string:drifter_id>')
def drifter_time(drifter_id):
    pts = oceannavigator.misc.drifters_time(drifter_id)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/class4/')
def class4_files():
    pts = oceannavigator.misc.list_class4_files()
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/class4/<string:class4_id>')
def class4(class4_id):
    pts = oceannavigator.misc.list_class4(class4_id)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/class4/<string:projection>/<int:resolution>/<string:extent>/<string:class4_id>.json')
def class4_json(projection, resolution, extent, class4_id):
    d = oceannavigator.misc.class4(class4_id, projection,
                                   resolution, extent)
    data = json.dumps(d)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/class4/forecasts/<string:class4_id>/<int:index>')
def class4_forecasts(class4_id, index):
    pts = oceannavigator.misc.list_class4_forecasts(class4_id)
    data = json.dumps(pts)
    resp = Response(data, status=200, mimetype='application/json')
    resp.cache_control.max_age = 86400
    return resp


@app.route('/images/failure.gif')
def log_failure():
    log_query_to_db(request)
    return send_file('static/images/failure.gif')


@app.route('/plot/')
def plot():
    FAILURE = redirect("/", code=302)
    if 'query' not in request.args:
        return FAILURE

    query = json.loads(request.args.get('query'))

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

    filename = 'png'
    if plottype == 'map':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = map_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'transect':
        if size is None:
            opts['size'] = '11x5'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = transect_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'drifter':
        if size is None:
            opts['size'] = '11x5'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = drifter_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'timeseries':
        if size is None:
            opts['size'] = '11x5'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = timeseries_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'ts':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = ts_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'sound':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = sound_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'profile':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = profile_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'class4':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = class4_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    elif plottype == 'hovmoller':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = hovmoller_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    else:
        response = FAILURE

    if 'save' in request.args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename

    if response != FAILURE:
        response.cache_control.max_age = 300

    return response


@app.route('/stats/')
def stats():
    FAILURE = redirect("/", code=302)
    if 'query' not in request.args:
        return FAILURE

    query = json.loads(request.args.get('query'))

    dataset = query.get('dataset')

    data = areastats(dataset, query)
    return Response(data, status=200, mimetype='application/json')
