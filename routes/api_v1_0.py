import base64
import datetime
import gc
import gzip
import json
import pickle
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path
from io import BytesIO

import geojson
import numpy as np
import pandas as pd
from dateutil.parser import parse as dateparse
from flask import (
    Blueprint,
    Response,
    abort,
    current_app,
    jsonify,
    request,
    send_file,
    send_from_directory,
)
from flask_babel import gettext
from marshmallow.exceptions import ValidationError
from PIL import Image
from shapely.geometry import LinearRing, Point, Polygon

import data.class4 as class4
import data.observational.queries as ob_queries
import plotting.colormap
import plotting.scale
import plotting.tile
import utils.misc
from data import open_dataset
from data.observational import DataType, Platform, Sample, Station
from data.observational import db as DB
from data.sqlite_database import SQLiteDatabase
from data.transformers.geojson import data_array_to_geojson
from data.utils import (
    DateTimeEncoder,
    get_data_vars_from_equation,
    time_index_to_datetime,
)
from oceannavigator import DatasetConfig
from plotting.class4 import Class4Plotter
from plotting.hovmoller import HovmollerPlotter
from plotting.map import MapPlotter
from plotting.observation import ObservationPlotter
from plotting.profile import ProfilePlotter
from plotting.scriptGenerator import generatePython, generateR
from plotting.sound import SoundSpeedPlotter
from plotting.stats import stats as areastats
from plotting.stick import StickPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.track import TrackPlotter
from plotting.transect import TransectPlotter
from plotting.ts import TemperatureSalinityPlotter
from utils.errors import APIError, ClientError, ErrorBase

from .schemas import (
    DepthSchema,
    GenerateScriptSchema,
    GetDataSchema,
    QuantumSchema,
    TimedimensionSchema,
    TimestampsSchema,
)

bp_v1_0 = Blueprint("api_v1_0", __name__)

# ~~~~~~~~~~~~~~~~~~~~~~~
# API INTERFACE V1.0
# ~~~~~~~~~~~~~~~~~~~~~~~

MAX_CACHE = 315360000
FAILURE = ClientError("Bad API usage")


