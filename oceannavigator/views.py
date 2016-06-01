#!env python

from flask import Response, request, redirect
import json
from netCDF4 import Dataset, netcdftime
import datetime

from oceannavigator import app
from plotting.transect import plot as transect_plot
from plotting.transect import list_transects
from plotting.map import plot as map_plot
from plotting.overlays import list_overlays, list_overlays_in_file
from plotting.timeseries import plot as ts_plot
from plotting.timeseries import list_stations
import numpy as np


@app.route('/api/datasets/')
def query_datasets():
    data = [
        {'id': 'giops/monthly/aggregated.ncml', 'value': 'GIOPS Monthly'},
        {'id': 'giops/daily/aggregated.ncml', 'value': 'GIOPS Daily'},
        {'id': 'glorys/monthly/aggregated.ncml', 'value': 'GLORYS Monthly'},
    ]
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
    if 'dataset' in request.args:
        filename = request.args.get('dataset')
    else:
        filename = 'giops/monthly/aggregated.ncml'

    variable = request.args.get('variable')
    if ',' in variable:
        variable = variable.split(',')[0]

    with Dataset(app.config['THREDDS_SERVER'] +
                 'dodsC/' + filename, 'r') as ds:
        data = []
        if variable and \
           variable in ds.variables and \
           'deptht' in ds.variables[variable].dimensions:
            if str(request.args.get('all')).lower() in ['true', 'yes', 'on']:
                data.append({'id': 'all', 'value': 'All Depths'})
            for idx, value in enumerate(np.round(ds.variables['deptht'])):
                data.append({
                    'id': idx,
                    'value': "%d " % (value) +
                             ds.variables['deptht'].units % value
                })

    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/locations/')
def locations():
    data = [
        {'id': 'nwatlantic', 'value': 'Northwest Atlantic'},
        {'id': 'arctic', 'value': 'Arctic Circle'},
        {'id': 'pacific', 'value': 'Northeast Pacific'},
    ]
    return Response(json.dumps(data), status=200, mimetype='application/json')


@app.route('/api/variables/')
def vars_query():
    if 'dataset' in request.args:
        filename = request.args['dataset']
    else:
        filename = 'giops/monthly/aggregated.ncml'

    data = []
    three_d = '3d_only' in request.args
    with Dataset(app.config['THREDDS_SERVER'] +
                 'dodsC/' + filename, 'r') as ds:
        if 'vectors_only' not in request.args:
            for k, v in ds.variables.iteritems():
                if 'time_counter' in v.dimensions and 'y' in v.dimensions:
                    if three_d and 'deptht' not in v.dimensions:
                        continue
                    else:
                        data.append({
                            'id': k,
                            'value': v.long_name.replace(" at CMC", "").title()
                        })

        if 'vectors' in request.args or 'vectors_only' in request.args:
            if 'vozocrtx' in ds.variables:
                data.append(
                    {'id': 'vozocrtx,vomecrty', 'value': 'Sea Water Velocity'})
            if 'bottom_vozocrtx' in ds.variables and not three_d:
                data.append({
                    'id': 'bottom_vozocrtx,bottom_vomecrty',
                    'value': 'Bottom Sea Water Velocity'
                })
            if 'u_wind' in ds.variables and not three_d:
                data.append({'id': 'u_wind,v_wind', 'value': 'Wind'})

    data = sorted(data, key=lambda k: k['value'])
    js = json.dumps(data)
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/api/timestamps/')
def time_query():
    if 'dataset' in request.args:
        filename = request.args['dataset']
    else:
        filename = 'giops/monthly/aggregated.ncml'

    if 'format' in request.args:
        dformat = request.args.get('format')
    elif 'monthly' in filename:
        dformat = '%B %Y'
    else:
        dformat = '%d %B %Y'

    data = []
    with Dataset(app.config['THREDDS_SERVER'] +
                 'dodsC/' + filename, 'r') as ds:
        t = netcdftime.utime(ds.variables['time_counter'].units)
        for idx, date in \
                enumerate(t.num2date(ds.variables['time_counter'][:])):
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


@app.route('/plot/')
def plot():
    FAILURE = redirect("/", code=302)
    if 'query' not in request.args:
        return FAILURE

    query = json.loads(request.args.get('query'))

    if 'dataset' in query:
        filename = query['dataset']
    else:
        filename = 'giops/monthly/aggregated.ncml'

    if filename.startswith('giops'):
        climate_file = 'climatology/Levitus98_PHC21/aggregated.ncml'
    elif filename.startswith('glorys'):
        climate_file = 'climatology/glorys/aggregated.ncml'
    else:
        climate_file = 'climatology/Levitus98_PHC21/aggregated.ncml'

    url = app.config['THREDDS_SERVER'] + 'dodsC/' + filename
    climate_url = app.config['THREDDS_SERVER'] + 'dodsC/' + climate_file

    opts = {
        'dpi': 72,
        'query': query,
    }
    plottype = query.get('type')

    if plottype == 'map':
        opts['size'] = '11x9'
        img = map_plot(url, climate_url, **opts)
        response = Response(img, status=200, mimetype='image/png')
    elif plottype == 'transect':
        opts['size'] = '11x5'
        img = transect_plot(url, climate_url, **opts)
        response = Response(img, status=200, mimetype='image/png')
    elif plottype == 'timeseries':
        opts['size'] = '11x5'
        img = ts_plot(url, climate_url, **opts)
        response = Response(img, status=200, mimetype='image/png')
    else:
        response = FAILURE

    if 'save' in request.args:
        response.headers[
            'Content-Disposition'] = 'attachment; filename="plot.png"'
    return response
