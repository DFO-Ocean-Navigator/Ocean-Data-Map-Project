import base64
import datetime
import gzip
import json
import os
import pathlib
import shutil
import sqlite3
from io import BytesIO

import geojson
import numpy as np
import pandas as pd
from dateutil.parser import parse as dateparse
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from PIL import Image
from shapely.geometry import LinearRing, Point, Polygon
from sqlalchemy import func
from sqlalchemy.orm import Session

import data.class4 as class4
import data.observational.queries as ob_queries
import plotting.colormap
import routes.enums as e
import utils.misc
from data import open_dataset
from data.observational import (
    Base,
    DataType,
    Platform,
    Sample,
    SessionLocal,
    Station,
    engine,
)
from data.sqlite_database import SQLiteDatabase
from data.transformers.geojson import data_array_to_geojson
from data.utils import get_data_vars_from_equation, time_index_to_datetime
from oceannavigator.dataset_config import DatasetConfig
from oceannavigator.log import log
from oceannavigator.settings import get_settings
from plotting.class4 import Class4Plotter
from plotting.colormap import plot_colormaps
from plotting.hovmoller import HovmollerPlotter
from plotting.map import MapPlotter
from plotting.observation import ObservationPlotter
from plotting.profile import ProfilePlotter
from plotting.scale import get_scale
from plotting.scriptGenerator import generatePython, generateR
from plotting.sound import SoundSpeedPlotter
from plotting.stick import StickPlotter
from plotting.tile import bathymetry as plot_bathymetry
from plotting.tile import scale as plot_scale
from plotting.tile import topo as plot_topography
from plotting.timeseries import TimeseriesPlotter
from plotting.track import TrackPlotter
from plotting.transect import TransectPlotter
from plotting.ts import TemperatureSalinityPlotter
from utils.errors import ClientError

FAILURE = ClientError("Bad API usage")
MAX_CACHE = 315360000

Base.metadata.create_all(bind=engine)

router = APIRouter(
    prefix="/api/v1.0",
    responses={404: {"message": "Not found"}},
)


def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


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
    plot_type: str = Query(None, description="Type of requested data product."),
    lang: e.ScriptLang = Query(..., description="Language of the requested API script"),
    script_type: e.ScriptType = Query(..., description="Type of requested script"),
):
    if lang == e.ScriptLang.python:
        b = generatePython(query, plot_type, script_type)
        media_type = "application/x-python"
        filename = f"ocean_navigator_api_script_{script_type}.py"

    elif lang == e.ScriptLang.r:
        b = generateR(query, plot_type, script_type)
        media_type = "text/plain"
        filename = f"ocean_navigator_api_script_{script_type}.r"

    return StreamingResponse(
        b,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
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
                "model_class": config.model_class,
                "group": config.group,
                "subgroup": config.subgroup,
                "time_dim_units": config.time_dim_units,
            }
        )
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


@router.get("/api/v1.0/{dataset}/timeunit")
def time_dimension(
    dataset: str = Path(
        None,
        title="The key of the dataset.",
        example="giops_day",
    )
):
    config = DatasetConfig(dataset)

    return config.time_dim_units


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