@bp_v1_0.errorhandler(ErrorBase)
def handle_error_v1(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


@bp_v1_0.route("/api/")
def info_v1():
    raise APIError(
        """
        This is the Ocean Navigator API.
        Additional parameters are required to complete a request.
        Help can be found at ...
        """
    )


@bp_v1_0.route("/api/v1.0/")
def info_v1_0():
    raise APIError(
        """
        This is the Ocean Navigator API.
        Additional parameters are required to complete a request.
        Help can be found at ...
        """
    )


@bp_v1_0.route("/api/test-sentry")
def test_sentry():
    # Hit this endpoint to confirm that exception and transaction logging to Sentry are
    # operating correctly; a transaction should appear in the appropriate project at:
    # https://sentry.io/organizations/dfo-ocean-navigator/performance/
    raise APIError("This is the Ocean Navigator API Sentry integration test endpoint.")


@bp_v1_0.route("/api/dump-heap-memory", methods=["GET"])
def dump_heap_memory():

    with tempfile.NamedTemporaryFile() as dump:
        xs = []
        for obj in gc.get_objects():
            i = id(obj)
            size = sys.getsizeof(obj, 0)
            #    referrers = [id(o) for o in gc.get_referrers(obj) if hasattr(o, '__class__')]
            referents = [
                id(o) for o in gc.get_referents(obj) if hasattr(o, "__class__")
            ]
            if hasattr(obj, "__class__"):
                cls = str(obj.__class__)
                xs.append({"id": i, "class": cls, "size": size, "referents": referents})
        pickle.dump(xs, dump)

        return send_file(
            dump.name,
            download_name=f"onav_memory_dump_{datetime.datetime.now()}.pickle",
            as_attachment=True,
            mimetype="application/octet-stream",
        )

@bp_v1_0.route('/api/v1.0/gitinfo')
def git_info():
    """
    Returns the current Git hash of the application.
    """
    git_info = {
        "git_hash" : current_app.git_hash,
        "git_tag" : current_app.git_tag,
    }
    
    return jsonify(git_info)

@bp_v1_0.route("/api/v1.0/generatescript/")
def generateScript():
    """
    API Format: /api/v1.0/generatescript/?query='...'&lang='...'&scriptType='...'

    query(JSON): Will contain the URI encoded JSON query object for the api script
    lang (string) : Language of the requested API script (python/r)
    scriptType (string): Type of requested script (PLOT/CSV)
    **Query must be written in JSON and converted to encodedURI**
    """

    try:
        result = GenerateScriptSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    lang = result["lang"]
    query = result["query"]
    script_type = result["scriptType"]

    if lang == "python":
        b = generatePython(query, script_type)
        resp = send_file(
            b,
            as_attachment=True,
            download_name=f"API_script_{script_type}.py",
            mimetype="application/x-python",
        )

    elif lang == "r":
        b = generateR(query, script_type)
        resp = send_file(
            b,
            as_attachment=True,
            download_name=f"API_script_{script_type}.r",
            mimetype="text/plain",
        )

    return resp


@bp_v1_0.route("/api/v1.0/datasets/")
def datasets_query_v1_0():
    """
    API Format: /api/v1.0/datasets/

    Optional arguments:
    * id: Show only the name and id of the datasets

    Returns:
        List of available datasets w/ some metadata.
    """

    data = []
    if "id" in request.args:
        for key in DatasetConfig.get_datasets():
            config = DatasetConfig(key)
            data.append({"id": key, "value": config.name})
    else:
        for key in DatasetConfig.get_datasets():
            config = DatasetConfig(key)
            data.append(
                {
                    "id": key,
                    "value": config.name,
                    "quantum": config.quantum,
                    "help": config.help,
                    "attribution": config.attribution,
                    "model_class": config.model_class,
                    "group": config.group,
                    "subgroup": config.subgroup,
                    "time_dim_units": config.time_dim_units
                }
            )
    resp = jsonify(data)
    return resp

@bp_v1_0.route("/api/v1.0/timeunit/")
def timedimension_query_v1_0():
    try:
        result = TimedimensionSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    config = DatasetConfig(result["dataset"])

    timedimension = config.time_dim_units

    return jsonify(timedimension)

@bp_v1_0.route("/api/v1.0/quantum/")
def quantum_query_v1_0():
    """
    Returns the quantum of a given dataset.

    API Format: /api/v1.0/quantum/

    Required parameters:
    * dataset: Dataset key (e.g. giops_day) - can be found using /api/v1.0/datasets/

    Returns:
        Dataset quantum string.
    """

    try:
        result = QuantumSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    config = DatasetConfig(result["dataset"])

    quantum = config.quantum

    return jsonify(quantum)


@bp_v1_0.route("/api/v1.0/variables/", methods=["GET"])
def variables_query_v1_0():
    """
    Returns the available variables for a given dataset.

    API Format: /api/v1.0/variables/?dataset='...'&3d_only&vectors_only

    Required Arguments:
    * dataset      : Dataset key - Can be found using /api/v1.0/datasets/

    Optional Arguments:
    * 3d_only      : Boolean; When True, only variables with depth will be returned
    * vectors_only : Boolean; When True, only variables with magnitude will be returned

    **Boolean value: True / False**
    """

    args = request.args

    if "dataset" not in args:
        raise APIError("Please specify a dataset Using ?dataset='...' ")

    dataset = args.get("dataset")
    config = DatasetConfig(dataset)

    data = []

    with open_dataset(config) as ds:
        for v in ds.variables:
            if config.variable[v.key].is_hidden:
                continue

            if ("3d_only" in args) and v.is_surface_only():
                continue

            if ("vectors_only" in args) and v.key not in config.vector_variables:
                continue

            data.append(
                {
                    "id": v.key,
                    "value": config.variable[v].name,
                    "scale": config.variable[v].scale,
                    "interp": config.variable[v].interpolation,
                    "two_dimensional": v.is_surface_only(),
                }
            )

    data = sorted(data, key=lambda k: k["value"])

    return jsonify(data)


@bp_v1_0.route("/api/v1.0/depth/")
def depth_query_v1_0():
    """
    API Format: /api/v1.0/depth/?dataset=''&variable=''

    Required parameters:
    * dataset  : Dataset key - found using /api/v1.0/datasets/
    * variable : Variable key of interest - found using /api/v1.0/variables/?dataset=...

    Returns:
        Array of all depths available for the given variable.
    """

    try:
        result = DepthSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    dataset = result["dataset"]
    variable = result["variable"]

    config = DatasetConfig(dataset)

    data = []
    with open_dataset(config, variable=variable, timestamp=-1) as ds:
        if variable not in ds.variables:
            raise APIError("Variable not found in dataset: " + variable)

        v = ds.variables[variable]

        if v.has_depth():
            if "all" in result.keys():
                if result["all"].lower() in ["true", "yes", "on"]:
                    data.append({"id": "all", "value": gettext("All Depths")})

            for idx, value in enumerate(np.round(ds.depths)):
                data.append({"id": idx, "value": "%d m" % (value)})

            if len(data) > 0:
                data.insert(0, {"id": "bottom", "value": gettext("Bottom")})

    data = [e for i, e in enumerate(data) if data.index(e) == i]

    return jsonify(data)


@bp_v1_0.route("/api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png")
def scale_v1_0(dataset: str, variable: str, scale: str):
    """
    API Format: /api/v1.0/scale/<string:dataset>/<string:variable>/<string:scale>.png

    * dataset  : Dataset to extract data
    * variable : Variable key of interest - found using /api/v1.0/variables/?dataset=...
    * scale    : min/max values for scale image.

    Returns a scale bar
    """

    bytesIOBuff = plotting.tile.scale(
        {
            "dataset": dataset,
            "variable": variable,
            "scale": scale,
        }
    )

    return send_file(bytesIOBuff, mimetype="image/png", max_age=MAX_CACHE)


@bp_v1_0.route(
    "/api/v1.0/range/<string:dataset>/<string:variable>/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:extent>/<string:depth>/<int:time>.json"  # noqa: E501
)
def range_query_v1_0(
    dataset: str,
    variable: str,
    interp: str,
    radius: int,
    neighbours: int,
    projection: str,
    extent: str,
    depth: str,
    time: int,
):
    extent = list(map(float, extent.split(",")))

    minValue, maxValue = plotting.scale.get_scale(
        dataset,
        variable,
        depth,
        time,
        projection,
        extent,
        interp,
        radius * 1000,
        neighbours,
    )
    resp = jsonify(
        {
            "min": minValue,
            "max": maxValue,
        }
    )
    resp.cache_control.max_age = MAX_CACHE
    return resp


@bp_v1_0.route("/api/v1.0/data/", methods=["GET"])
def get_data_v1_0():
    """
    Returns a geojson representation of requested model data.

    API Format: GET /api/v1.0/data?...

    Required params:
    * dataset: dataset key (e.g. giops_day)
    * variable: variable key (e.g. votemper)
    * time: time index (e.g. 0)
    * depth: depth index (e.g. 49)
    * geometry_type: the "shape" of the data being requested
    """

    try:
        result = GetDataSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    cached_file_name = Path(
        current_app.config["CACHE_DIR"]).joinpath(
        "data",
        f"get_data_{result['dataset']}_{result['variable']}_{result['depth']}_{result['time']}_{result['geometry_type']}.geojson", )   # noqa: E501

    if cached_file_name.is_file():
        print(f"Using cached {cached_file_name}")
        return send_file(cached_file_name, "application/json")

    config = DatasetConfig(result["dataset"])

    with open_dataset(
        config, variable=result["variable"], timestamp=result["time"]
    ) as ds:

        lat_var, lon_var = ds.nc_data.latlon_variables

        stride = config.vector_arrow_stride

        lat_slice = slice(0, lat_var.size, stride)
        lon_slice = slice(0, lon_var.size, stride)

        time_index = ds.nc_data.timestamp_to_time_index(result["time"])

        data = ds.nc_data.get_dataset_variable(result["variable"])

        if len(data.shape) == 3:
            data_slice = (time_index, lat_slice, lon_slice)
        else:
            data_slice = (time_index, result["depth"], lat_slice, lon_slice)

        data = data[data_slice]

        bearings = None
        if "mag" in result["variable"]:
            bearings_var = config.variable[result["variable"]].bearing_component or "bearing"   
            with open_dataset(
                config, variable=bearings_var, timestamp=result["time"]
            ) as ds_bearing:
                bearings = ds_bearing.nc_data.get_dataset_variable(bearings_var)[
                    data_slice
                ].squeeze(drop=True)

        d = data_array_to_geojson(
            data.squeeze(drop=True),
            bearings,  # this is a hack
            lat_var[lat_slice],
            lon_var[lon_slice],
        )

        path = Path(cached_file_name).parent
        path.mkdir(parents=True, exist_ok=True)
        with open(cached_file_name, "w", encoding="utf-8") as f:
            geojson.dump(d, f)

        return jsonify(d)


@bp_v1_0.route('/api/v1.0/class4/<string:q>/<string:class4_type>/<string:class4_id>/')
def class4_query_v1_0(class4_type: str, q: str, class4_id: str):

    """
    API Format: /api/v1.0/class4/<string:q>/<string:class4_id>/

    <string:q>         : forecasts / models (Data Request)
    <string:class4_type> : type of the desired class4 - Can be ocean_predict or 
                           riops_obs
    <string:class4_id> : ID of the desired class4 - Can be found using /api/class4/

    Returns a list of class4 datapoints for a given day
    """

    if not class4_id:
        raise APIError("Please Specify an ID ")

    if q == 'forecasts':
        pts = class4.list_class4_forecasts(class4_id, class4_type)
    elif q == 'models':
        pts = class4.list_class4_models(class4_id, class4_type)

    else:
        raise APIError(
            gettext(
                "Please specify either forecasts or models using /models/ or /forecasts/"  # noqa: E501
            )
        )

    resp = jsonify(pts)
    resp.cache_control.max_age = 86400
    return resp


@bp_v1_0.route("/api/v1.0/stats/", methods=["GET", "POST"])
def stats_v1_0():
    """
    API Format: /api/v1.0/stats/?query='...'

    query = {
        dataset  : Dataset to extract data
        variable : variable key (e.g. votemper)
        time     : Time retrieved data was gathered/modeled
        depth    : Water Depth - found using /api/depth/?dataset='...'
        area     : Selected Area
    }
    **Query must be written in JSON and converted to encodedURI**
    **Not all components of query are required
    """

    if request.method == "GET":
        args = request.args
    else:
        args = request.form
    query = json.loads(args.get("query"))

    config = DatasetConfig(query.get("dataset"))
    with open_dataset(config) as dataset:
        date = dataset.convert_to_timestamp(query.get("time"))
        date = {"time": date}
        query.update(date)
        if not query:
            # Invalid API Check
            if "query" not in args:  # Invalid API Check
                raise APIError(
                    "A Query must be specified in the form /stats/?query='...' "
                )
            # Retrieves Query as JSON based on Request Method
            query = json.loads(args.get("query"))

        dataset = query.get("dataset")  # Retrieves dataset from query

        data = areastats(dataset, query)
        return Response(data, status=200, mimetype="application/json")


@bp_v1_0.route("/api/v1.0/subset/", methods=["GET", "POST"])
def subset_query_v1_0():

    args = None
    if request.method == "GET":
        args = request.args
    else:
        args = request.form

    working_dir = None
    subset_filename = None

    if "area" in args.keys():
        # Predefined area selected
        area = args.get("area")
        sp = area.split("/", 1)

        data = utils.misc.list_areas(sp[0], simplify=False)

        b = [x for x in data if x.get("key") == area]
        args = args.to_dict()
        args["polygons"] = b[0]["polygons"]

    config = DatasetConfig(args.get("dataset_name"))
    time_range = args["time"].split(",")
    variables = args["variables"].split(",")
    with open_dataset(
        config,
        variable=variables,
        timestamp=int(time_range[0]),
        endtime=int(time_range[1]),
    ) as dataset:
        working_dir, subset_filename = dataset.nc_data.subset(args)

    return send_from_directory(working_dir, subset_filename, as_attachment=True)


@bp_v1_0.route("/api/v1.0/plot/", methods=["GET", "POST"])
def plot_v1_0():
    """
    API Format: /api/v1.0/plot/?query='...'&format

    query = {
        dataset   : Dataset to extract data
        names     :
        plottitle : Title of Plot (Default if blank)
        showmap   : Include a map of the plots location on the map
        station   : Coordinates of the point/line/area/etc
        time      : Time retrieved data was gathered/modeled
        type      : File / Plot Type (Check Navigator for Possible options)
        variable  : Variable key (e.g. votemper)
    }
    **Query must be written in JSON and converted to encodedURI**
    **Not all components of query are required
    """

    if request.method == "GET":
        args = request.args
    else:
        args = request.form

    if "query" not in args:
        raise APIError("Please provide a query.")

    query = json.loads(args.get("query"))

    fmt = args.get("format")
    if fmt == "json":

        def make_response(data, mime):
            b64 = base64.encodebytes(data).decode()

            return Response(
                json.dumps("data:%s;base64,%s" % (mime, b64)),
                status=200,
                mimetype="application/json",
            )

    else:

        def make_response(data, mime):
            return Response(data, status=200, mimetype=mime)

    dataset = query.get("dataset")
    plottype = query.get("type")

    options = {
        "format": fmt,
        "size": args.get("size", "15x9"),
        "dpi": args.get("dpi", 72),
    }

    # Determine which plotter we need.
    if plottype == "map":
        plotter = MapPlotter(dataset, query, **options)
    elif plottype == "transect":
        plotter = TransectPlotter(dataset, query, **options)
    elif plottype == "timeseries":
        plotter = TimeseriesPlotter(dataset, query, **options)
    elif plottype == "ts":
        plotter = TemperatureSalinityPlotter(dataset, query, **options)
    elif plottype == "sound":
        plotter = SoundSpeedPlotter(dataset, query, **options)
    elif plottype == "profile":
        plotter = ProfilePlotter(dataset, query, **options)
    elif plottype == "hovmoller":
        plotter = HovmollerPlotter(dataset, query, **options)
    elif plottype == "observation":
        plotter = ObservationPlotter(dataset, query, **options)
    elif plottype == "track":
        plotter = TrackPlotter(dataset, query, **options)
    elif plottype == "class4":
        plotter = Class4Plotter(dataset, query, **options)
    elif plottype == "stick":
        plotter = StickPlotter(dataset, query, **options)
    else:
        raise APIError("You Have Not Selected a Plot Type - Please Review your Query")

    if "data" in request.args:
        data = plotter.prepare_plot()
        return data

    img, mime, filename = plotter.run()

    if img:
        response = make_response(img, mime)
    else:
        raise FAILURE

    if "save" in args:
        response.headers["Content-Disposition"] = 'attachment; filename="%s"' % filename

    response.cache_control.max_age = 300

    if "data" in args:
        plotData = {
            "data": str(resp),  # noqa: F821
            "shape": resp.shape,  # noqa: F821
            "mask": str(resp.mask),  # noqa: F821
        }
        plotData = json.dumps(plotData)
        return Response(plotData, status=200, mimetype="application/json")

    return response


@bp_v1_0.route("/api/v1.0/colors/")
def colors_v1_0():
    """
    API Format: /api/v1.0/colors/

    Returns a list of colours for use in colour maps
    """

    args = request.args
    data = [
        {"id": "k", "value": gettext("Black")},
        {"id": "b", "value": gettext("Blue")},
        {"id": "g", "value": gettext("Green")},
        {"id": "r", "value": gettext("Red")},
        {"id": "c", "value": gettext("Cyan")},
        {"id": "m", "value": gettext("Magenta")},
        {"id": "y", "value": gettext("Yellow")},
        {"id": "w", "value": gettext("White")},
    ]
    if args.get("random"):
        data.insert(0, {"id": "rnd", "value": gettext("Randomize")})
    if args.get("none"):
        data.insert(0, {"id": "none", "value": gettext("None")})

    resp = jsonify(data)
    return resp


@bp_v1_0.route("/api/v1.0/colormaps/")
def colormaps_v1_0():
    """
    API Format: /api/v1.0/colormaps/

    Returns a list of colourmaps
    """

    data = sorted(
        [{"id": i, "value": n} for i, n in plotting.colormap.colormap_names.items()],
        key=lambda k: k["value"],
    )
    data.insert(0, {"id": "default", "value": gettext("Default for Variable")})

    resp = jsonify(data)
    return resp


@bp_v1_0.route("/api/v1.0/colormaps.png")
def colormap_image_v1_0():
    """
    API Format: /api/v1.0/colormaps.png

    Returns image of colourmap example configurations
    """

    img = plotting.colormap.plot_colormaps()
    resp = Response(img, status=200, mimetype="image/png")
    resp.cache_control.max_age = 86400
    return resp


@bp_v1_0.route("/api/v1.0/<string:q>/")
def query_v1_0(q: str):
    """
    API Format: /api/v1.0/<string:q>/

    <string:q> : Zone Type Can be (points,lines, areas, or class4)

    Returns predefined  points / lines / areas / class4's
    """

    data = []

    if q == "points":
        data = utils.misc.list_kml_files("point")
    elif q == "lines":
        data = utils.misc.list_kml_files("line")
    elif q == "areas":
        data = utils.misc.list_kml_files("area")
    elif q == "class4":
        data = class4.list_class4_files()
    else:
        raise APIError(
            "Invalid API Query - Please review the API documentation for help."
        )

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp

@bp_v1_0.route("/api/v1.0/<string:q>/<string:q_id>/<string:q_type>.json")
@bp_v1_0.route("/api/v1.0/<string:q>/<string:q_id>.json")
def query_id_v1_0(q: str, q_id: str, q_type: str = None):
    """
    API Format: /api/v1.0/<string:q>/<string:q_id>.json'

    <string:q>    : Type of Data (areas, class4)
    <string:q_id> :
    <string:q_type> : Type of class4 data (optional)

    """
    if q == "areas":
        data = utils.misc.list_areas(q_id)
    elif q == "class4":
        data = class4.list_class4(q_id, q_type)
    else:
        raise APIError(
            "The Specified Parameter is Invalid - Must be one of (areas, class4)"
        )

    resp = jsonify(data)
    resp.cache_control.max_age = 86400
    return resp


@bp_v1_0.route(
    "/api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json"  # noqa: E501
)
def query_file_v1_0(
    q: str, projection: str, resolution: int, extent: str, file_id: str
):
    """
    API Format: /api/v1.0/<string:q>/<string:projection>/<int:resolution>/<string:extent>/<string:file_id>.json

    <string:q>          : Type of data (points, lines, areas, class4 Ocean Predict/RIOPS Assimilated Observations)
    <string:projection> : Current projection of the map (EPSG:3857, EPSG:32661, EPSG:3031)

    <int:resolution>    : Current zoom level of the map
    <string:extent>     : The current bounds of the map view
    <string:file_id>    :

    **All components must be included**
    **Used Primarily by WebPage**
    """

    data = []
    max_age = 86400

    if q == 'points':
        data = utils.misc.points(
            file_id, projection, resolution, extent)
    elif q == 'lines':
        data = utils.misc.lines(
            file_id, projection, resolution, extent)
    elif q == 'areas':
        data = utils.misc.areas(
            file_id, projection, resolution, extent)
    elif q == 'ocean_predict':
        data = class4.class4(
            q, file_id, projection, resolution, extent)
    elif q == 'riops_obs':
        data = class4.class4(
            q, file_id, projection, resolution, extent)            
    else:
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/timestamps/")
def timestamps():
    """
    Returns all timestamps available for a given variable in a dataset.
    This is variable-dependent because datasets can have multiple "quantums",
    as in surface 2D variables may be hourly, while 3D variables may be daily.

    Required Arguments:
    * dataset : Dataset key - Can be found using /api/v1.0/datasets
    * variable : Variable key - Can be found using /api/v1.0/variables/?dataset='...'...

    Returns:
        All timestamp pairs (e.g. [raw_timestamp_integer, iso_8601_date_string])
        for the given dataset and variable.
    """

    try:
        result = TimestampsSchema().load(request.args)
    except ValidationError as e:
        abort(400, str(e))

    dataset = result["dataset"]
    variable = result["variable"]

    config = DatasetConfig(dataset)

    # Handle possible list of URLs for staggered grid velocity field datasets
    url = config.url if not isinstance(config.url, list) else config.url[0]
    if url.endswith(".sqlite3"):
        with SQLiteDatabase(url) as db:
            if variable in config.calculated_variables:
                data_vars = get_data_vars_from_equation(
                    config.calculated_variables[variable]["equation"],
                    [v.key for v in db.get_data_variables()],
                )
                vals = db.get_timestamps(data_vars[0])
            else:
                vals = db.get_timestamps(variable)
    else:
        with open_dataset(config, variable=variable) as ds:
            vals = list(map(int, ds.nc_data.time_variable.values))
    converted_vals = time_index_to_datetime(vals, config.time_dim_units)

    result = []
    for idx, date in enumerate(converted_vals):
        if config.quantum == "month" or config.variable[variable].quantum == "month":
            date = datetime.datetime(date.year, date.month, 15)
        result.append({"id": vals[idx], "value": date})
    result = sorted(result, key=lambda k: k["id"])

    js = json.dumps(result, cls=DateTimeEncoder)

    resp = Response(js, status=200, mimetype="application/json")
    return resp


@bp_v1_0.route(
    "/api/v1.0/tiles/<string:interp>/<int:radius>/<int:neighbours>/<string:projection>/<string:dataset>/<string:variable>/<int:time>/<string:depth>/<string:scale>/<int:zoom>/<int:x>/<int:y>.png"  # noqa: E501
)
def tile_v1_0(
    projection: str,
    interp: str,
    radius: int,
    neighbours: int,
    dataset: str,
    variable: str,
    time: int,
    depth: str,
    scale: str,
    zoom: int,
    x: int,
    y: int,
):
    """
    Produces the map data tiles
    """

    cache_dir = current_app.config["CACHE_DIR"]
    f = Path(cache_dir).joinpath(request.path[1:])

    # Check if the tile/image is cached and send it
    if _is_cache_valid(dataset, f):
        return send_file(f, mimetype="image/png", cache_timeout=MAX_CACHE)
    # Render a new tile/image, then cache and send it

    if depth != "bottom" and depth != "all":
        depth = int(depth)

    img = plotting.tile.plot(
        projection,
        x,
        y,
        zoom,
        {
            "interp": interp,
            "radius": radius * 1000,
            "neighbours": neighbours,
            "dataset": dataset,
            "variable": variable,
            "time": time,
            "depth": depth,
            "scale": scale,
        },
    )

    return _cache_and_send_img(img, f)


@bp_v1_0.route(
    "/api/v1.0/tiles/topo/<string:shaded_relief>/<string:projection>/<int:zoom>/<int:x>/<int:y>.png"  # noqa: E501
)
def topo_v1_0(shaded_relief: str, projection: str, zoom: int, x: int, y: int):
    """
    Generates topographical tiles
    """

    bShaded_relief = shaded_relief == "true"

    shape_file_dir = current_app.config["SHAPE_FILE_DIR"]

    if zoom > 7:
        return send_file(shape_file_dir + "/blank.png")

    cache_dir = current_app.config["CACHE_DIR"]
    f = Path(cache_dir).joinpath(request.path[1:])

    if f.is_file():
        return send_file(f, mimetype="image/png", cache_timeout=MAX_CACHE)

    bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, bShaded_relief)
    return _cache_and_send_img(bytesIOBuff, f)


