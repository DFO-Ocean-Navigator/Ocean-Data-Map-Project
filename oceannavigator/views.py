#!env python
# vim: set fileencoding=utf-8 :

from flask import Response, request, redirect, send_file, send_from_directory, jsonify
from flask_babel import gettext, format_date
import json
import datetime
from io import BytesIO
from PIL import Image

from oceannavigator import app
from oceannavigator.dataset_config import (
    get_variable_name, get_datasets,
    get_dataset_url, get_dataset_climatology, get_variable_scale,
    is_variable_hidden, get_dataset_cache, get_dataset_help,
    get_dataset_name, get_dataset_quantum, get_dataset_attribution
)
from oceannavigator.errors import ErrorBase, ClientError
import oceannavigator.misc

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

MAX_CACHE = 315360000
FAILURE = ClientError("Bad API usage")

@app.errorhandler(ErrorBase)
def handle_error(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

@app.route('/api/v0.1/range/<string:interp>/<int:radius>/<int:neighbours>/<string:dataset>/<string:projection>/<string:extent>/<string:depth>/<int:time>/<string:variable>.json')
def range_query_v0_1(interp, radius, neighbours, dataset, projection, extent, variable, depth, time):
    extent = list(map(float, extent.split(",")))
    
    min, max = plotting.scale.get_scale(
        dataset, variable, depth, time, projection, extent, interp, radius*1000, neighbours)
    resp = jsonify({
        'min': min,
        'max': max,
    })
    resp.cache_control.max_age = MAX_CACHE
    return resp

@app.route('/api/<string:q>/')
def query(q):

    data = []
    
    if q == 'points':
        data = oceannavigator.misc.list_kml_files('point')
    elif q == 'lines':
        data = oceannavigator.misc.list_kml_files('line')
    elif q == 'areas':
        data = oceannavigator.misc.list_kml_files('area')
    elif q == 'class4':
        data = oceannavigator.misc.list_class4_files()
    else:
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
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
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


@app.route('/api/data/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:location>.json')
def get_data(dataset, variable, time, depth, location):
    data = oceannavigator.misc.get_point_data(
        dataset, variable, time, depth,
        list(map(float, location.split(",")))
    )
    
    resp = jsonify(data)
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
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@app.route('/api/datasets/')
def query_datasets():
    data = []

    for key in get_datasets():
        data.append({
            'id': key,
            'value': get_dataset_name(key),
            'quantum': get_dataset_quantum(key),
            'help': get_dataset_help(key),
            'attribution': get_dataset_attribution(key),
        })

    data = sorted(data, key=lambda k: k['value'])
    resp = jsonify(data)
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
    
    resp = jsonify(data)
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

    resp = jsonify(data)
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
        raise FAILURE

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

    resp = jsonify(data)
    return resp


@app.route('/api/observationvariables/')
def obs_vars_query():
    data = []
    for idx, v in enumerate(oceannavigator.misc.observation_vars()):
        data.append({'id': idx, 'value': v})

    resp = jsonify(data)
    return resp


@app.route('/api/variables/')
def vars_query():
    
    data = []       #Initializes empty data array


    if 'dataset' in request.args:
        
        dataset = request.args['dataset']

        #Queries config files
        if get_dataset_climatology(dataset) != "" and 'anom' in request.args:   #If a url exists for the dataset and an anomaly
            with open_dataset(get_dataset_climatology(dataset)) as ds:
                climatology_variables = list(map(str, ds.variables))
        else:
            climatology_variables = []

        three_d = '3d_only' in request.args     #Checks if 3d_only is in request.args
        #If three_d is true - Only 3d variables will be returned

        with open_dataset(get_dataset_url(dataset)) as ds:
            if 'vectors_only' not in request.args:      #Will send more than just vectors

                # 'v' is a Variable in the Dataset
                #  v Contains:  dimensions, key, name, unit, valid_min, valid_max
                for v in ds.variables:  #Iterates through all the variables in the dataset

                    #If a time period and at least one other unit type is specified
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

            #If Vectors are needed
            if 'vectors' in request.args or 'vectors_only' in request.args:
                rxp = r"(?i)( x | y |zonal |meridional |northward |eastward)"

                for key, value in list(VECTOR_MAP.items()):
                    if key in ds.variables:
                        n = get_variable_name(dataset, ds.variables[key])       #Returns a normal variable type

                        data.append({
                            'id': value,
                            'value': re.sub(r" +", " ", re.sub(rxp, " ", n)),
                            'scale': [0, get_variable_scale(
                                dataset,
                                ds.variables[key]
                            )[1]]
                        })

         
    data = sorted(data, key=lambda k: k['value'])      #Sorts data alphabetically using the value
    #Data is set of scale, id, value objects

    resp = jsonify(data)

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
        res = idx.max().item() # https://stackoverflow.com/a/11389998/2231969

    return Response(json.dumps(res), status=200, mimetype='application/json')


@app.route('/scale/<string:dataset>/<string:variable>/<string:scale>.png')
def scale(dataset, variable, scale):
    bytesIOBuff = plotting.tile.scale({
        'dataset': dataset,
        'variable': variable,
        'scale': scale,
    })
    
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)