@router.get("/scale/{dataset}/{variable}/{scale}")
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

    return StreamingResponse(
        bytes, media_type="blob", headers={"Cache-Control": f"max-age={MAX_CACHE}"}
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
            bearings_var = config.variable[variable].bearing_component or "bearing"
            with open_dataset(
                config, variable=bearings_var, timestamp=time
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

        path = pathlib.Path(cached_file_name).parent
        path.mkdir(parents=True, exist_ok=True)
        with open(cached_file_name, "w", encoding="utf-8") as f:
            geojson.dump(d, f)

        return d


@router.get("/class4")
async def class4_files():
    """
    Returns a list of available class4 files.
    """
    data = class4.list_class4_files()

    return JSONResponse(data, headers={"Cache-Control": f"max-age={MAX_CACHE}"})


@router.get("/class4/{data_type}/{class4_type}")
async def class4_data(
    data_type: str = Path(..., title="The type of data requested.", example="models"),
    class4_type: str = Path(
        ..., title="The type of the desired class4 product.", example="ocean_predict"
    ),
    id: str = Query(
        ...,
        description="The ID of the desired class4 data.",
        example="class4_20220513_GIOPS_CONCEPTS_3.3_profile_231",
    ),
):
    """
    Returns the available models or forecasts for the selected class4 data.
    """

    if data_type == "forecasts":
        data = class4.list_class4_forecasts(id, class4_type)
    elif data_type == "models":
        data = class4.list_class4_models(id, class4_type)

    return JSONResponse(data, headers={"Cache-Control": f"max-age={MAX_CACHE}"})


@router.get("/class4/{class4_type}")
async def class4_file(
    class4_type: str = Path(
        ..., title="The type of the desired class4 product.", example="ocean_predict"
    ),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", example="EPSG:3857"
    ),
    resolution: int = Query(..., description="The map resolution.", example="9784"),
    extent: str = Query(
        ...,
        description="The extent of the area bounding the data.",
        example="-15936951,1411044,4805001,12554952",
    ),
    id: str = Query(
        ...,
        description="The ID of the desired class4 data.",
        example="class4_20220513_GIOPS_CONCEPTS_3.3_profile_231",
    ),
):
    """
    Returns a FeatureCollection of class4 data points for the selected parameters.
    """

    data = class4.class4(class4_type, id, projection, resolution, extent)

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/subset/{dataset}/{variables}")
async def subset_query(
    request: Request,
    dataset: str = Path(..., title="The key of the dataset.", example="giops_day"),
    variables: str = Path(..., title="The variables keys.", example="votemper"),
    output_format: str = Query("NETCDF4", description="", example="NETCDF4"),
    min_range: str = Query(
        ...,
        description="The lower bound of the plot extent.",
        example="45.318100000000015,-59.3802",
    ),
    max_range: str = Query(
        ...,
        description="The upper bound of the plot extent.",
        example="45.994500000000016,-56.9418",
    ),
    time: str = Query(..., description="", example="2283984000,2283984000"),
    should_zip: str = Query("1", description="", example="1"),
):

    working_dir = None
    subset_filename = None

    args = {**request.path_params, **request.query_params}

    if "area" in args.keys():
        # Predefined area selected
        area = args.get("area")
        sp = area.split("/", 1)

        data = utils.misc.list_areas(sp[0], simplify=False)

        b = [x for x in data if x.get("key") == area]
        args = args.to_dict()
        args["polygons"] = b[0]["polygons"]

    config = DatasetConfig(dataset)
    time_range = time.split(",")
    variables = variables.split(",")
    with open_dataset(
        config,
        variable=variables,
        timestamp=int(time_range[0]),
        endtime=int(time_range[1]),
    ) as dataset:
        working_dir, subset_filename = dataset.nc_data.subset(args)

    return FileResponse(
        pathlib.Path(working_dir, subset_filename),
        headers={
            "Cache-Control": "max-age=300",
            "Content-Disposition": f'attachment; filename="{subset_filename}"',
        },
    )


@router.get("/plot/colormaps")
async def colormaps():
    """
    Returns list of available colormaps
    """

    data = sorted(
        [{"id": i, "value": n} for i, n in plotting.colormap.colormap_names.items()],
        key=lambda k: k["value"],
    )
    data.insert(0, {"id": "default", "value": "Default for Variable"})

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


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


@router.get("/plot/{plot_type}")
async def plot(
    plot_type: str = Path(..., title="The key of the dataset.", example="profile"),
    query: str = Query(
        ...,
        description="Collection of plot arguments.",
        example=(
            '{"dataset":"giops_day","names":[],"plotTitle":"","showmap":false,'
            + '"station":[[45,-45]],"time":2284761600,"variable":["votemper"]}'
        ),
    ),
    save: bool = Query(False, description="Wether or not to save the plot. "),
    format: str = Query(
        default="json",
        description="Plot format.",
        example="png",
    ),
    size: str = Query(
        default="15x9",
        description="The size of the plot.",
        example="15x9",
    ),
    dpi: int = Query(72, description="The resoltuion of the plot (dpi).", example=72),
    db: Session = Depends(get_db),
):
    """
    Interface for all plotting operations.
    """

    if format == "json":

        def make_response(data, mime):
            b64 = base64.encodebytes(data).decode()

            return Response(
                json.dumps("data:%s;base64,%s" % (mime, b64)),
                media_type=mime,
                headers={"Cache-Control": "max-age=300"},
            )

    else:

        def make_response(data, mime):
            return Response(
                data, media_type=mime, headers={"Cache-Control": "max-age=300"}
            )

    query = json.loads(query)
    dataset = query.get("dataset")
    options = {
        "format": format,
        "size": size,
        "dpi": dpi,
    }

    # Determine which plotter we need.
    if plot_type == "map":
        plotter = MapPlotter(dataset, query, **options)
    elif plot_type == "transect":
        plotter = TransectPlotter(dataset, query, **options)
    elif plot_type == "timeseries":
        plotter = TimeseriesPlotter(dataset, query, **options)
    elif plot_type == "ts":
        plotter = TemperatureSalinityPlotter(dataset, query, **options)
    elif plot_type == "sound":
        plotter = SoundSpeedPlotter(dataset, query, **options)
    elif plot_type == "profile":
        plotter = ProfilePlotter(dataset, query, **options)
    elif plot_type == "hovmoller":
        plotter = HovmollerPlotter(dataset, query, **options)
    elif plot_type == "observation":
        plotter = ObservationPlotter(dataset, query, db, **options)
    elif plot_type == "track":
        plotter = TrackPlotter(dataset, query, **options)
    elif plot_type == "class4":
        plotter = Class4Plotter(dataset, query, **options)
    elif plot_type == "stick":
        plotter = StickPlotter(dataset, query, **options)
    else:
        raise HTTPException(
            status_code=404, detail=f"Incorrect plot type ({plot_type}) provided."
        )

    img, mime, filename = plotter.run()

    if img:
        response = make_response(img, mime)

    else:
        raise FAILURE

    if save:
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response


@router.get("/kml/points")
async def kml_points():
    """
    Returns the KML groups containing points of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("point"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


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

    return JSONResponse(
        utils.misc.points(id, projection, view_bounds),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/lines")
async def kml_lines():
    """
    Returns the KML groups containing lines of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("line"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/lines/{id}")
async def kml_line(
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
    return JSONResponse(
        utils.misc.lines(id, projection, view_bounds),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/areas")
async def kml_areas():
    """
    Returns the KML groups containing areas of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("area"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/areas/{id}")
async def kml_area(
    id: str = Path(..., example="NL-AZMP_Stations"),
    projection: str = Query(
        ...,
        description="EPSG code for desired projection. Used to map resulting KML \
            coords",
        example="EPSG:3857",
    ),
    resolution: int = Query(
        ...,
        description="Used to exclude KML points that aren't visible. Useful for \
            filtering large KML groups.",
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
    return JSONResponse(
        utils.misc.areas(id, projection, resolution, view_bounds),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


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


@router.get("/tiles/{dataset}/{variable}/{time}/{depth}/{zoom}/{x}/{y}")
async def data_tile(
    dataset: str = Path(
        ..., description="The key of the dataset.", example="giops_day"
    ),
    variable: str = Path(
        ..., description="The key of the variable.", example="votemper"
    ),
    time: int = Path(..., description="NetCDF timestamp"),
    depth: str = Path(..., description="Depth index", example=0),
    zoom: int = Path(..., example=4),
    x: int = Path(..., example=0),
    y: int = Path(..., example=1),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", example="EPSG:3857"
    ),
    interp: e.InterpolationType = Query(default="gaussian"),
    radius: int = Query(default=25, example=25),
    neighbours: int = Query(default=10, example=10),
    scale: str = Query(..., example="-5,30"),
):
    """
    Produces the map data tiles
    """

    settings = get_settings()

    f = os.path.join(
        settings.cache_dir,
        "api",
        "v1.0",
        "tiles",
        str(interp),
        str(radius),
        str(neighbours),
        projection,
        dataset,
        variable,
        str(time),
        depth,
        scale,
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


@router.get("/tiles/topo/{zoom}/{x}/{y}")
async def topography_tiles(
    zoom: int = Path(..., example=4),
    x: int = Path(..., example=0),
    y: int = Path(..., example=1),
    shaded_relief: bool = Query(default=False),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", example="EPSG:3857"
    ),
):
    """
    Generates topographical tiles
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
        "topo",
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

    img = plot_topography(projection, x, y, zoom, shaded_relief)
    return _cache_and_send_img(img, f)


@router.get("/tiles/bath/{zoom}/{x}/{y}")
async def bathymetry_tiles(
    zoom: int = Path(..., example=4),
    x: int = Path(..., example=0),
    y: int = Path(..., example=1),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", example="EPSG:3857"
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


@router.get("/mbt/{tiletype}/{zoom}/{x}/{y}")
def mbt(
    tiletype: str = Path(..., example="bath"),
    zoom: int = Path(..., example=8),
    x: int = Path(..., example=88),
    y: int = Path(..., example=85),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", example="EPSG:3857"
    ),
):
    """
    Serves mbt files
    """

    settings = get_settings()

    shape_file_dir = settings.shape_file_dir
    requestf = pathlib.Path(
        settings.cache_dir,
        "api",
        "v1.0",
        "mbt",
        projection,
        tiletype,
        str(zoom),
        str(x),
        str(y),
    )
    basedir = requestf.parents[0]

    # Send blank tile if conditions aren't met
    blank_response = FileResponse(
        shape_file_dir + "/blank.mbt",
        media_type="image/png",
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )

    if (zoom < 7) or (projection != "EPSG:3857"):
        return blank_response

    if (zoom > 11) and (tiletype == "bath"):
        return blank_response

    # Send file if cached or select data in SQLite file
    if requestf.is_file():
        return FileResponse(
            requestf.as_posix(),
            media_type="image/png",
            headers={"Cache-Control": f"max-age={MAX_CACHE}"},
        )

    y = (2**zoom - 1) - y
    connection = sqlite3.connect(shape_file_dir + "/{}.mbtiles".format(tiletype))
    selector = connection.cursor()
    sqlite = f"SELECT tile_data FROM tiles WHERE zoom_level = {zoom} AND tile_column = {x} AND tile_row = {y}"  # noqa: E501
    selector.execute(sqlite)
    tile = selector.fetchone()
    if tile is None:
        return blank_response

    # Write tile to cache and send file
    basedir.mkdir(parents=True, exist_ok=True)
    with open(requestf.as_posix() + ".pbf", "wb") as f:
        f.write(tile[0])
    with gzip.open(requestf.as_posix() + ".pbf", "rb") as gzipped:
        with open(requestf, "wb") as tileout:
            shutil.copyfileobj(gzipped, tileout)
    return FileResponse(
        requestf,
        media_type="image/png",
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/datatypes.json")
async def observation_datatypes(db: Session = Depends(get_db)):
    """
    Returns the list of observational data types. Used in ObservationSelector.
    """

    data = [
        {
            "id": dt.key,
            "value": dt.name,
        }
        for dt in ob_queries.get_datatypes(db)
    ]

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/meta_keys/{platform_types}.json")
async def observation_keys(
    platform_types: str = Path(
        ...,
        title="List of platform types (comma seperated).",
        example="argo,drifter,animal,mission,glider",
    ),
    db: Session = Depends(get_db),
):
    """
    Gets the set of metadata keys for a list of platform types. Used in
    ObservationSelector.
    """

    data = ob_queries.get_meta_keys(db, platform_types.split(","))

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/meta_values/{platform_types}/{key}.json")
async def observation_values_v1_0(
    platform_types: str = Path(
        ...,
        title="List of platform types (comma seperated).",
        example="argo",
    ),
    key: str = Path(
        ...,
        title="Metadata key",
        example="Float unique identifier",
    ),
    db: Session = Depends(get_db),
):
    """
    Gets the set of metadata values for a list of platform types and key. Used in
    ObservationSelector.
    """

    data = ob_queries.get_meta_values(db, platform_types.split(","), key)

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/tracktimerange/{platform_id}.json")
async def observation_tracktime(
    platform_id: str = Path(
        ...,
        title="Platform ID.",
        example="1344",
    ),
    db: Session = Depends(get_db),
):
    """
    Queries the min and max times for the track. Used in TrackWindow.
    """

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

    return JSONResponse(
        resp,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/track/{query}.json")
async def observation_track(
    query: str = Path(
        ...,
        title="List of key=value pairs, seperated by ;",
        example="start_date=2019-01-01;end_date=2019-06-01;quantum=year",
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for tracks. Used in ObservationSelector.
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split(";")]}
    data = []
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

    return JSONResponse(
        result,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/point/{query}.json")
async def observation_point(
    query: str = Path(
        ...,
        title="List of key=value pairs, seperated by ;",
        example=(
            "start_date=2019-01-01;end_date=2019-06-01;"
            + "datatype=sea_water_temperature"
        ),
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for points. Used in ObservationSelector.
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split(";")]}
    data = []
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

    return JSONResponse(
        result,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/meta/{key}/{id}.json")
async def observation_meta(
    key: str = Path(
        ...,
        title="Type/Platform of observation.",
        example="station",
    ),
    id: str = Path(
        ...,
        title="id of observation.",
        example="21831",
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for all the metadata for a platform or station. Used in Map for
    the observational tooltip.
    """

    data = {}
    if key == "station":
        station = db.query(Station).get(id)
        data["Time"] = station.time.isoformat(" ")
        if station.name:
            data["Station Name"] = station.name

        platform = station.platform

    elif key == "platform":
        platform = db.query(Platform).get(id)
    else:
        raise FAILURE

    data.update(platform.attrs)
    data["Platform Type"] = platform.type.name
    data = {k: data[k] for k in sorted(data)}

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/observation/variables/{query}.json")
async def observation_variables(
    query: str = Path(
        ...,
        title=" A key=value pair, where key is either station \
            or platform and value is the id.",
        example="station=356768",
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for variables for a platform or station. Used in PointWindow
    for the observational variable selection.
    """
    key, identifier = query.split("=")
    data = []

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

    return JSONResponse(
        data,
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


def _cache_and_send_img(bytesIOBuff: BytesIO, f: str):
    """
    Caches a rendered image buffer on disk and sends it to the browser

    bytesIOBuff: BytesIO object containing image data
    f: filename of image to be cached
    """
    p = pathlib.Path(f).parent
    p.mkdir(parents=True, exist_ok=True)

    bytesIOBuff.seek(0)
    im = Image.open(bytesIOBuff)
    im.save(f, format="PNG", optimize=True)
    bytesIOBuff.seek(0)

    return StreamingResponse(
        bytesIOBuff,
        media_type="image/png",
        headers={"Content-Disposition": f"attachment; filename=#{os.path.basename(f)}"},
    )