@bp_v1_0.route(
    "/api/v1.0/tiles/bath/<string:projection>/<int:zoom>/<int:x>/<int:y>.png"
)
def bathymetry_v1_0(projection: str, zoom: int, x: int, y: int):
    """
    Generates bathymetry tiles
    """

    shape_file_dir = current_app.config["SHAPE_FILE_DIR"]

    if zoom > 7:
        return send_file(shape_file_dir + "/blank.png")

    cache_dir = current_app.config["CACHE_DIR"]
    f = Path(cache_dir).joinpath(request.path[1:])

    if f.is_file():
        return send_file(f, mimetype="image/png", cache_timeout=MAX_CACHE)

    img = plotting.tile.bathymetry(projection, x, y, zoom, {})
    return _cache_and_send_img(img, f)


@bp_v1_0.route(
    "/api/v1.0/mbt/<string:projection>/<string:tiletype>/<int:zoom>/<int:x>/<int:y>"
)
def mbt(projection: str, tiletype: str, zoom: int, x: int, y: int):
    """
    Serves mbt files
    """
    cache_dir = current_app.config["CACHE_DIR"]
    shape_file_dir = current_app.config["SHAPE_FILE_DIR"]
    requestf = Path(cache_dir).joinpath(request.path[1:])
    basedir = requestf.parents[0]

    # Send blank tile if conditions aren't met
    if (zoom < 7) or (projection != "EPSG:3857"):
        return send_file(shape_file_dir + "/blank.mbt")

    if (zoom > 11) and (tiletype == "bath"):
        return send_file(shape_file_dir + "/blank.mbt")

    # Send file if cached or select data in SQLite file
    if requestf.is_file():
        return send_file(requestf)

    y = (2**zoom - 1) - y
    connection = sqlite3.connect(shape_file_dir + "/{}.mbtiles".format(tiletype))
    selector = connection.cursor()
    sqlite = f"SELECT tile_data FROM tiles WHERE zoom_level = {zoom} AND tile_column = {x} AND tile_row = {y}"  # noqa: E501
    selector.execute(sqlite)
    tile = selector.fetchone()
    if tile is None:
        return send_file(shape_file_dir + "/blank.mbt")

    # Write tile to cache and send file
    basedir.mkdir(parents=True, exist_ok=True)
    with open(requestf + ".pbf", "wb") as f:
        f.write(tile[0])
    with gzip.open(requestf + ".pbf", "rb") as gzipped:
        with open(requestf, "wb") as tileout:
            shutil.copyfileobj(gzipped, tileout)
    return send_file(requestf)


