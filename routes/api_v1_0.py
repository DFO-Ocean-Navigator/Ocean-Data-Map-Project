import datetime
import json
import os
from io import BytesIO

import geojson
import numpy as np
import pandas as pd
from dateutil.parser import parse as dateparse
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
from shapely.geometry import LinearRing, Point, Polygon
from sqlalchemy import func
from sqlalchemy.orm import Session

import data.observational.queries as ob_queries
import plotting.colormap
import routes.enums as e
import utils.misc
from data import open_dataset
from data.observational import SessionLocal, DataType, Platform, Sample, Station
from data.sqlite_database import SQLiteDatabase
from data.transformers.geojson import data_array_to_geojson
from data.utils import get_data_vars_from_equation, time_index_to_datetime
from oceannavigator.dataset_config import DatasetConfig
from oceannavigator.log import log
from oceannavigator.settings import get_settings
from plotting.colormap import plot_colormaps
from plotting.scale import get_scale
from plotting.scriptGenerator import generatePython, generateR
from plotting.tile import bathymetry as plot_bathymetry
from plotting.tile import scale as plot_scale
from utils.errors import ClientError

"""
import base64
import gzip
import json
import shutil
import sqlite3

import pandas as pd
from dateutil.parser import parse as dateparse
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
from oceannavigator.dataset_config import get_dataset_config
from plotting.class4 import Class4Plotter
from plotting.hovmoller import HovmollerPlotter
from plotting.map import MapPlotter
from plotting.observation import ObservationPlotter
from plotting.profile import ProfilePlotter
from plotting.sound import SoundSpeedPlotter
from plotting.stats import stats as areastats
from plotting.stick import StickPlotter
from plotting.timeseries import TimeseriesPlotter
from plotting.track import TrackPlotter
from plotting.transect import TransectPlotter
from plotting.ts import TemperatureSalinityPlotter
from utils.errors import APIError, ClientError, ErrorBase
"""

FAILURE = ClientError("Bad API usage")


def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


router = APIRouter(
    prefix="/api/v1.0",
    responses={404: {"message": "Not found"}},
)

MAX_CACHE = 315360000


@router.get("/git_info")
async def git_info():
    """
    Returns the current Git hash of the application.
    """

    settings = get_settings()

    git_info = {
        "git_hash": settings.git_hash,
        "git_tag": settings.git_tag,
    }

    return git_info


@router.get("/generate_script")
async def generate_script(
    query: str = Query(..., description="string-ified JSON"),
    lang: e.ScriptLang = Query(..., description="Language of the requested API script"),
    script_type: e.ScriptType = Query(..., description="Type of requested script"),
):
    if lang == e.ScriptLang.python:
        b = generatePython(query, script_type)
        media_type = "application/x-python"
        filename = f"ocean_navigator_api_script_{script_type}.py"

    elif lang == e.ScriptLang.r:
        b = generateR(query, script_type)
        media_type = "text/plain"
        filename = f"ocean_navigator_api_script_{script_type}.r"

    return StreamingResponse(
        b,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=#{filename}"},
    )


@router.get("/datasets")
async def datasets():
    """
    List of available datasets w/ some metadata.
    """

    data = []
    for key in DatasetConfig.get_datasets():
        config = DatasetConfig(key)
        data.append(
            {
                "id": key,
                "value": config.name,
                "quantum": config.quantum,
                "help": config.help,
                "attribution": config.attribution,
            }
        )
    data = sorted(data, key=lambda k: k["value"])
    return data


@router.get("/dataset/{dataset}")
async def dataset(
    dataset: str = Path(
        None,
        title="The key of the dataset.",
        example="giops_day",
    )
):
    config = DatasetConfig(dataset)

    return {
        "id": dataset,
        "value": config.name,
        "quantum": config.quantum,
        "help": config.help,
        "attribution": config.attribution,
    }


@router.get("/dataset/{dataset}/quantum")
async def quantum(
    dataset: str = Path(
        ...,
        title="The key of the dataset.",
        example="giops_day",
    )
):
    """
    Returns the time scale (i.e. quantum) for a dataset.
    """

    config = DatasetConfig(dataset)

    return {"value": config.quantum}


@router.get("/dataset/{dataset}/variables")
async def variables(
    dataset: str = Path(
        ...,
        title="The key of the dataset.",
        example="giops_day",
    ),
    has_depth_only: bool = Query(
        False, description="When True, only variables with depth will be returned"
    ),
    vectors_only: bool = Query(
        False, description="When True, only variables with magnitude will be returned"
    ),
):
    """
    Returns the available variables for a given dataset.
    """

    config = DatasetConfig(dataset)

    data = []
    with open_dataset(config) as ds:
        for v in ds.variables:
            if config.variable[v.key].is_hidden:
                continue

            if (has_depth_only) and v.is_surface_only():
                continue

            if (vectors_only) and v.key not in config.vector_variables:
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

    return data