"""
    Caches a rendered image buffer on disk and sends it to the browser

    bytesIOBuff: BytesIO object containing image data
    f: filename of image to be cached
"""
def _cache_and_send_img(bytesIOBuff: BytesIO, f: str):
    p = os.path.dirname(f)
    if not os.path.isdir(p):
        os.makedirs(p)

    # This seems excessive
    bytesIOBuff.seek(0)
    dataIO = BytesIO(bytesIOBuff.read())
    im = Image.open(dataIO)
    im.save(f, format='PNG', optimize=True) # For cache

    bytesIOBuff.seek(0)
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)

# Renders the map images and sends it to the browser
@app.route('/tiles/v0.1/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png')
def tile_v0_1(projection, interp, radius, neighbours, dataset, variable, time, depth, scale, zoom, x, y):
    cache_dir = app.config['CACHE_DIR']
    f = os.path.join(cache_dir, request.path[1:])
    
    # Check if the tile/image is cached and send it
    if _is_cache_valid(dataset, f):
        return send_file(f, mimetype='image/png', cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it
    else:
        if depth != "bottom" and depth != "all":
            depth = int(depth)

        img = plotting.tile.plot(projection, x, y, zoom, {
            'interp': interp,
            'radius': radius*1000,
            'neighbours': neighbours,
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
        bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, {})
        
        return _cache_and_send_img(bytesIOBuff, f)


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
        raise FAILURE

    resp = jsonify(pts)
    resp.cache_control.max_age = 3600
    return resp


@app.route('/api/class4/<string:q>/<string:class4_id>/<int:index>')
def class4_query(q, class4_id, index):
    if q == 'forecasts':
        pts = oceannavigator.misc.list_class4_forecasts(class4_id)
    elif q == 'models':
        pts = oceannavigator.misc.list_class4_models(class4_id)
    else:
        raise FAILURE

    resp = jsonify(pts)
    resp.cache_control.max_age = 86400
    return resp

@app.route('/subset/')
def subset_query():

    working_dir = None
    subset_filename = None
    with open_dataset(get_dataset_url(request.args.get('dataset_name'))) as dataset:
        working_dir, subset_filename = dataset.subset(request.args)
        """
        # Export to NetCDF
        if output_format == "NETCDF3_NC":
            # "Special" netcdf export (┛ಠ_ಠ)┛彡┻━┻

            # This part only ever runs on giops files so no need to worry about variable
            # names changing
            subset.to_netcdf(working_dir + filename + ".nc", format="NETCDF3_CLASSIC")

            # Open the GIOPS NCOM file
            giops_file = netCDF4.Dataset(working_dir + filename + ".nc")
            giops_variables = giops_file.variables
                
            # Create converted ncdf file
            ds = netCDF4.Dataset(working_dir + filename + "_converted.nc", 'w', format="NETCDF3_CLASSIC")
            ds.description = "Converted GIOPS " + filename
            ds.history = "Created: " + str(datetime.datetime.now())
            ds.source = "www.navigator.oceansdata.ca | GIOPS source: dd.weather.gc.ca"

            # Find correct variable names in subset
            lat_var = find_variable('lat')
            lon_var = find_variable('lon')
            time_var = find_variable('time')
            depth_var = find_variable('depth')

            # Create the netcdf dimensions
            ds.createDimension('lat', len(giops_variables[lat_var][:]))
            ds.createDimension('lon', len(giops_variables[lon_var][:]))
            ds.createDimension('time', len(giops_variables[time_var][:]))
            ds.CreateDimension('depth', len(giops_variables[depth_var][:]))

            # Create the netcdf variables and assign the values
            latitudes = ds.createVariable('lat', 'f', ('lat',))
            longitudes = ds.createVariable('lon', 'f', ('lon',))
            latitudes = giops_variables[lat_var][:]
            longitudes = giops_variables[lon_var][:]

            times = ds.createVariable('time', 'i', ('time',))
            # Convert time from seconds to hours
            for i in range(0, len(giops_variables[time_var])):
                times[i] = giops_variables[time_var][i] / 3600

            # Variable Attributes, mimicking HYCOM headers
            latitudes.long_name = "Latitude"
            latitudes.units = "degrees_north"
            latitudes.NAVO_code = 1
            longitudes.long_name = "Longitude"
            longitudes.units = "degrees_east"
            longitudes.NAVO_code = 2
            times.long_name = "Validity time"
            times.units = "hours since 1950-01-01 00:00:00"
            times.time_origin = "1950-01-01 00:00:00"

            levels = ds.createVariable('depth', 'i', ('depth',))
            levels = giops_variables[depth_var][:]
            levels.long_name = "Depth"
            levels.units = "meter"
            levels.positive = "down"
            levels.NAVO_code = 5

            for variable in giops_variables:
                if variable == "vosaline":
                    salinity = ds.createVariable('salinity', 'f', ('time', 'depth', 'lat', 'lon', ), fill_value=-30000.0)
                    salinity = giops_variables['vosaline'][:]
                    salinity.long_name = "Salinity"
                    salinity.units = "psu"
                    salinity.valid_min = 0.0
                    salinity.valid_max = 45.0
                    salinity.NAVO_code = 16

                if variable == "votemper":
                    temp = ds.createVariable('water_temp', 'f', ('time', 'depth', 'lat', 'lon', ), fill_value=-30000.0)
                    # Convert from Kelvin to Celcius
                    for i in range(0, len(giops_variables['depth'][:])):
                        temp[:,i, :, :] = giops_variables['votemper'][:,i,:,:] - 273.15
                    temp.valid_min = -100.0
                    temp.valid_max = 100.0
                    temp.NAVO_code = 15

                if variable == "sossheig":
                    height = ds.createVariable('surf_el', float, ('time', 'lat', 'lon'), fill_value=-30000.0)
                    height = giops_variables['sossheig'][:]
                    heights.long_name="Water Surface Elevation"
                    heights.units="meter"
                    heights.NAVO_code=32
                
                if variable == "vozocrtx":
                    x_velo = ds.createVariable('water_u', float, ('time', 'depth', 'lat', 'lon'), fill_value=-30000.0)
                    x_velo = giops_variables['vozocrtx'][:]
                    x_velo.long_name = "Eastward Water Velocity"
                    x_velo.units = "meter/sec"
                    x_velo.NAVO_code = 17

                if variable == "vomecrty":
                    y_velo = ds.createVariable('water_v', float, ('time','depth','lat','lon'), fill_value=-30000.0)
                    y_velo = giops_variables['vomecrty'][:]
                    y_velo.long_name = "Northward Water Velocity"
                    y_velo.units = "meter/sec"
                    y_velo.NAVO_code = 18

            ds.close()
            giops_file.close()

            # (┛ಠ_ಠ)┛彡┻━┻
            return send_from_directory(working_dir, '%s_converted.nc' % filename, as_attachment=True)
        """
            
    return send_from_directory(working_dir, subset_filename, as_attachment=True)

@app.route('/plot/', methods=['GET', 'POST'])
def plot():
    if request.method == "GET":
        if 'query' not in request.args:
            raise FAILURE

        query = json.loads(request.args.get('query'))
    else:
        if 'query' not in request.form:
            raise FAILURE

        query = json.loads(request.form.get('query'))

    if ("format" in request.args and request.args.get("format") == "json") or \
       ("format" in request.form and request.form.get("format") == "json"):

        # Generates a Base64 encoded string
        def make_response(data, mime):
            b64 = base64.encodebytes(data).decode()

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
        raise FAILURE

    # Get the data from the selected plotter.
    img, mime, filename = plotter.run(size=size, dpi=request.args.get('dpi'))
    
    if img != "":
        response = make_response(img, mime)
    else:
        raise FAILURE

    if 'save' in request.args:
        response.headers[
            'Content-Disposition'] = "attachment; filename=\"%s\"" % filename

    response.cache_control.max_age = 300

    return response


@app.route('/stats/', methods=['GET', 'POST'])
def stats():
    if request.method == "GET":
        if 'query' not in request.args:
            raise FAILURE

        query = json.loads(request.args.get('query'))
    else:
        if 'query' not in request.form:
            raise FAILURE

        query = json.loads(request.form.get('query'))

    dataset = query.get('dataset')

    data = areastats(dataset, query)
    return Response(data, status=200, mimetype='application/json')


def _is_cache_valid(dataset: str, f: str) -> bool:
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
