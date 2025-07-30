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
from sqlalchemy import exc, func
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
from typing import Optional, List
import numpy as np
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from dateutil.parser import parse as dateparse
from datetime import datetime
from netCDF4 import num2date

FAILURE = ClientError("Bad API usage")
MAX_CACHE = 315360000

try:
    Base.metadata.create_all(bind=engine)
except exc.OperationalError:
    log().error("Unable to connect to MySQL database.")

router = APIRouter(
    prefix="/api/v2.0",
    responses={404: {"message": "Not found"}},
)


def get_db():
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


@router.get("/git_info")
def git_info():
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
def generate_script(
    query: str = Query(description="string-ified JSON"),
    plot_type: str = Query(None, description="Type of requested data product."),
    lang: e.ScriptLang = Query(description="Language of the requested API script"),
    script_type: e.ScriptType = Query(description="Type of requested script"),
):
    if lang == e.ScriptLang.python:
        b = generatePython(query, plot_type, script_type.value)
        media_type = "application/x-python"
        filename = f"ocean_navigator_api_script_{script_type.value}.py"

    elif lang == e.ScriptLang.r:
        b = generateR(query, plot_type, script_type.value)
        media_type = "text/plain"
        filename = f"ocean_navigator_api_script_{script_type.value}.r"

    return StreamingResponse(
        b,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/datasets")
def datasets():
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
                "default_location": config.default_location,
            }
        )
    return data