@router.get("/dataset/{dataset}/{variable}/depths")
async def depths(
    dataset: str = Path(
        ...,
        title="The key of the dataset.",
        example="giops_day",
    ),
    variable: str = Path(
        ...,
        title="The key of the variable.",
        example="votemper",
    ),
    include_all_key: bool = Query(True),
):
    """
    Returns array of all depths available for the given variable.
    """

    config = DatasetConfig(dataset)

    data = []
    with open_dataset(config, variable=variable, timestamp=-1) as ds:
        if variable not in ds.variables:
            raise HTTPException(
                status_code=404, detail=f"{variable} not found in dataset {dataset}"
            )

        v = ds.variables[variable]

        if v.has_depth():
            if include_all_key:
                data.append({"id": "all", "value": "All Depths"})

            for idx, value in enumerate(np.round(ds.depths)):
                data.append({"id": idx, "value": "%d m" % (value)})

            if len(data) > 0:
                data.insert(0, {"id": "bottom", "value": "Bottom"})

    data = [e for i, e in enumerate(data) if data.index(e) == i]

    return data


@router.get("/scale")
async def scale(
    dataset: str = Query(
        ..., description="The key of the dataset.", example="giops_day"
    ),
    variable: str = Query(
        ..., description="The key of the variable.", example="votemper"
    ),
    scale: str = Query(
        ..., description="Min/max values for scale image", example="-5,30"
    ),
):
    """
    Returns a scale bar png
    """

    bytes = plot_scale(
        {
            "dataset": dataset,
            "variable": variable,
            "scale": scale,
        }
    )

    filename = f"{dataset}_{variable}_scale_{scale}.png"

    return StreamingResponse(
        bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename=#{filename}"},
    )


