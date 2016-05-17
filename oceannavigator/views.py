#!env python

from flask import Response, request
import json
from netCDF4 import Dataset, netcdftime
import datetime

from oceannavigator import app
from plotting.transect import plot as transect_plot
from plotting.map import plot as map_plot


@app.route('/')
def index():
    return "Hello?"


@app.route('/variables/')
def vars_query():
    if 'file' in request.args:
        filename = request.args['file']
    else:
        filename = 'monthly/aggregated.ncml'

    ds = Dataset(app.config['THREDDS_SERVER'] + 'dodsC/' + filename, 'r')
    data = []
    for k, v in ds.variables.iteritems():
        print v
        data.append({"name": k, 'long_name': v.long_name})

    js = json.dumps(data)
    ds.close()
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/timestamps/')
def time_query():
    if 'file' in request.args:
        filename = request.args['file']
    else:
        filename = 'monthly/aggregated.ncml'

    ds = Dataset(app.config['THREDDS_SERVER'] + 'dodsC/' + filename, 'r')
    data = []
    t = netcdftime.utime(ds.variables['time_counter'].units)
    data = t.num2date(ds.variables['time_counter'][:])

    class DateTimeEncoder(json.JSONEncoder):

        def default(self, o):
            if isinstance(o, datetime.datetime):
                return o.isoformat()

            return json.JSONEncoder.default(self, o)
    js = json.dumps(data.tolist(), cls=DateTimeEncoder)
    ds.close()
    resp = Response(js, status=200, mimetype='application/json')
    return resp


@app.route('/plot/transect/')
def plot_transect():
    if 'file' in request.args:
        filename = request.args['file']
    else:
        filename = 'monthly/aggregated.ncml'
    if filename[0] != '/':
        url = app.config['THREDDS_SERVER'] + 'dodsC/' + filename
    else:
        url = filename
    # burl = app.config['THREDDS_SERVER'] + \
        # 'dodsC/' + 'baselayers/ETOPO1_Bed_g_gmt4.grd'
    burl = "/opt/tds-live/content/thredds/public/misc/ETOPO1_Bed_g_gmt4.grd"

    opts = {
        'size': '11x5',
        'dpi': 72,
    }
    opts.update({k: v.encode('ascii', 'ignore') for k, v in
                 request.args.iteritems()})

    img = transect_plot(url, burl, **opts)
    return Response(img, status=200, mimetype='image/png')


@app.route('/plot/map/')
def plot_map():
    if 'file' in request.args:
        filename = request.args['file']
    else:
        filename = 'monthly/aggregated.ncml'
    if filename[0] != '/':
        url = app.config['THREDDS_SERVER'] + 'dodsC/' + filename
    else:
        url = filename

    if "bottom" in filename:
        climate_url = app.config['THREDDS_SERVER'] + \
            'dodsC/' + 'Levitus98_PHC21/bottom.ncml'
    else:
        climate_url = app.config['THREDDS_SERVER'] + \
            'dodsC/' + 'Levitus98_PHC21/aggregated.ncml'

    opts = {
        'size': '11x9',
        'dpi': 72,
    }
    opts.update({k: v.encode('ascii', 'ignore') for k, v in
                 request.args.iteritems()})

    img = map_plot(url, climate_url, **opts)
    return Response(img, status=200, mimetype='image/png')
