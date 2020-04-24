import datetime
import os
import re
import time
import xml.etree.ElementTree as ET
from operator import itemgetter

import numpy as np
import pyproj
from flask import current_app
from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.multipolygon import MultiPolygon
from shapely.geometry.polygon import LinearRing

from data import open_dataset
from oceannavigator import DatasetConfig


def list_kml_files(subdir):
    DIR = os.path.join(current_app.config['OVERLAY_KML_DIR'], subdir)

    files = []
    for f in os.listdir(DIR):
        name = None
        if not f.endswith(".kml"):
            continue
        root = ET.parse(DIR + "/" + f).getroot()
        nsmap = root.tag.split("}", 1)[0] + "}"
        for folder in root.iter(nsmap + "Folder"):
            for filename in folder.iter(nsmap + "name"):
                name = filename.text
                break
        entry = {
            'name': name,
            'id': f[:-4]
        }

        files.append(entry)

    return sorted(files, key=itemgetter('name'))


def _get_view(extent):
    extent = list(map(float, extent.split(",")))
    view = LinearRing([
        (extent[1], extent[0]),
        (extent[3], extent[0]),
        (extent[3], extent[2]),
        (extent[1], extent[2])
    ])
    return view


def _get_kml(subdir, file_id):
    DIR = os.path.join(current_app.config['OVERLAY_KML_DIR'], subdir)
    f = os.path.join(DIR, "%s.kml" % file_id)
    folder = None
    root = ET.parse(f).getroot()
    for doc in root:
        if "Document" in doc.tag:
            for folder in doc:
                if "Folder" in folder.tag:
                    break
    nsmap = root.tag.split("}", 1)[0] + "}"
    return folder, nsmap


def points(file_id, projection, resolution, extent):
    proj = pyproj.Proj(init=projection)
    view = _get_view(extent)
    folder, nsmap = _get_kml('point', file_id)
    points = []
    name = None

    for child in folder.iter():
        if "name" in child.tag:
            name = child.text
        if "coordinates" in child.tag:
            c_txt = child.text
            lonlat = list(map(float, c_txt.split(',')))
            x, y = proj(lonlat[0], lonlat[1])
            p = Point(y, x)

            if view.envelope.intersects(p):
                points.append({
                    'type': "Feature",
                    'geometry': {
                        'type': "Point",
                        'coordinates': lonlat,
                    },
                    'properties': {
                        'name': name,
                        'type': 'point',
                        'resolution': 0,
                    }
                })

    result = {
        'type': "FeatureCollection",
        'features': points,
    }
    return result


def lines(file_id, projection, resolution, extent):
    proj = pyproj.Proj(init=projection)
    view = _get_view(extent)
    folder, nsmap = _get_kml('line', file_id)
    lines = []
    name = None

    for child in folder.iter():
        coords = []
        if "name" in child.tag:
            name = child.text
        if "coordinates" in child.tag:
            c_txt = child.text
            for point_txt in c_txt.split():
                lonlat = point_txt.split(',')
                coords.append(list(map(float, lonlat)))

            coords = np.array(coords)

            x, y = proj(coords[:, 0], coords[:, 1])
            ls = LineString(list(zip(y, x)))

            if view.envelope.intersects(ls):
                lines.append({
                    'type': "Feature",
                    'geometry': {
                        'type': "LineString",
                        'coordinates': coords.astype(float).tolist()
                    },
                    'properties': {
                        'name': name,
                        'type': 'line',
                        'resolution': 0,
                    }
                })

    result = {
        'type': "FeatureCollection",
        'features': lines,
    }
    return result