@router.get("/range")
async def range(
    dataset: str = Query(
        ..., description="The key of the dataset.", example="giops_day"
    ),
    variable: str = Query(
        ..., description="The key of the variable.", example="votemper"
    ),
    interp: e.InterpolationType = Query("gaussian", description="", example="gaussian"),
    radius: int = Query(
        25, description="Radius in km to search for neighbours", example=25
    ),
    neighbours: int = Query(
        10,
        description="The max number of nearest neighbours to search for.",
        example=10,
    ),
    projection: str = Query(
        "EPSG:3857",
        description="EPSG code of the desired projection.",
        example="EPSG:3857",
    ),
    extent: str = Query(
        ...,
        description="View extent",
        example="-17815466.9445,3631998.6003,6683517.8652,10333997.2404",
    ),
    depth: str = Query(
        ...,
        description="Depth index",
        examples={
            "numerical index": {"value": "1"},
            "bottom index": {"value": "bottom"},
        },
    ),
    time: int = Query(..., description="NetCDF timestamp"),
):
    """
    Returns the min/max values of a variable for a given view extent.
    """
    extent = list(map(float, extent.split(",")))

    min_value, max_value = get_scale(
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

    return {
        "min": min_value,
        "max": max_value,
    }


@router.get("/data")
async def data(
    dataset: str = Query(
        ..., description="The key of the dataset.", example="giops_day"
    ),
    variable: str = Query(
        ..., description="The key of the variable.", example="votemper"
    ),
    time: int = Query(..., description="NetCDF timestamp"),
    depth: int = Query(..., description="Depth index", example=0),
):
    """
    Returns a geojson representation of requested model data.
    """

    settings = get_settings()

    cached_file_name = os.path.join(
        settings.cache_dir,
        "data",
        f"get_data_{dataset}_{variable}_{depth}_{time}.geojson",
    )

    if os.path.isfile(cached_file_name):
        log().info(f"Using cached {cached_file_name}.")
        return FileResponse(cached_file_name, media_type="application/json")

    config = DatasetConfig(dataset)

    with open_dataset(config, variable=variable, timestamp=time) as ds:

        lat_var, lon_var = ds.nc_data.latlon_variables

        stride = config.vector_arrow_stride

        lat_slice = slice(0, lat_var.size, stride)
        lon_slice = slice(0, lon_var.size, stride)

        time_index = ds.nc_data.timestamp_to_time_index(time)

        data = ds.nc_data.get_dataset_variable(variable)

        if len(data.shape) == 3:
            data_slice = (time_index, lat_slice, lon_slice)
        else:
            data_slice = (time_index, depth, lat_slice, lon_slice)

        data = data[data_slice]

        bearings = None
        if "mag" in variable:
            with open_dataset(config, variable="bearing", timestamp=time) as ds_bearing:
                bearings = ds_bearing.nc_data.get_dataset_variable("bearing")[
                    data_slice
                ].squeeze(drop=True)

        d = data_array_to_geojson(
            data.squeeze(drop=True),
            bearings,  # this is a hack
            lat_var[lat_slice],
            lon_var[lon_slice],
        )

        os.makedirs(os.path.dirname(cached_file_name), exist_ok=True)
        with open(cached_file_name, "w", encoding="utf-8") as f:
            geojson.dump(d, f)

        return d


'''
@bp_v1_0.route("/api/v1.0/class4/<string:q>/<string:class4_id>/")
def class4_query_v1_0(q: str, class4_id: str):
    """
    API Format: /api/v1.0/class4/<string:q>/<string:class4_id>/

    <string:q>         : forecasts / models (Data Request)
    <string:class4_id> : ID of the desired class4 - Can be found using /api/class4/

    Returns a list of class4 datapoints for a given day
    """

    if not class4_id:
        raise APIError("Please Specify an ID ")

    if q == "forecasts":
        pts = class4.list_class4_forecasts(class4_id)
    elif q == "models":
        pts = class4.list_class4_models(class4_id)
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
'''


@router.get("/plot/colormaps.json")
async def colormaps_json():
    """
    Returns list of available colormaps
    """

    data = sorted(
        [{"id": i, "value": n} for i, n in plotting.colormap.colormap_names.items()],
        key=lambda k: k["value"],
    )
    data.insert(0, {"id": "default", "value": "Default for Variable"})

    return data


@router.get("/plot/colormaps.png")
async def colormaps_png():
    """
    Returns image of available colourmaps
    """

    img = plot_colormaps()

    return StreamingResponse(
        img,
        media_type="image/png",
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/points")
async def kml_points():
    """
    Returns the KML groups containing of interest from hard-coded KML files
    """
    return utils.misc.list_kml_files("point")


@router.get("/kml/points/{id}")
async def kml_point(
    id: str = Path(..., example="NL-AZMP_Stations"),
    projection: str = Query(
        ...,
        description="EPSG code for desired projection. Used to map resulting KML \
            coords",
        example="EPSG:3857",
    ),
    view_bounds: str = Query(
        None,
        description="Used to exclude KML points that aren't visible. Useful for \
            filtering large KML groups.",
    ),
):
    """
    Returns the GeoJSON representation of the features contained in the KML file id.
    """

    return utils.misc.points(id, projection, view_bounds)


@router.get("/kml/lines")
async def kml_lines():
    """
    Returns the KML groups containing of interest from hard-coded KML files
    """
    return utils.misc.list_kml_files("line")


'''
TODO: IMPLEMENT THIS BASED ON kml_point
@router.get("/kml/lines/{id}")
async def kml_line():
    """
    """
    return {}
'''


@router.get("/kml/areas")
async def kml_areas():
    """
    Returns the KML groups containing of interest from hard-coded KML files
    """
    return utils.misc.list_kml_files("area")


'''
TODO: IMPLEMENT THIS BASED ON kml_point
@router.get("/kml/areas/{id}")
async def kml_area():
    """
    """
    return {}
'''

'''
@bp_v1_0.route("/api/v1.0/<string:q>/<string:q_id>.json")
def query_id_v1_0(q: str, q_id: str):
    """
    API Format: /api/v1.0/<string:q>/<string:q_id>.json'

    <string:q>    : Type of Data (areas, class4)
    <string:q_id> :

    """
    if q == "areas":
        data = utils.misc.list_areas(q_id)
    elif q == "class4":
        data = class4.list_class4(q_id)
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
    <string:q>          : Type of data (points, lines, areas, class4)
    <string:projection> : Current projection of the map (EPSG:3857, EPSG:32661, EPSG:3031)  # noqa: E501
    <int:resolution>    : Current zoom level of the map
    <string:extent>     : The current bounds of the map view
    <string:file_id>    :

    **All components must be included**
    **Used Primarily by WebPage**
    """

    data = []
    max_age = 86400

    if q == "points":
        data = utils.misc.points(file_id, projection, resolution, extent)
    elif q == "lines":
        data = utils.misc.lines(file_id, projection, resolution, extent)
    elif q == "areas":
        data = utils.misc.areas(file_id, projection, resolution, extent)
    elif q == "class4":
        data = class4.class4(file_id, projection, resolution, extent)
    else:
        raise FAILURE

    resp = jsonify(data)
    resp.cache_control.max_age = max_age
    return resp
'''


@router.get("/dataset/{dataset}/{variable}/timestamps")
async def timestamps(
    dataset: str = Path(..., title="The key of the dataset.", example="giops_day"),
    variable: str = Path(..., title="The key of the variable.", example="votemper"),
):
    """
    Returns all timestamps available for a given variable in a dataset.
    This is variable-dependent because datasets can have multiple "quantums",
    as in surface 2D variables may be hourly, while 3D variables may be daily.

    Returns:
        All timestamp pairs (e.g. [netcdf_timestamp_integer, iso_8601_date_string])
        for the given dataset and variable.
    """

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
        result.append({"id": vals[idx], "value": date.isoformat()})

    result = sorted(result, key=lambda k: k["id"])

    return jsonable_encoder(result)


'''
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
    f = os.path.join(cache_dir, request.path[1:])

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
    f = os.path.join(cache_dir, request.path[1:])

    if os.path.isfile(f):
        return send_file(f, mimetype="image/png", cache_timeout=MAX_CACHE)

    bytesIOBuff = plotting.tile.topo(projection, x, y, zoom, bShaded_relief)
    return _cache_and_send_img(bytesIOBuff, f)
'''


@router.get("/tiles/bath/{zoom}/{x}/{y}")
async def bathymetry_v1_0(
    zoom: int = Path(..., example=4),
    x: int = Path(...),
    y: int = Path(...),
    projection: str = Query(
        "EPSG:3857", title="EPSG projection code.", example="EPSG:3857"
    ),
):
    """
    Generates bathymetry tiles
    """

    settings = get_settings()

    if zoom > 7:
        return FileResponse(
            os.path.join(settings.shape_file_dir, "blank.png"),
            media_type="image/png",
            headers={"Cache-Control": f"max-age={MAX_CACHE}"},
        )

    f = os.path.join(
        settings.cache_dir,
        "api",
        "v1.0",
        "tiles",
        "bath",
        projection,
        str(zoom),
        str(x),
        f"{y}.png",
    )

    if os.path.isfile(f):
        return FileResponse(
            f,
            media_type="image/png",
            headers={"Cache-Control": f"max-age={MAX_CACHE}"},
        )

    img = plot_bathymetry(projection, x, y, zoom)
    return _cache_and_send_img(img, f)


'''
@bp_v1_0.route(
    "/api/v1.0/mbt/<string:projection>/<string:tiletype>/<int:zoom>/<int:x>/<int:y>"
)
def mbt(projection: str, tiletype: str, zoom: int, x: int, y: int):
    """
    Serves mbt files
    """
    cache_dir = current_app.config["CACHE_DIR"]
    shape_file_dir = current_app.config["SHAPE_FILE_DIR"]
    requestf = str(os.path.join(cache_dir, request.path[1:]))
    basedir = requestf.rsplit("/", 1)[0]

    # Send blank tile if conditions aren't met
    if (zoom < 7) or (projection != "EPSG:3857"):
        return send_file(shape_file_dir + "/blank.mbt")

    if (zoom > 11) and (tiletype == "bath"):
        return send_file(shape_file_dir + "/blank.mbt")

    # Send file if cached or select data in SQLite file
    if os.path.isfile(requestf):
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
    if not os.path.isdir(basedir):
        os.makedirs(basedir)
    with open(requestf + ".pbf", "wb") as f:
        f.write(tile[0])
    with gzip.open(requestf + ".pbf", "rb") as gzipped:
        with open(requestf, "wb") as tileout:
            shutil.copyfileobj(gzipped, tileout)
    return send_file(requestf)
'''


@router.get("/observation/datatypes")
async def observation_datatypes(db: Session = Depends(get_db)):
    """
    Returns the list of observational data types

    **Used in ObservationSelector**
    """
    #max_age = 86400

    data = [
        {
            "id": dt.key,
            "value": dt.name,
        }
        for dt in ob_queries.get_datatypes(db)
    ]
    # resp = jsonify(data)
    # resp.cache_control.max_age = max_age
    return data


@router.get("/observation/meta_keys/{platform_types}.json")
async def observation_keys(platform_types, db: Session = Depends(get_db)):#platform_types: str = Path(
#         None,
#         title="List of platform types (comma seperated).",
#         example="argo,drifter,animal,mission,glider",
#     )
# ):
    """
    API Format: /api/v1.0/observation/meta_keys/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types

    Gets the set of metadata keys for a list of platform types

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_keys(db, platform_types.split(","))
    # resp = jsonify(data)
    # resp.cache_control.max_age = max_age
    return data


@router.get("/observation/meta_values/{platform_types}/{key}.json")
def observation_values_v1_0(platform_types: str, key: str, db: Session = Depends(get_db)):
    """
    API Format: /api/v1.0/observation/meta_values/<string:platform_types>.json

    <string:platform_types> : Comma seperated list of platform types
    <string:key> : Metadata key

    Gets the set of metadata values for a list of platform types and key

    **Used in ObservationSelector**
    """
    max_age = 86400
    data = ob_queries.get_meta_values(db, platform_types.split(","), key)
    # resp = jsonify(data)
    # resp.cache_control.max_age = max_age
    return data


@router.get("/observation/tracktimerange/{platform_id}.json")
def observation_tracktime_v1_0(platform_id: str, db: Session = Depends(get_db)):
    """
    API Format: /api/v1.0/observation/tracktimerange/<string:platform_id>.json

    <string:platform_id> : Platform ID

    Queries the min and max times for the track

    **Used in TrackWindow**
    """
    max_age = 86400
    platform = db.query(Platform).get(platform_id)
    data = (
        db.query(
            func.min(Station.time),
            func.max(Station.time),
        )
        .filter(Station.platform == platform)
        .one()
    )
    resp = {
            "min": data[0].isoformat(),
            "max": data[1].isoformat(),
        }
    
    #resp.cache_control.max_age = max_age
    return resp


@router.get("/observation/track/{query}.json")
def observation_track_v1_0(query: str, db: Session = Depends(get_db)):
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

        platforms = ob_queries.get_platforms(db, **params)
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
        db, query_dict.get("quantum", "day"), **params
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
    # resp = jsonify(result)
    # resp.cache_control.max_age = max_age
    return result


 
@router.get("/observation/point/{query}.json")
def observation_point_v1_0(query: str, db: Session = Depends(get_db)):
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
        stations = ob_queries.get_stations_radius(session=db, **params)
    else:
        stations = ob_queries.get_stations(session=db, **params)

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
    # resp = jsonify(result)
    # resp.cache_control.max_age = max_age
    return result


@router.get("/observation/meta.json")
def observation_meta_v1_0(request: Request, db: Session = Depends(get_db)):
    """
    API Format: /api/v1.0/observation/meta.json

    Observational query for all the metadata for a platform or station

    **Used in Map for the observational tooltip**
    """
    key = request.query_params.get('type', 'platform')
    identifier = request.query_params.get("id", "0")
    max_age = 86400
    data = {}
    if key == "station":
        station = db.query(Station).get(identifier)
        data["Time"] = station.time.isoformat(" ")
        if station.name:
            data["Station Name"] = station.name

        platform = station.platform

    elif key == "platform":
        platform = db.query(Platform).get(identifier)
    else:
        raise FAILURE

    data.update(platform.attrs)
    data["Platform Type"] = platform.type.name
    data = {k: data[k] for k in sorted(data)}
    # resp = jsonify(data)
    # resp.cache_control.max_age = max_age
    return data


@router.get("/observation/variables/{query}.json")
def observation_variables_v1_0(query: str, db: Session = Depends(get_db)):
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
        station = db.query(Station).get(identifier)
    elif key == "platform":
        platform = db.query(Platform).get(identifier)
        station = db.query(Station).filter(Station.platform == platform).first()
    else:
        raise FAILURE

    datatype_keys = [
        k[0]
        for k in db.query(func.distinct(Sample.datatype_key))
        .filter(Sample.station == station)
        .all()
    ]

    datatypes = (
        db.query(DataType)
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

    # resp = jsonify(data)
    # resp.cache_control.max_age = max_age
    return data

'''
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
'''

def _is_cache_valid(dataset: str, f: str) -> bool:
    """
    Returns True if dataset cache is valid
    """

    config = DatasetConfig(dataset)
    if os.path.isfile(f):
        cache_time = config.cache
        if cache_time is not None:
            modtime = datetime.datetime.fromtimestamp(os.path.getmtime(f))
            age_hours = (datetime.datetime.now() - modtime).total_seconds() / 3600
            if age_hours > cache_time:
                os.remove(f)
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
    p = os.path.dirname(f)
    if not os.path.isdir(p):
        os.makedirs(p)

    bytesIOBuff.seek(0)
    im = Image.open(bytesIOBuff.read())
    im.save(f, format="PNG", optimize=True)  # For cache
    bytesIOBuff.seek(0)

    return StreamingResponse(
        bytesIOBuff,
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename=#{os.path.basename(f)}"},
    )