@bp_v1_0.route("/api/v1.0/observation/datatypes.json")
def observation_datatypes_v1_0():
    """
    API Format: /api/v1.0/observation/datatypes.json

    Returns the list of observational data types

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = [
        {
            "id": dt.key,
            "value": dt.name,
        }
        for dt in ob_queries.get_datatypes(DB.session)
    ]
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/meta_keys/<string:platform_types>.json")
def observation_keys_v1_0(platform_types: str):
    """
    API Format: /api/v1.0/observation/meta_keys/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types

    Gets the set of metadata keys for a list of platform types

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_keys(DB.session, platform_types.split(","))
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route(
    "/api/v1.0/observation/meta_values/<string:platform_types>/<string:key>.json"
)
def observation_values_v1_0(platform_types: str, key: str):
    """
    API Format: /api/v1.0/observation/meta_values/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types
    <string:key> : Metadata key

    Gets the set of metadata values for a list of platform types and key

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_values(DB.session, platform_types.split(","), key)
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/tracktimerange/<string:platform_id>.json")
def observation_tracktime_v1_0(platform_id: str):
    """
    API Format: /api/v1.0/observation/tracktimerange/<string:platform_id>.json

    <string:platform_id> : Platform ID

    Queries the min and max times for the track

    **Used in TrackWindow**
    """
    max_age = 86400
    platform = DB.session.query(Platform).get(platform_id)
    data = (
        DB.session.query(
            DB.func.min(Station.time),
            DB.func.max(Station.time),
        )
        .filter(Station.platform == platform)
        .one()
    )
    resp = jsonify(
        {
            "min": data[0].isoformat(),
            "max": data[1].isoformat(),
        }
    )
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/track/<string:query>.json")
def observation_track_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/track/<string:query>.json

    <string:query> : List of key=value pairs, seperated by ;
        valid query keys are: start_date, end_date, datatype, platform_type,
            meta_key, meta_value, mindepth, maxdepth, area, radius, quantum

    Observational query for tracks

    **Used in ObservationSelector**
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split(";")]}
    data = []
    max_age = 86400
    params = {}

    MAPPING = {
        "start_date": "starttime",
        "end_date": "endtime",
        "platform_type": "platform_types",
        "meta_key": "meta_key",
        "meta_value": "meta_value",
    }
    for k, v in query_dict.items():
        if k not in MAPPING:
            continue

        if k in ["start_date", "end_date"]:
            params[MAPPING[k]] = dateparse(v)
        elif k in ["datatype", "meta_key", "meta_value"]:
            if k == "meta_key" and v == "Any":
                continue
            if k == "meta_value" and query_dict.get("meta_key") == "Any":
                continue

            params[MAPPING[k]] = v
        elif k == "platform_type":
            params[MAPPING[k]] = v.split(",")
        else:
            params[MAPPING[k]] = float(v)

    if "area" in query_dict:
        area = json.loads(query_dict.get("area"))
        if len(area) > 1:
            lats = [c[0] for c in area]
            lons = [c[1] for c in area]
            params["minlat"] = min(lats)
            params["minlon"] = min(lons)
            params["maxlat"] = max(lats)
            params["maxlon"] = max(lons)
        else:
            params["latitude"] = area[0][0]
            params["longitude"] = area[0][1]
            params["radius"] = float(query_dict.get("radius", 10))

        platforms = ob_queries.get_platforms(DB.session, **params)
        for param in [
            "minlat",
            "maxlat",
            "minlon",
            "maxlon",
            "latitude",
            "longitude",
            "radius",
        ]:
            if param in params:
                del params[param]

        params["platforms"] = platforms

    coordinates = ob_queries.get_platform_tracks(
        DB.session, query_dict.get("quantum", "day"), **params
    )

    if len(coordinates) > 1:
        df = pd.DataFrame(np.array(coordinates), columns=["id", "type", "lon", "lat"])
        df["id"] = df.id.astype(int)
        df["lon"] = (df["lon"] + 360) % 360

        vc = df.id.value_counts()
        for p_id in vc.where(vc > 1).dropna().index:
            d = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": df[["lon", "lat"]][df.id == p_id].values.tolist(),
                },
                "properties": {
                    "id": int(p_id),
                    "type": df.type[df.id == p_id].values[0].name,
                    "class": "observation",
                },
            }
            data.append(d)

    result = {
        "type": "FeatureCollection",
        "features": data,
    }
    resp = jsonify(result)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/point/<string:query>.json")
def observation_point_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/point/<string:query>.json

    <string:query> : List of key=value pairs, seperated by ;
        valid query keys are: start_date, end_date, datatype, platform_type,
            meta_key, meta_value, mindepth, maxdepth, area, radius

    Observational query for points

    **Used in ObservationSelector**
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split(";")]}
    data = []
    max_age = 86400
    params = {}
    MAPPING = {
        "start_date": "starttime",
        "end_date": "endtime",
        "datatype": "variable",
        "platform_type": "platform_types",
        "meta_key": "meta_key",
        "meta_value": "meta_value",
        "mindepth": "mindepth",
        "maxdepth": "maxdepth",
    }
    for k, v in query_dict.items():
        if k not in MAPPING:
            continue

        if k in ["start_date", "end_date"]:
            params[MAPPING[k]] = dateparse(v)
        elif k in ["datatype", "meta_key", "meta_value"]:
            if k == "meta_key" and v == "Any":
                continue
            if k == "meta_value" and query_dict.get("meta_key") == "Any":
                continue

            params[MAPPING[k]] = v
        elif k == "platform_type":
            params[MAPPING[k]] = v.split(",")
        else:
            params[MAPPING[k]] = float(v)

    checkpoly = False
    with_radius = False
    if "area" in query_dict:
        area = json.loads(query_dict.get("area"))
        if len(area) > 1:
            lats = [c[0] for c in area]
            lons = [c[1] for c in area]
            params["minlat"] = min(lats)
            params["minlon"] = min(lons)
            params["maxlat"] = max(lats)
            params["maxlon"] = max(lons)
            poly = Polygon(LinearRing(area))
            checkpoly = True
        else:
            params["latitude"] = area[0][0]
            params["longitude"] = area[0][1]
            params["radius"] = float(query_dict.get("radius", 10))
            with_radius = True

    if with_radius:
        stations = ob_queries.get_stations_radius(session=DB.session, **params)
    else:
        stations = ob_queries.get_stations(session=DB.session, **params)

    if len(stations) > 500:
        stations = stations[:: round(len(stations) / 500)]

    for s in stations:
        if checkpoly and not poly.contains(Point(s.latitude, s.longitude)):
            continue

        d = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
            "properties": {
                "type": s.platform.type.name,
                "id": s.id,
                "class": "observation",
            },
        }
        if s.name:
            d["properties"]["name"] = s.name

        data.append(d)

    result = {
        "type": "FeatureCollection",
        "features": data,
    }
    resp = jsonify(result)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/meta.json")
def observation_meta_v1_0():
    """
    API Format: /api/v1.0/observation/meta.json

    Observational query for all the metadata for a platform or station

    **Used in Map for the observational tooltip**
    """
    key = request.args.get("type", "platform")
    identifier = request.args.get("id", "0")
    max_age = 86400
    data = {}
    if key == "station":
        station = DB.session.query(Station).get(identifier)
        data["Time"] = station.time.isoformat(" ")
        if station.name:
            data["Station Name"] = station.name

        platform = station.platform

    elif key == "platform":
        platform = DB.session.query(Platform).get(identifier)
    else:
        raise FAILURE

    data.update(platform.attrs)
    data["Platform Type"] = platform.type.name
    data = {k: data[k] for k in sorted(data)}
    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.route("/api/v1.0/observation/variables/<string:query>.json")
def observation_variables_v1_0(query: str):
    """
    API Format: /api/v1.0/observation/variables/<string:query>.json

    <string:query> : A key=value pair, where key is either station or platform
    and value is the id

    Observational query for variables for a platform or station

    **Used in PointWindow for the observational variable selection**
    """
    key, identifier = query.split("=")
    data = []
    max_age = 86400
    if key == "station":
        station = DB.session.query(Station).get(identifier)
    elif key == "platform":
        platform = DB.session.query(Platform).get(identifier)
        station = DB.session.query(Station).filter(Station.platform == platform).first()
    else:
        raise FAILURE

    datatype_keys = [
        k[0]
        for k in DB.session.query(DB.func.distinct(Sample.datatype_key))
        .filter(Sample.station == station)
        .all()
    ]

    datatypes = (
        DB.session.query(DataType)
        .filter(DataType.key.in_(datatype_keys))
        .order_by(DataType.key)
        .all()
    )

    data = [
        {
            "id": idx,
            "value": dt.name,
        }
        for idx, dt in enumerate(datatypes)
    ]

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp


@bp_v1_0.after_request
def after_request(response):
    # https://flask.palletsprojects.com/en/1.1.x/security/

    header = response.headers
    # Relying on iptables to keep this safe
    header["Access-Control-Allow-Origin"] = "*"
    header["X-ONav-Git-Hash"] = current_app.git_hash
    header["X-ONav-Git-Tag"] = current_app.git_tag
    header["X-XSS-Protection"] = "1; mode=block"
    header["X-Frame-Options"] = "SAMEORIGIN"

    return response


def _is_cache_valid(dataset: str, f: Path) -> bool:
    """
    Returns True if dataset cache is valid
    """

    config = DatasetConfig(dataset)
    if f.is_file():
        cache_time = config.cache
        if cache_time is not None:
            modtime = datetime.datetime.fromtimestamp(f.stat().st_mtime)
            age_hours = (datetime.datetime.now() - modtime).total_seconds() / 3600
            if age_hours > cache_time:
                f.unlink()
                return False
            return True
        else:
            return True
    else:
        return False


def _cache_and_send_img(bytesIOBuff: BytesIO, f: str):
    """
    Caches a rendered image buffer on disk and sends it to the browser

    bytesIOBuff: BytesIO object containing image data
    f: filename of image to be cached
    """
    p = Path(f).parent
    p.mkdir(parents=True, exist_ok=True)

    # This seems excessive
    bytesIOBuff.seek(0)
    dataIO = BytesIO(bytesIOBuff.read())
    im = Image.open(dataIO)
    im.save(f, format="PNG", optimize=True)  # For cache

    bytesIOBuff.seek(0)
    return send_file(bytesIOBuff, mimetype="image/png", cache_timeout=MAX_CACHE)