def list_areas(file_id, simplify=True):
    AREA_DIR = os.path.join(current_app.config['OVERLAY_KML_DIR'], 'area')

    areas = []
    f = os.path.join(AREA_DIR, "%s.kml" % file_id)
    folder = ET.parse(f).getroot()
    nsmap = folder.tag.split("}", 1)[0] + "}"

    def get_coords(path):
        result = []
        for bound in place.iter(nsmap + path):
            for c in bound.iter(nsmap + "coordinates"):
                tuples = c.text.split(' ')
                coords = []
                for tup in tuples:
                    tup = tup.strip()
                    if not tup:
                        continue
                    lonlat = tup.split(',')
                    coords.append([float(lonlat[1]), float(lonlat[0])])

                if simplify:
                    coords = list(LinearRing(coords).simplify(1.0 / 32).coords)

                result.append(coords)

        return result

    for place in folder.iter(nsmap + "Placemark"):
        outers = get_coords("outerBoundaryIs")
        inners = get_coords("innerBoundaryIs")

        name = None
        for placename in place.iter(nsmap + "name"):
            name = placename.text
        centroids = [LinearRing(x).centroid for x in outers]
        areas.append({
            'name': name,
            'polygons': outers,
            'innerrings': inners,
            'centroids': [(c.y, c.x) for c in centroids],
            'key': file_id + "/" + name,
        })

    areas = sorted(areas, key=lambda k: k['name'])

    return areas


def areas(area_id, projection, resolution, extent):
    AREA_DIR = os.path.join(current_app.config['OVERLAY_KML_DIR'], 'area')
    folder = ET.parse(AREA_DIR + "/" + area_id + ".kml").getroot()
    nsmap = folder.tag.split("}", 1)[0] + "}"

    proj = pyproj.Proj(init=projection)
    view = _get_view(extent)
    areas = []

    for place in folder.iter(nsmap + "Placemark"):
        for name in place.iter(nsmap + "name"):
            pname = name.text
        polys = []

        for p in place.iter(nsmap + "Polygon"):
            for outer in p.iter(nsmap + "outerBoundaryIs"):
                for coords in outer.iter(nsmap + "coordinates"):
                    lonlat = np.array(
                        [c.split(',') for c in coords.text.split()]
                    ).astype(float)
                    ox, oy = proj(lonlat[:, 0], lonlat[:, 1])
            holes = []
            for inner in p.iter(nsmap + "innerBoundaryIs"):
                for coords in inner.iter(nsmap + "coordinates"):
                    lonlat_inner = np.array(
                        [c.split(',') for c in coords.text.split()]
                    ).astype(float)
                    ix, iy = proj(lonlat_inner[:, 0], lonlat_inner[:, 1])
                    holes.append(list(zip(iy, ix)))

            polys.append(Polygon(list(zip(oy, ox)), holes))

        mp = MultiPolygon(polys).simplify(resolution * 1.5)

        def get_coordinates(poly):
            out = np.array(poly.exterior.coords)
            out = np.array(proj(out[:, 1], out[:, 0],
                                inverse=True)).transpose().tolist()
            coords = [out]
            for i in poly.interiors:
                inn = np.array(i.coords)
                coords.append(
                    np.array(proj(inn[:, 0], inn[:, 1],
                                  inverse=True)).transpose().tolist())
            return coords

        if view.envelope.intersects(mp):
            coordinates = []
            if isinstance(mp, MultiPolygon):
                for p in mp.geoms:
                    coordinates.append(get_coordinates(p))
            else:
                coordinates.append(get_coordinates(mp))

            areas.append({
                'type': "Feature",
                'geometry': {
                    'type': "MultiPolygon",
                    'coordinates': coordinates,
                },
                'properties': {
                    'name': pname,
                    'type': "area",
                    'resolution': resolution,
                    'key': "%s/%s" % (area_id,
                                      pname),
                    'centroid': proj(mp.centroid.y, mp.centroid.x,
                                     inverse=True),
                },
            })

    result = {
        'type': "FeatureCollection",
        'features': areas,
    }

    return result


def get_point_data(dataset, variable, time, depth, location):
    variables = variable.split(",")

    data = []
    names = []
    units = []
    dsc = DatasetConfig(dataset)
    with open_dataset(dsc) as ds:
        for v in variables:
            d = ds.get_point(
                location[0],
                location[1],
                depth,
                v,
                time
            )
            variable_name = dsc.variable[ds.variables[v]].name
            variable_unit = dsc.variable[ds.variables[v]].unit

            data.append(d)
            names.append(variable_name)
            units.append(variable_unit)

    result = {
        'value': [f'{float(f):.4g}' for f in data],
        'location': [round(f, 4) for f in location],
        'name': names,
        'units': units,
    }
    return result
