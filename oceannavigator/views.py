#!env python
# vim: set fileencoding=utf-8 :

from flask import Response, request, redirect, send_file
import json
from netCDF4 import Dataset, netcdftime
import datetime

from oceannavigator import app
from oceannavigator.database import log_query_to_db
from oceannavigator.util import get_variable_name, get_datasets, \
    get_dataset_url
from plotting.transect import plot as transect_plot
from plotting.transect import list_transects
from plotting.map import plot as map_plot
from plotting.overlays import list_overlays, list_overlays_in_file
from plotting.timeseries import plot as timeseries_plot
from plotting.ts import plot as ts_plot
from plotting.sound import plot as sound_plot
from plotting.ctd import plot as ctd_plot
from plotting.timeseries import list_stations
import numpy as np
import re


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


@app.route('/api/transects/')
def transects():
    data = list_transects()
    data = sorted(data, key=lambda k: k['name'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/stations/')
def stations():
    data = list_stations()
    data = sorted(data, key=lambda k: k['name'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/colormaps/')
def colormaps():
    data = [
        {'id': 'default', 'value': 'Default for Variable'},
        {'id': 'anomaly', 'value': 'Anomaly'},
        {'id': 'bathymetry', 'value': 'Bathymetry'},
        {'id': 'freesurface', 'value': 'Sea Surface Height (Free Surface)'},
        {'id': 'grey', 'value': 'Greyscale'},
        {'id': 'ice', 'value': 'Ice'},
        {'id': 'mercator_current', 'value': 'Mercator Ocean Current'},
        {'id': 'mercator', 'value': 'Mercator'},
        {'id': 'salinity', 'value': 'Salinity'},
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
    variable = request.args.get('variable')
    if ',' in variable:
        variable = variable.split(',')[0]

    data = []
    if 'dataset' in request.args:
        dataset = request.args['dataset']

        with Dataset(get_dataset_url(dataset), 'r') as ds:
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
                                'value': get_variable_name(dataset, v)
                            })

            if 'vectors' in request.args or 'vectors_only' in request.args:
                rxp = r"(?i)( x | y |zonal |meridional |northward |eastward)"
                if 'vozocrtx' in ds.variables:
                    n = get_variable_name(dataset, ds.variables['vozocrtx'])
                    data.append({
                        'id': 'vozocrtx,vomecrty',
                        'value': re.sub(rxp, " ", n)
                    })
                if 'itzocrtx' in ds.variables:
                    n = get_variable_name(dataset, ds.variables['itzocrtx'])
                    data.append({
                        'id': 'itzocrtx,itmecrty',
                        'value': re.sub(rxp, " ", n)
                    })
                if 'iicevelu' in ds.variables and not three_d:
                    n = get_variable_name(dataset, ds.variables['itzocrtx'])
                    data.append({
                        'id': 'iicevelu,iicevelv',
                        'value': re.sub(rxp, " ", n)
                    })
                if 'u_wind' in ds.variables and not three_d:
                    n = get_variable_name(dataset, ds.variables['u_wind'])
                    data.append({
                        'id': 'u_wind,v_wind',
                        'value': re.sub(rxp, " ", n)
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

    data = sorted(data, key=lambda k: -k['id'])
    data.insert(0, {'id': -1, 'value': 'Most Recent'})

    class DateTimeEncoder(json.JSONEncoder):

        def default(self, o):
            if isinstance(o, datetime.datetime):
                return o.strftime(dformat)

            return json.JSONEncoder.default(self, o)
    js = json.dumps(data, cls=DateTimeEncoder)
    resp = Response(js, status=200, mimetype='application/json')
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
    elif plottype == 'ctd':
        if size is None:
            opts['size'] = '11x9'
        else:
            opts['size'] = size

        if 'format' in request.args:
            opts['format'] = request.args.get('format')
        img, mime, filename = ctd_plot(dataset, **opts)
        response = Response(img, status=200, mimetype=mime)
    else:
        response = FAILURE

    if 'save' in request.args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename
    return response