@router.get("/dataset/{dataset}")
def dataset(
    dataset: str = Path(
        title="The key of the dataset.",
        examples=["giops_day"],
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


@router.get("/api/v2.0/{dataset}/timeunit")
def time_dimension(
    dataset: str = Path(
        title="The key of the dataset.",
        examples=["giops_day"],
    )
):
    config = DatasetConfig(dataset)

    return config.time_dim_units


@router.get("/dataset/{dataset}/quantum")
def quantum(
    dataset: str = Path(
        title="The key of the dataset.",
        examples=["giops_day"],
    )
):
    """
    Returns the time scale (i.e. quantum) for a dataset.
    """

    config = DatasetConfig(dataset)

    return {"value": config.quantum}


@router.get("/dataset/{dataset}/variables")
def variables(
    dataset: str = Path(
        title="The key of the dataset.",
        examples=["giops_day"],
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
                    "vector_variable": v.key in config.vector_variables,
                }
            )

    data = sorted(data, key=lambda k: k["value"])

    return data


@router.get("/dataset/{dataset}/{variable}/timestamps")
def timestamps(
    dataset: str = Path(title="The key of the dataset.", examples=["giops_day"]),
    variable: str = Path(title="The key of the variable.", examples=["votemper"]),
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
            time_dim_units = config.time_dim_units
    else:
        with open_dataset(config, variable=variable) as ds:
            vals = list(map(int, ds.nc_data.time_variable.values))
            time_dim_units = (
                config.time_dim_units or ds.nc_data.time_variable.attrs["units"]
            )
    converted_vals = time_index_to_datetime(vals, time_dim_units)

    result = []
    for idx, date in enumerate(converted_vals):
        if config.quantum == "month" or config.variable[variable].quantum == "month":
            date = datetime.datetime(date.year, date.month, 15)
        result.append({"id": vals[idx], "value": date.isoformat()})

    result = sorted(result, key=lambda k: k["id"])

    return jsonable_encoder(result)


@router.get("/dataset/{dataset}/{variable}/depths")
def depths(
    dataset: str = Path(
        title="The key of the dataset.",
        examples=["giops_day"],
    ),
    variable: str = Path(
        title="The key of the variable.",
        examples=["votemper"],
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
def scale(
    dataset: str = Path(description="The key of the dataset.", examples=["giops_day"]),
    variable: str = Path(description="The key of the variable.", examples=["votemper"]),
    scale: str = Path(description="Min/max values for scale image", examples=["-5,30"]),
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


@router.get(
    "/range/{dataset}/{variable}/{interp}/{radius}/{neighbours}"
    "/{projection}/{extent}/{depth}/{time}"
)
def range(
    dataset: str = Path(description="The key of the dataset.", examples=["giops_day"]),
    variable: str = Path(description="The key of the variable.", examples=["votemper"]),
    interp: e.InterpolationType = Path(description="", examples=["gaussian"]),
    radius: int = Path(
        description="Radius in km to search for neighbours", examples=[25]
    ),
    neighbours: int = Path(
        description="The max number of nearest neighbours to search for.",
        examples=[10],
    ),
    projection: str = Path(
        description="EPSG code of the desired projection.",
        examples=["EPSG:3857"],
    ),
    extent: str = Path(
        description="View extent",
        examples=["-17815466.9445,3631998.6003,6683517.8652,10333997.2404"],
    ),
    depth: str = Path(
        description="Depth index",
        examples={
            "numerical index": {"value": "1"},
            "bottom index": {"value": "bottom"},
        },
    ),
    time: int = Path(description="NetCDF timestamp"),
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


@router.get("/class4")
def class4_files():
    """
    Returns a list of available class4 files.
    """
    data = class4.list_class4_files()

    return JSONResponse(data, headers={"Cache-Control": f"max-age={MAX_CACHE}"})


@router.get("/class4/{data_type}/{class4_type}")
def class4_data(
    data_type: str = Path(title="The type of data requested.", examples=["models"]),
    class4_type: str = Path(
        title="The type of the desired class4 product.", examples=["ocean_predict"]
    ),
    id: str = Query(
        description="The ID of the desired class4 data.",
        examples=["class4_20220513_GIOPS_CONCEPTS_3.3_profile_231"],
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


@router.get("/datasets/all")
def get_all_datasets():
    """
    Get all available datasets with basic information.
    """
    all_datasets = []
    dataset_keys = DatasetConfig.get_datasets()

    for dataset_key in dataset_keys:
        config = DatasetConfig(dataset_key)
        all_datasets.append(
            {
                "id": dataset_key,
                "name": config.name,
                "group": getattr(config, "group", ""),
                "subgroup": getattr(config, "subgroup", ""),
                "type": getattr(config, "type", "Unknown"),
                "quantum": config.quantum,
                "help": getattr(config, "help", ""),
                "attribution": getattr(config, "attribution", ""),
                "matchingVariables": [],
            }
        )

    return {"datasets": all_datasets}


@router.get("/datasets/variables/all")
def get_all_variables():
    """
    returns a list of unique variables available in the datasets
    """
    all_variables = {}
    dataset_keys = DatasetConfig.get_datasets()

    for dataset_key in dataset_keys:
        config = DatasetConfig(dataset_key)

        if hasattr(config, "variables"):
            for var_key in config.variables:
                if not config.variable[var_key].is_hidden:
                    var_name = config.variable[var_key].name
                    if var_key not in all_variables:
                        all_variables[var_key] = {
                            "id": var_key,
                            "name": var_name,
                            "units": getattr(config.variable[var_key], "units", ""),
                            "datasets": [dataset_key],
                        }
                    else:
                        all_variables[var_key]["datasets"].append(dataset_key)
    return {"data": list(all_variables.values())}


@router.post("/datasets/filter/variable")
def filter_datasets_by_variable(
    request: dict,
    variable: str = Query(description="Variable to filter by"),
):
    """
    Filter datasets by variable from a provided list of dataset IDs.
    """
    dataset_ids = request.get("dataset_ids", [])
    if not dataset_ids:
        # If no dataset_ids provided, use all available datasets
        dataset_ids = DatasetConfig.get_datasets()

    matching_datasets = []

    for dataset_id in dataset_ids:
        try:
            config = DatasetConfig(dataset_id)
            dataset_has_variable = False
            matching_variables = []

            # Check if variable exists in dataset
            if hasattr(config, "variables") and variable in config.variables:
                if not config.variable[variable].is_hidden:
                    matching_variables.append(variable)
                    dataset_has_variable = True
            else:
                # Check common variable mappings
                common_variable_mappings = {
                    "votemper": [
                        "votemper",
                        "temperature",
                        "tos",
                        "thetao",
                        "sea_water_temperature",
                    ],
                    "temperature": [
                        "votemper",
                        "temperature",
                        "tos",
                        "thetao",
                        "sea_water_temperature",
                    ],
                    "vosaline": [
                        "vosaline",
                        "salinity",
                        "sos",
                        "so",
                        "sea_water_salinity",
                    ],
                    "salinity": [
                        "vosaline",
                        "salinity",
                        "sos",
                        "so",
                        "sea_water_salinity",
                    ],
                    "vozocrtx": ["vozocrtx", "uos", "uo", "uVelocity"],
                    "vomecrty": ["vomecrty", "vos", "vo", "vVelocity"],
                }

                if variable in common_variable_mappings:
                    for alt_var in common_variable_mappings[variable]:
                        if hasattr(config, "variables") and alt_var in config.variables:
                            if not config.variable[alt_var].is_hidden:
                                matching_variables.append(alt_var)
                                dataset_has_variable = True
                                break

            if dataset_has_variable:
                matching_datasets.append(
                    {
                        "id": dataset_id,
                        "name": config.name,
                        "group": getattr(config, "group", ""),
                        "subgroup": getattr(config, "subgroup", ""),
                        "type": getattr(config, "type", "Unknown"),
                        "quantum": config.quantum,
                        "help": getattr(config, "help", ""),
                        "attribution": getattr(config, "attribution", ""),
                        "matchingVariables": matching_variables,
                    }
                )

        except Exception as e:
            log().warning(f"Error processing dataset {dataset_id}: {str(e)}")
            continue

    return {"datasets": matching_datasets}


@router.get("/datasets/quiver-variables/all")
def get_all_quiver_variables():
    """
    Returns all unique quiver/vector variables across all enabled datasets.
    """
    all_quiver_vars = {}
    dataset_keys = DatasetConfig.get_datasets()
    for dataset_key in dataset_keys:
        config = DatasetConfig(dataset_key)

        if hasattr(config, "vector_variables") and config.vector_variables:
            for var_key in config.vector_variables.keys():
                var_data = config.vector_variables[var_key]
                var_name = var_data.get("name", var_key)
                var_units = var_data.get("units", "")

                if var_key not in all_quiver_vars:
                    all_quiver_vars[var_key] = {
                        "id": var_key,
                        "name": var_name,
                        "units": var_units,
                        "datasets": [dataset_key],
                    }
                else:
                    if dataset_key not in all_quiver_vars[var_key]["datasets"]:
                        all_quiver_vars[var_key]["datasets"].append(dataset_key)

    return {"data": list(all_quiver_vars.values())}


@router.post("/datasets/filter/quiver_variable")
def filter_datasets_by_quiver_variable(
    request: dict,
    quiver_variable: str = Query(description="Quiver variable to filter by"),
):
    """
    Filter datasets by quiver variable from a provided list of dataset IDs.
    """
    dataset_ids = request.get("dataset_ids", [])
    if not dataset_ids:
        dataset_ids = DatasetConfig.get_datasets()

    matching_datasets = []

    for dataset_id in dataset_ids:
            config = DatasetConfig(dataset_id)
            dataset_has_quiver_var = False
            matching_variables = []

            if hasattr(config, "vector_variables") and config.vector_variables:
                if quiver_variable in config.vector_variables:
                    matching_variables.append(quiver_variable)
                    dataset_has_quiver_var = True
                else:
                    common_quiver_mappings = {
                        "magwatervel": ["magwatervel", "current_speed"],
                        "icevelocity": ["icevelocity"],
                    }

                    if quiver_variable in common_quiver_mappings:
                        for alt_var in common_quiver_mappings[quiver_variable]:
                            if alt_var in config.vector_variables:
                                matching_variables.append(alt_var)
                                dataset_has_quiver_var = True
                                break

            if dataset_has_quiver_var:
                matching_datasets.append(
                    {
                        "id": dataset_id,
                        "name": config.name,
                        "group": getattr(config, "group", ""),
                        "subgroup": getattr(config, "subgroup", ""),
                        "type": getattr(config, "type", "Unknown"),
                        "quantum": config.quantum,
                        "help": getattr(config, "help", ""),
                        "attribution": getattr(config, "attribution", ""),
                        "matchingVariables": matching_variables,
                    }
                )

    return {"datasets": matching_datasets}


@router.post("/datasets/filter/depth")
def filter_datasets_by_depth(
    request: dict,
    has_depth: str = Query(description="Depth requirement: 'yes', 'no'"),
    variable: Optional[str] = Query(None, description="Variable to check depth for"),
):
    """
    Filter datasets by depth dimensions from a provided list of dataset IDs.
    """
    ##dvfdsd
    dataset_ids = request.get("dataset_ids", [])
    if not dataset_ids:
        dataset_ids = DatasetConfig.get_datasets()

    matching_datasets = []

    for dataset_id in dataset_ids:
        try:
            config = DatasetConfig(dataset_id)
            dataset_matches = False

            # If we have a specific variable to check
            if variable and hasattr(config, "variables"):
                selected_var = None

                # Find the variable in the dataset
                if variable in config.variables:
                    selected_var = variable
                else:
                    # Try common mappings
                    common_variable_mappings = {
                        "votemper": ["votemper", "temperature", "tos", "thetao"],
                        "vosaline": ["vosaline", "salinity", "sos", "so"],
                        "vozocrtx": ["vozocrtx", "uos", "uo"],
                        "vomecrty": ["vomecrty", "vos", "vo"],
                    }

                    if variable in common_variable_mappings:
                        for alt_var in common_variable_mappings[variable]:
                            if alt_var in config.variables:
                                selected_var = alt_var
                                break

                if selected_var:
                    # Check if this specific variable has depth
                    if config.url.endswith(".sqlite3"):
                        with SQLiteDatabase(config.url) as db:
                            dims = db.get_all_dimensions()
                        has_depth_dims = "depth" in dims
                    else:
                        try:
                            with open_dataset(
                                config, variable=selected_var, timestamp=-1
                            ) as ds:
                                var = ds.variables[selected_var]
                                has_depth_dims = var.has_depth()
                        except:
                            has_depth_dims = False

                    if has_depth == "yes" and has_depth_dims:
                        dataset_matches = True
                    elif has_depth == "no" and not has_depth_dims:
                        dataset_matches = True
            else:
                # General depth check for the dataset
                if config.url.endswith(".sqlite3"):
                    with SQLiteDatabase(config.url) as db:
                        dims = db.get_all_dimensions()
                    has_depth_dims = "depth" in dims
                else:
                    #if any variables have depth
                    has_depth_dims = False
                    try:
                        sample_var = list(config.variables.keys())[0]
                        with open_dataset(
                            config, variable=sample_var, timestamp=-1
                        ) as ds:
                            var = ds.variables[sample_var]
                            has_depth_dims = var.has_depth()
                    except:
                        pass

                if has_depth == "yes" and has_depth_dims:
                    dataset_matches = True
                elif has_depth == "no" and not has_depth_dims:
                    dataset_matches = True

            if dataset_matches:
                matching_datasets.append(
                    {
                        "id": dataset_id,
                        "name": config.name,
                        "group": getattr(config, "group", ""),
                        "subgroup": getattr(config, "subgroup", ""),
                        "type": getattr(config, "type", "Unknown"),
                        "quantum": config.quantum,
                        "help": getattr(config, "help", ""),
                        "attribution": getattr(config, "attribution", ""),
                        "matchingVariables": [],
                    }
                )

        except Exception as e:
            log().warning(f"Error processing dataset {dataset_id}: {str(e)}")
            continue

    return {"datasets": matching_datasets}


def check_dataset_date(dataset_id, target_date):
    config = DatasetConfig(dataset_id)
    url = config.url if not isinstance(config.url, list) else config.url[0]
    try:
        with SQLiteDatabase(url) as db:
            sample_var = config.variables[0] if config.variables else None
            if sample_var:
                vals = db.get_timestamps(sample_var)
                time_dim_units = config.time_dim_units
                if vals == []:
                    return False
                converted_times = time_index_to_datetime(vals, time_dim_units)

                matched = any(dt.date() == target_date.date() for dt in converted_times)
                return matched
            else:
                return False
    except Exception as e:
        print(f"❌ Error opening or querying database for dataset {dataset_id}: {e}")
        return False
    
@router.post("/datasets/filter/date")
def filter_datasets_by_date(
    request: dict,
    target_date: str = Query(description="Target date in ISO format"),
):
    """
    Filters datasets by date availability from a provided list of dataset IDs.
    """
    dataset_ids = request.get("dataset_ids", [])
    if not dataset_ids:
        dataset_ids = DatasetConfig.get_datasets()

    matching_datasets = []
    parsed_date = dateparse(target_date)

    for dataset_id in dataset_ids:
            
            date_matches = check_dataset_date(dataset_id, parsed_date)
            if date_matches:
                config = DatasetConfig(dataset_id)
                matching_datasets.append({
                    "id": dataset_id,
                    "name": config.name,
                    "group": getattr(config, "group", ""),
                    "subgroup": getattr(config, "subgroup", ""),
                    "type": getattr(config, "type", "Unknown"),
                    "quantum": config.quantum,
                    "help": getattr(config, "help", ""),
                    "attribution": getattr(config, "attribution", ""),
                    "matchingVariables": [],
                })            
    return {"datasets": matching_datasets}

# Add this endpoint to your FastAPI router in paste-2.txt

@router.post("/datasets/filter/location")
def filter_datasets_by_location(
    request: dict,
    latitude: float = Query(description="Latitude coordinate"),
    longitude: float = Query(description="Longitude coordinate"),
    tolerance: float = Query(default=0.1, description="Tolerance in degrees for coordinate matching"),
):
    """
    Filter datasets by location from a provided list of dataset IDs.
    Returns datasets that contain data at or near the specified coordinates.
    """
    dataset_ids = request.get("dataset_ids", [])
    if not dataset_ids:
        dataset_ids = DatasetConfig.get_datasets()

    matching_datasets = []

    for dataset_id in dataset_ids:
        try:
            config = DatasetConfig(dataset_id)
            dataset_contains_location = False

            # Check if the coordinates are within the dataset bounds
            if check_dataset_location(dataset_id, latitude, longitude, tolerance):
                dataset_contains_location = True

            if dataset_contains_location:
                matching_datasets.append(
                    {
                        "id": dataset_id,
                        "name": config.name,
                        "group": getattr(config, "group", ""),
                        "subgroup": getattr(config, "subgroup", ""),
                        "type": getattr(config, "type", "Unknown"),
                        "quantum": config.quantum,
                        "help": getattr(config, "help", ""),
                        "attribution": getattr(config, "attribution", ""),
                        "matchingVariables": [],
                    }
                )

        except Exception as e:
            log().warning(f"Error processing dataset {dataset_id}: {str(e)}")
            continue

    return {"datasets": matching_datasets}


def check_dataset_location(dataset_id, target_lat, target_lon, tolerance=0.1):
    """
    Check if a given coordinate falls within the geographic bounds of a dataset.
    
    Args:
        dataset_id: The dataset identifier
        target_lat: Target latitude
        target_lon: Target longitude  
        tolerance: Tolerance in degrees for coordinate matching
        
    Returns:
        bool: True if the location is within the dataset bounds
    """
    try:
        config = DatasetConfig(dataset_id)
        url = config.url if not isinstance(config.url, list) else config.url[0]
        
        # # Handle SQLite datasets
        # if url.endswith(".sqlite3"):
        #     return check_sqlite_location(config, target_lat, target_lon, tolerance)
        
        # # Handle NetCDF datasets
        # else:
        return check_netcdf_location(config, target_lat, target_lon, tolerance)
            
    except Exception as e:
        log().warning(f"Error checking location for dataset {dataset_id}: {str(e)}")
        return False




def check_netcdf_location(config, target_lat, target_lon, tolerance):
    """
    Check location bounds for NetCDF datasets.
    """
    try:
        # Get a sample variable to open the dataset
        sample_variables = config.variables[0]
        if not sample_variables:
            return False
            
        
        
        with open_dataset(config, variable=sample_variables, timestamp=-1) as dataset:
            # Get latitude and longitude variables
            lat_var = None
            lon_var = None
            
                                  
            # Fallback to common variable names
            if lat_var is None:
                for name in ['lat', 'latitude', 'y', 'nav_lat']:
                    if name in dataset.nc_data.dataset.variables:
                        lat_var = name
                        break
                        
            if lon_var is None:
                for name in ['lon', 'longitude', 'x', 'nav_lon']:
                    if name in dataset.nc_data.dataset.variables:
                        lon_var = name
                        break
            
            if lat_var is None or lon_var is None:
                log().warning(f"Could not find lat/lon variables for dataset {config}")
                return False
                
            # Get the coordinate arrays
            lat_data = dataset.nc_data.dataset.variables[lat_var][:]
            lon_data = dataset.nc_data.dataset.variables[lon_var][:]
            
            # Handle different coordinate structures
            if lat_data.ndim == 1 and lon_data.ndim == 1:
                # 1D coordinate arrays
                lat_min, lat_max = float(np.min(lat_data)), float(np.max(lat_data))
                lon_min, lon_max = float(np.min(lon_data)), float(np.max(lon_data))
            else:
                # 2D coordinate arrays (curvilinear grids)
                lat_min, lat_max = float(np.min(lat_data)), float(np.max(lat_data))
                lon_min, lon_max = float(np.min(lon_data)), float(np.max(lon_data))
            
            # Normalize longitude to [-180, 180] range
            def normalize_lon(lon):
                while lon > 180:
                    lon -= 360
                while lon < -180:
                    lon += 360
                return lon
            
            target_lon = normalize_lon(target_lon)
            lon_min = normalize_lon(lon_min)
            lon_max = normalize_lon(lon_max)
            
            # Handle longitude wrap-around
            if lon_max < lon_min:  # Dataset crosses the date line
                lon_in_bounds = (target_lon >= lon_min) or (target_lon <= lon_max)
            else:
                lon_in_bounds = (lon_min - tolerance) <= target_lon <= (lon_max + tolerance)
            
            # Check latitude bounds
            lat_in_bounds = (lat_min - tolerance) <= target_lat <= (lat_max + tolerance)
            
            return lat_in_bounds and lon_in_bounds
            
    except Exception as e:
        log().warning(f"Error checking NetCDF location: {str(e)}")
        return False





def get_netcdf_bounds(config):
    """
    Get geographic bounds from NetCDF dataset.
    """
    try:
        sample_variables = list(config.variables.keys())
        if not sample_variables:
            return None
            
        sample_variable = sample_variables[0]
        
        with open_dataset(config, variable=sample_variable, timestamp=-1) as dataset:
            # Find lat/lon variables (reuse logic from check_netcdf_location)
            lat_var = None
            lon_var = None
            
            for var_name in dataset.nc_data.dataset.variables:
                var = dataset.nc_data.dataset.variables[var_name]
                if hasattr(var, 'standard_name'):
                    if var.standard_name in ['latitude', 'grid_latitude']:
                        lat_var = var_name
                    elif var.standard_name in ['longitude', 'grid_longitude']:
                        lon_var = var_name
                        
            if lat_var is None:
                for name in ['lat', 'latitude', 'y', 'nav_lat']:
                    if name in dataset.nc_data.dataset.variables:
                        lat_var = name
                        break
                        
            if lon_var is None:
                for name in ['lon', 'longitude', 'x', 'nav_lon']:
                    if name in dataset.nc_data.dataset.variables:
                        lon_var = name
                        break
                        
            if lat_var is None or lon_var is None:
                return None
                
            lat_data = dataset.nc_data.dataset.variables[lat_var][:]
            lon_data = dataset.nc_data.dataset.variables[lon_var][:]
            
            lat_min, lat_max = float(np.min(lat_data)), float(np.max(lat_data))
            lon_min, lon_max = float(np.min(lon_data)), float(np.max(lon_data))
            
            return (lat_min, lat_max, lon_min, lon_max)
            
    except Exception as e:
        log().warning(f"Error getting NetCDF bounds: {str(e)}")
        return None



@router.get("/class4/{class4_type}")
def class4_file(
    class4_type: str = Path(
        title="The type of the desired class4 product.", examples=["ocean_predict"]
    ),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
    ),
    resolution: int = Query(description="The map resolution.", examples=["9784"]),
    extent: str = Query(
        description="The extent of the area bounding the data.",
        examples=["-15936951,1411044,4805001,12554952"],
    ),
    id: str = Query(
        description="The ID of the desired class4 data.",
        examples=["class4_20220513_GIOPS_CONCEPTS_3.3_profile_231"],
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
def subset_query(
    request: Request,
    dataset: str = Path(title="The key of the dataset.", examples=["giops_day"]),
    variables: str = Path(title="The variables keys.", examples=["votemper"]),
    output_format: str = Query("NETCDF4", description="", examples=["NETCDF4"]),
    min_range: str = Query(
        description="The lower bound of the plot extent.",
        examples=["45.318100000000015,-59.3802"],
    ),
    max_range: str = Query(
        description="The upper bound of the plot extent.",
        examples=["45.994500000000016,-56.9418"],
    ),
    time: str = Query(description="", examples=["2283984000,2283984000"]),
    depth: str = Query(None, description="Optional depth index (e.g. 0 or 'bottom')"),
    should_zip: str = Query("1", description="", examples=["1"]),
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
def colormaps():
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
def colormaps_png():
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
    plot_type: str = Path(title="The key of the dataset.", examples=["profile"]),
    query: str = Query(
        description="Collection of plot arguments.",
        examples=[
            (
                '{"dataset":"giops_day","names":[],"plotTitle":"","showmap":false,'
                + '"station":[[45,-45]],"time":2284761600,"variable":["votemper"]}'
            )
        ],
    ),
    save: bool = Query(False, description="Wether or not to save the plot. "),
    format: str = Query(
        default="json",
        description="Plot format.",
        examples=["png"],
    ),
    size: str = Query(
        default="15x9",
        description="The size of the plot.",
        examples=["15x9"],
    ),
    dpi: int = Query(
        72, description="The resoltuion of the plot (dpi).", examples=[72]
    ),
    db: Session = Depends(get_db),
):
    """
    Interface for all plotting operations. Update example query with valid timestamp to
    test.
    """

    if format == "json":

        def make_response(data, mime):
            b64 = base64.encodebytes(data).decode()

            return Response(
                json.dumps("data:%s;base64,%s" % (mime, b64)),
                media_type=mime,
                headers={"Cache-Control": "max-age=300"},
            )

    elif format == "nc":

        def make_response(data, mime):
            return FileResponse(
                pathlib.Path(data),
                media_type=mime,
                headers={
                    "Cache-Control": "max-age=300",
                    "Content-Disposition": f'attachment; filename="{data}"',
                },
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
        plotter = TrackPlotter(dataset, query, db, **options)
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


@router.get("/kml/point")
def kml_points():
    """
    Returns the KML groups containing points of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("point"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/point/{id}")
def kml_point(
    id: str = Path(examples=["NL-AZMP_Stations"]),
    projection: str = Query(
        description="EPSG code for desired projection. Used to map resulting KML \
            coords",
        examples=["EPSG:3857"],
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


@router.get("/kml/line")
def kml_lines():
    """
    Returns the KML groups containing lines of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("line"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/line/{id}")
def kml_line(
    id: str = Path(examples=["NL-AZMP_Stations"]),
    projection: str = Query(
        description="EPSG code for desired projection. Used to map resulting KML \
            coords",
        examples=["EPSG:3857"],
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


@router.get("/kml/area")
def kml_areas():
    """
    Returns the KML groups containing areas of interest from hard-coded KML files
    """
    return JSONResponse(
        utils.misc.list_kml_files("area"),
        headers={"Cache-Control": f"max-age={MAX_CACHE}"},
    )


@router.get("/kml/area/{id}")
def kml_area(
    id: str = Path(examples=["NL-AZMP_Stations"]),
    projection: str = Query(
        description="EPSG code for desired projection. Used to map resulting KML \
            coords",
        examples=["EPSG:3857"],
    ),
    resolution: int = Query(
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


@router.get("/tiles/{dataset}/{variable}/{time}/{depth}/{zoom}/{x}/{y}")
async def data_tile(
    dataset: str = Path(description="The key of the dataset.", examples=["giops_day"]),
    variable: str = Path(description="The key of the variable.", examples=["votemper"]),
    time: int = Path(description="NetCDF timestamp"),
    depth: str = Path(description="Depth index", examples=[0]),
    zoom: int = Path(examples=[4]),
    x: int = Path(examples=[0]),
    y: int = Path(examples=[1]),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
    ),
    interp: e.InterpolationType = Query(default="gaussian"),
    radius: int = Query(default=25, examples=[25]),
    neighbours: int = Query(default=10, examples=[10]),
    scale: str = Query(examples=["-5,30"]),
):
    """
    Produces the map data tiles
    """

    settings = get_settings()

    f = os.path.join(
        settings.cache_dir,
        "api",
        "v2.0",
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

    img = await plotting.tile.plot(
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

    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    return _cache_and_send_img(buf, f)


@router.get(
    "/tiles/quiver/{dataset}/{variable}/{time}/{depth}/{density_adj}/{zoom}/{x}/{y}"
)
async def quiver_tile(
    dataset: str = Path(description="The key of the dataset.", examples=["giops_day"]),
    variable: str = Path(description="The key of the variable.", examples=["votemper"]),
    time: int = Path(description="NetCDF timestamp"),
    depth: str = Path(description="Depth index", examples=[0]),
    density_adj: int = Path(description="Quiver density adjustment", examples=[1]),
    zoom: int = Path(examples=[4]),
    x: int = Path(examples=[0]),
    y: int = Path(examples=[1]),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
    ),
):
    """
    Returns a geojson representation of requested model data.
    """

    settings = get_settings()

    cached_file_name = os.path.join(
        settings.cache_dir,
        "api",
        "v2.0",
        "tiles",
        "quiver",
        projection,
        dataset,
        variable,
        str(time),
        depth,
        str(density_adj),
        str(zoom),
        str(x),
        f"{y}.geojson",
    )

    if os.path.isfile(cached_file_name):
        log().info(f"Using cached {cached_file_name}.")
        return FileResponse(cached_file_name, media_type="application/json")

    data = await plotting.tile.quiver(
        dataset,
        variable,
        time,
        depth,
        density_adj,
        x,
        y,
        zoom,
        projection,
    )

    path = pathlib.Path(cached_file_name).parent
    path.mkdir(parents=True, exist_ok=True)
    with open(cached_file_name, "w", encoding="utf-8") as f:
        geojson.dump(data, f)

    return data


@router.get("/tiles/topo/{zoom}/{x}/{y}")
def topography_tiles(
    zoom: int = Path(examples=[4]),
    x: int = Path(examples=[0]),
    y: int = Path(examples=[1]),
    shaded_relief: bool = Query(default=False),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
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
        "v2.0",
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
    zoom: int = Path(examples=[4]),
    x: int = Path(examples=[0]),
    y: int = Path(examples=[1]),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
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
        "v2.0",
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

    img = await plot_bathymetry(projection, x, y, zoom)
    return _cache_and_send_img(img, f)


@router.get("/mbt/{tiletype}/{zoom}/{x}/{y}")
def mbt(
    tiletype: str = Path(examples=["bath"]),
    zoom: int = Path(examples=[8]),
    x: int = Path(examples=[88]),
    y: int = Path(examples=[85]),
    projection: str = Query(
        default="EPSG:3857", description="EPSG projection code.", examples=["EPSG:3857"]
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
        "v2.0",
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
def observation_datatypes(db: Session = Depends(get_db)):
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
def observation_keys(
    platform_types: str = Path(
        title="List of platform types (comma seperated).",
        examples=["argo,drifter,animal,mission,glider"],
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
def observation_values(
    platform_types: str = Path(
        title="List of platform types (comma seperated).",
        examples=["argo"],
    ),
    key: str = Path(
        title="Metadata key",
        examples=["Float unique identifier"],
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
def observation_tracktime(
    platform_id: str = Path(
        title="Platform ID.",
        examples=["1344"],
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
def observation_track(
    query: str = Path(
        title="List of key=value pairs, seperated by &",
        examples=["start_date=2019-01-01&end_date=2019-06-01&quantum=year"],
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for tracks. Used in ObservationSelector.
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split("&")]}
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
def observation_point(
    query: str = Path(
        title="List of key=value pairs, seperated by &",
        examples=[
            (
                "start_date=2019-01-01&end_date=2019-06-01&"
                + "datatype=sea_water_temperature"
            )
        ],
    ),
    db: Session = Depends(get_db),
):
    """
    Observational query for points. Used in ObservationSelector.
    """
    query_dict = {key: value for key, value in [q.split("=") for q in query.split("&")]}
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
def observation_meta(
    key: str = Path(
        title="Type/Platform of observation.",
        examples=["station"],
    ),
    id: str = Path(
        title="id of observation.",
        examples=["21831"],
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
def observation_variables(
    query: str = Path(
        title=" A key=value pair, where key is either station \
            or platform and value is the id.",
        examples=["station=356768"],
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
