import copy
import json
import math
import re
from operator import itemgetter

import numpy as np

# from flask_babel import gettext
from shapely.geometry import LinearRing, MultiPolygon, Point, Polygon
from shapely.ops import cascaded_union

from data import open_dataset
from oceannavigator import DatasetConfig
from utils.errors import ClientError, ServerError
from utils.misc import list_areas


class Area:
    def __init__(self, query):
        self.area_query = copy.deepcopy(query.get("area"))


class Stats:
    def __init__(self, query):
        self.time = query.get("time")
        self.depth = query.get("depth")
        self.area = Area(query)
        self.names = copy.deepcopy(query.get("name"))

    def set_area(self, area):
        self.area = copy.deepcopy(area)

    def set_lons(self, lons):
        self.raw_lons = copy.deepcopy(lons)

    def split_area(self, divide_lon_line):
        self.inner_area = copy.deepcopy(self.area)
        self.outter_area = copy.deepcopy(self.area)
        for idx, a in enumerate(self.area.area_query):
            for idx2, lon in enumerate(self.raw_lons):

                if abs(lon) > abs(
                    divide_lon_line
                ):  # usally outside range of -180 to 180
                    self.inner_area.area_query[idx]["polygons"][0][idx2][
                        1
                    ] = divide_lon_line
                    self.outter_area.area_query[idx]["polygons"][0][idx2][
                        1
                    ] = convert_to_bounded_lon(lon)
                elif abs(lon) < abs(divide_lon_line):
                    self.outter_area.area_query[idx]["polygons"][0][idx2][
                        1
                    ] = -divide_lon_line

    def combine_stats(self):
        if (self.inner_area.stats[0]["variables"][0]["mean"] != "No Data") and (
            self.outter_area.stats[0]["variables"][0]["mean"] != "No Data"
        ):
            inner_num = int(self.inner_area.stats[0]["variables"][0]["num"])
            outter_num = int(self.outter_area.stats[0]["variables"][0]["num"])
            inner_mean = float(self.inner_area.stats[0]["variables"][0]["mean"])
            outter_mean = float(self.outter_area.stats[0]["variables"][0]["mean"])
            inner_median = float(self.inner_area.stats[0]["variables"][0]["median"])
            outer_median = float(self.outter_area.stats[0]["variables"][0]["median"])

            combined_area = copy.deepcopy(self.inner_area.stats)
            combined_area[0]["variables"][0]["num"] = inner_num + outter_num
            combined_area[0]["variables"][0]["min"] = min(
                self.inner_area.stats[0]["variables"][0]["min"],
                self.outter_area.stats[0]["variables"][0]["min"],
            )
            combined_area[0]["variables"][0]["max"] = max(
                self.inner_area.stats[0]["variables"][0]["max"],
                self.outter_area.stats[0]["variables"][0]["max"],
            )
            combined_area[0]["variables"][0]["mean"] = (
                (inner_mean * inner_num) + (outter_mean * outter_num)
            ) / (inner_num * outter_num)
            combined_area[0]["variables"][0][
                "median"
            ] = "Dateline error, could not compute"
            combined_num = int(combined_area[0]["variables"][0]["num"])
            combined_area[0]["variables"][0]["stddev"] = np.sqrt(
                (combined_area[0]["variables"][0]["mean"] ** 2) / combined_num
            )
            self.area.stats = combined_area
        elif self.inner_area.stats[0]["variables"][0]["mean"] == "No Data":
            self.area.stats = self.outter_area.stats
        else:
            self.area.stats = self.inner_area.stats

    def get_values(self, area_info, dataset_name, variables):
        config = DatasetConfig(dataset_name)
        with open_dataset(config) as dataset:

            if self.time is None or (type(self.time) == str and len(self.time) == 0):
                time = -1
            else:
                time = int(self.time)

            if time < 0:
                time += len(dataset.nc_data.timestamps)
            time = np.clip(time, 0, len(dataset.nc_data.timestamps) - 1)

            depth = 0
            depthm = 0

            if self.depth:
                if self.depth == "bottom":
                    depth = "bottom"
                    depthm = "Bottom"
                if len(self.depth) > 0 and self.depth != "bottom":
                    depth = int(self.depth)

                    depth = np.clip(depth, 0, len(dataset.depths) - 1)
                    depthm = dataset.depths[depth]

            lat, lon = np.meshgrid(
                np.linspace(area_info.bounds[0], area_info.bounds[2], 50),
                area_info.spaced_points,
            )

            output_fmtstr = "%6.5g"
            for v_idx, v in enumerate(variables):
                var = dataset.variables[v]

                variable_name = config.variable[var].name
                variable_unit = config.variable[var].unit

                lat, lon, d = dataset.get_raw_point(
                    lat.ravel(), lon.ravel(), depth, time, v
                )

                lon[np.where(lon > 180)] -= 360

                if len(var.dimensions) == 3:
                    variable_depth = ""
                elif depth == "bottom":
                    variable_depth = "(@ Bottom)"
                else:
                    variable_depth = "(@%d m)" % np.round(depthm)

                points = [Point(p) for p in zip(lat.values.ravel(), lon.values.ravel())]

                for i, a in enumerate(area_info.area_query):
                    indices = np.where(
                        map(
                            lambda p, poly=area_info.area_polys[i]: poly.contains(p),
                            points,
                        )
                    )

                    selection = np.ma.array(d.values.ravel()[indices])
                    if len(selection) > 0 and not selection.mask.all():
                        area_info.output[i]["variables"].append(
                            {
                                "name": (
                                    "%s %s" % (variable_name, variable_depth)
                                ).strip(),
                                "unit": variable_unit,
                                "min": output_fmtstr
                                % (np.ma.amin(selection).astype(float)),
                                "max": output_fmtstr
                                % (np.ma.amax(selection).astype(float)),
                                "mean": output_fmtstr
                                % (np.ma.mean(selection).astype(float)),
                                "median": output_fmtstr
                                % (np.ma.median(selection).astype(float)),
                                "stddev": output_fmtstr
                                % (np.ma.std(selection).astype(float)),
                                "num": "%d" % selection.count(),
                            }
                        )
                    else:
                        area_info.output[i]["variables"].append(
                            {
                                "name": (
                                    "%s %s" % (variable_name, variable_depth)
                                ).strip(),
                                "unit": variable_unit,
                                "min": "No Data",  # gettext("No Data"),
                                "max": "No Data",  # gettext("No Data"),
                                "mean": "No Data",  # gettext("No Data"),
                                "median": "No Data",  # gettext("No Data"),
                                "stddev": "No Data",  # gettext("No Data"),
                                "num": "0",
                            }
                        )
                        ClientError(
                            # gettext(
                            "there are no datapoints in the area you selected. \
                            you may have selected a area on land or you may \
                            have an ara that is smallenough to fit between \
                            the datapoints try selection a different area or \
                            a larger area"
                            # )
                        )

            area_info.stats = area_info.output
            return

        raise ServerError(
            # gettext(
            "An Error has occurred. When opening the dataset. \
                Please try again or try a different dataset. \
                If you would like to report this error please \
                contact oceandatamap@gmail.com"
            # )
        )


def get_names_rings(area):
    names = []
    all_rings = []

    for idx, a in enumerate(area):
        rings = [LinearRing(p) for p in a["polygons"]]
        if len(rings) > 1:
            u = cascaded_union(rings)
        else:
            u = rings[0]
        all_rings.append(u.envelope)
        if a.get("name"):
            names.append(a.get("name"))

    names = sorted(names)

    return names, all_rings


def convert_to_bounded_lon(lon):
    if math.degrees(math.sin(math.radians(lon))) < 0:
        bounded_lon = (lon % 180) - 180
    elif abs(lon) != 180:
        bounded_lon = lon % 180
    else:
        bounded_lon = lon
    return bounded_lon


def compute_bounds(all_rings):
    if len(all_rings) > 1:
        combined = cascaded_union(all_rings)
    else:
        combined = all_rings[0]

    combined = combined.envelope
    bounds_not_wrapped = copy.deepcopy(combined.bounds)
    bounds = (
        bounds_not_wrapped[0],
        convert_to_bounded_lon(bounds_not_wrapped[1]),
        bounds_not_wrapped[2],
        convert_to_bounded_lon(bounds_not_wrapped[3]),
    )
    return bounds


def fill_polygons(area):
    area_polys = []
    output = []
    for a in area:
        rings = [LinearRing(p) for p in a["polygons"]]
        innerrings = [LinearRing(p) for p in a["innerrings"]]

        polygons = []
        for r in rings:
            inners = []
            for ir in innerrings:
                if r.contains(ir):
                    inners.append(ir)

            polygons.append(Polygon(r, inners))

        area_polys.append(MultiPolygon(polygons))

        output.append(
            {
                "name": a.get("name"),
                "variables": [],
            }
        )

    return area_polys, output


def wrap_computer_stats(query, dataset_name, lon_values):

    # determine east or west wrap
    if any(p > 180 for p in lon_values):  # points to the east of the east dateline
        wrap_val = 180
    elif any(p < -180 for p in lon_values):  # points to the west of the west dateline
        wrap_val = -180
    else:
        raise ClientError(
            # gettext(
            "something went wrong. It seems you are trying to create a plot across \
            the international date line. While we do support this function it must \
            be done within 360 deg of the default map view. Try refreshing the page \
            and try again"
            # )
        )

    variables = query.get("variable")

    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(",")

    area_data = Stats(query)
    area_data.set_lons(lon_values)

    area_data.split_area(wrap_val)

    area_data.names, area_data.inner_area.all_rings = get_names_rings(
        area_data.inner_area.area_query
    )
    _, area_data.outter_area.all_rings = get_names_rings(
        area_data.outter_area.area_query
    )

    area_data.inner_area.bounds = compute_bounds(area_data.inner_area.all_rings)
    area_data.outter_area.bounds = compute_bounds(area_data.outter_area.all_rings)

    area_data.inner_area.area_polys, area_data.inner_area.output = fill_polygons(
        area_data.inner_area.area_query
    )
    area_data.outter_area.area_polys, area_data.outter_area.output = fill_polygons(
        area_data.outter_area.area_query
    )

    area_data.inner_area.width = (
        area_data.inner_area.bounds[3] - area_data.inner_area.bounds[1]
    )
    area_data.outter_area.width = (
        area_data.outter_area.bounds[3] - area_data.outter_area.bounds[1]
    )

    spacing = math.floor(
        (
            area_data.inner_area.width
            / (area_data.inner_area.width + area_data.outter_area.width)
        )
        * 50
    )
    area_data.inner_area.spaced_points = np.linspace(
        area_data.inner_area.bounds[1], area_data.inner_area.bounds[3], spacing
    )
    area_data.outter_area.spaced_points = np.linspace(
        area_data.outter_area.bounds[1], area_data.outter_area.bounds[3], 50 - spacing
    )

    area_data.get_values(area_data.inner_area, dataset_name, variables)
    area_data.get_values(area_data.outter_area, dataset_name, variables)
    area_data.combine_stats()

    if int(area_data.area.stats[0]["variables"][0]["num"]) == 0:
        raise ClientError(
            # gettext(
            "there are no datapoints in the area you selected. \
            You may have selected a area on land or you may \
            have an ara that is too small. \
            Try selection a different area or \
            a larger area"
            # )
        )
    return json.dumps(sorted(area_data.area.stats, key=itemgetter("name")))


def computer_stats(area, query, dataset_name):
    area_data = Stats(query)
    lon_values = []
    for p in area_data.area.area_query[0]["polygons"][0]:
        p[1] = convert_to_bounded_lon(p[1])
        lon_values.append(p[1])
    area_data.set_lons(lon_values)

    variables = query.get("variable")
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(",")

    area_data.names, area_data.area.all_rings = get_names_rings(
        area_data.area.area_query
    )
    area_data.area.bounds = compute_bounds(area_data.area.all_rings)
    area_data.area.area_polys, area_data.area.output = fill_polygons(
        area_data.area.area_query
    )
    area_data.area.spaced_points = np.linspace(
        area_data.area.bounds[1], area_data.area.bounds[3], 50
    )

    area_data.get_values(area_data.area, dataset_name, variables)

    if int(area_data.area.stats[0]["variables"][0]["num"]) == 0:
        raise ClientError(
            # gettext(
            "there are no datapoints in the area you selected. \
            You may have selected a area on land or you may \
            have an ara that is too small. \
            Try selection a different area or \
            a larger area"
            # )
        )
    return json.dumps(sorted(area_data.area.stats, key=itemgetter("name")))


def stats(dataset_name, query):
    try:
        area = query.get("area")
        data = None

        for idx, a in enumerate(area):
            if isinstance(a, str):
                sp = a.split("/", 1)
                if data is None:
                    data = list_areas(sp[0], simplify=False)

                b = [x for x in data if x.get("key") == a]
                a = b[0]
                area[idx] = a

        points_lat = []
        for p in area[0]["polygons"][0]:
            points_lat.append(p[1])
    except Exception as e:
        raise ServerError(
            # gettext(
            "Unknown Error: you have tried something that we did not expect. \
                                Please try again or try something else. If you would like to report \
                                this error please contact oceandatamap@gmail.com. "
            # )
            + str(e)
        )

    if (max(points_lat) - min(points_lat)) > 360:
        raise ClientError(
            # gettext(
            "Error: you are trying to create a plot that is wider than the world. \
        The desired information is ambiguous please select a smaller area and try again"
            # )
        )
    elif any((p > 180 or p < -180) for p in points_lat) and any(
        -180 <= p <= 180 for p in points_lat
    ):  # if there area points on both sides of the date line
        return wrap_computer_stats(query, dataset_name, points_lat)
    else:  # no world wrap
        return computer_stats(area, query, dataset_name)

    raise ServerError(
        # gettext(
        "Unknown Error: you have tried something that we did \
        not expect. Please try again or try something else. \
        If you would like to report this error please contact \
        oceandatamap@gmail.com"
        # )
    )
