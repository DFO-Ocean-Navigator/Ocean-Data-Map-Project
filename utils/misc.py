import datetime
import os
import re
import time
import xml.etree.ElementTree as ET
from operator import itemgetter

import cftime
import numpy as np
import pyproj
from flask import current_app
from netCDF4 import Dataset, chartostring
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


def drifter_meta():
    imei = {}
    wmo = {}
    deployment = {}

    with Dataset(current_app.config['DRIFTER_AGG_URL'], 'r') as ds:
        for idx, b in enumerate(ds.variables['buoy'][:]):
            bid = str(chartostring(b))[:-3]

            for data, key in [
                [imei, 'imei'],
                [wmo, 'wmo'],
                [deployment, 'deployment']
            ]:
                d = str(chartostring(ds.variables[key][idx][0]))
                if data.get(d) is None:
                    data[d] = [bid]
                else:
                    data[d].append(bid)

    return {
        'imei': imei,
        'wmo': wmo,
        'deployment': deployment,
    }


def observation_vars():
    result = []
    with Dataset(current_app.config["OBSERVATION_AGG_URL"], 'r') as ds:
        for v in sorted(ds.variables):
            if v in ['z', 'lat', 'lon', 'profile', 'time']:
                continue
            var = ds[v]
            if var.datatype == '|S1':
                continue

            result.append(var.long_name)
    return result


def observation_meta():
    with Dataset(current_app.config["OBSERVATION_AGG_URL"], 'r') as ds:
        ship = chartostring(ds['ship'][:])
        trip = chartostring(ds['trip'][:])

        data = {
            'ship': sorted(np.unique(ship).tolist()),
            'trip': sorted(np.unique(trip).tolist()),
        }

        return data


def observations(observation_id, projection, resolution, extent):
    selected_ships = None
    selected_trips = None
    for i in observation_id.split(";"):
        k, v = i.split(":")
        if k == "ship":
            selected_ships = v.split(",")
        elif k == "trip":
            selected_trips = v.split(",")

    proj = pyproj.Proj(init=projection)
    view = _get_view(extent)

    points = []
    with Dataset(current_app.config["OBSERVATION_AGG_URL"], 'r') as ds:
        lat = ds['lat'][:].astype(float)
        lon = ds['lon'][:].astype(float)
        profile = chartostring(ds['profile'][:])
        ship = None
        if 'ship' in ds.variables:
            ship = chartostring(ds['ship'][:])
            trip = chartostring(ds['trip'][:])
            cast = chartostring(ds['cast'][:])
            profile = np.array(
                ["%s %s %s" % tuple(stc)
                 for stc in np.array([ship,
                                      trip,
                                      cast
                                      ]).transpose()
                 ])

    for idx, name in enumerate(profile):
        x, y = proj(lon[idx], lat[idx])
        p = Point(y, x)

        if ship is not None:
            if selected_ships is not None and ship[idx] not in selected_ships:
                continue
            if selected_trips is not None and trip[idx] not in selected_trips:
                continue

        if view.envelope.intersects(p):
            points.append({
                'type': "Feature",
                'geometry': {
                    'type': "Point",
                    'coordinates': [lon[idx], lat[idx]]
                },
                'properties': {
                    'name': str(profile[idx]),
                    'observation': idx,
                    'type': 'point',
                    'resolution': 0,
                }
            })

    result = {
        'type': "FeatureCollection",
        'features': points,
    }
    return result


def drifters(drifter_id, projection, resolution, extent):
    buoy_id = []
    lat = []
    lon = []
    status = []

    if drifter_id in ['all', 'active', 'inactive', 'not responding']:
        c = Crawl(current_app.config['DRIFTER_CATALOG_URL'], select=[".*.nc$"])
        drifters = [d.name[:-3] for d in c.datasets]
    else:
        drifters = drifter_id.split(",")

    for d in drifters:
        with Dataset(current_app.config["DRIFTER_URL"] % d, 'r') as ds:
            if drifter_id == 'active' and ds.status != 'normal':
                continue
            elif drifter_id == 'inactive' and ds.status != 'inactive':
                continue
            elif drifter_id == 'not responding' and \
                    ds.status != 'not responding':
                continue
            buoy_id.append(ds.buoyid)
            lat.append(ds['latitude'][:])
            lon.append(ds['longitude'][:])
            status.append(ds.status)

    proj = pyproj.Proj(init=projection)
    view = _get_view(extent)

    res = []
    for i, bid in enumerate(buoy_id):
        x, y = proj(lon[i], lat[i])

        ls = LineString(list(zip(y, x)))
        if view.envelope.intersects(ls):
            path = np.array(ls.simplify(resolution * 1.5).coords)
            path = np.array(
                proj(path[:, 1], path[:, 0], inverse=True)).transpose()

            res.append({
                'type': "Feature",
                'geometry': {
                    'type': "LineString",
                    'coordinates': path.astype(float).tolist()
                },
                'properties': {
                    'name': bid,
                    'status': status[i],
                    'type': "drifter",
                    'resolution': resolution,
                }
            })

    result = {
        'type': "FeatureCollection",
        'features': res,
    }

    return result


def drifters_vars(drifter_id):
    drifters = drifter_id.split(",")

    res = []
    for d in drifters:
        with Dataset(current_app.config["DRIFTER_URL"] % d, 'r') as ds:
            a = []
            for name in ds.variables:
                if name in ["data_date", "sent_date", "received_date",
                            "latitude", "longitude"]:
                    continue

                if ds.variables[name].datatype == np.dtype("S1"):
                    continue

                var_info = {
                    'id': name,
                }
                if 'long_name' in ds.variables[name].ncattrs():
                    var_info['value'] = ds.variables[name].long_name
                else:
                    var_info['value'] = name

                a.append(var_info)

            res.append(a)

    if len(res) > 1:
        intersect = res[0]
        for i in range(1, len(res)):
            intersect = [x for x in res[i] if x in intersect]

        return sorted(intersect, key=lambda k: k['value'])
    elif len(res) == 1:
        return sorted(res[0], key=lambda k: k['value'])
    else:
        return []


def drifters_time(drifter_id):
    drifters = drifter_id.split(",")

    mins = []
    maxes = []
    for d in drifters:
        with Dataset(current_app.config["DRIFTER_URL"] % d, 'r') as ds:
            var = ds['data_date']
            ut = cftime.utime(var.units)
            mins.append(ut.num2date(var[:].min()))
            maxes.append(ut.num2date(var[:].max()))

    min_time = np.amin(mins)
    max_time = np.amax(maxes)

    return {
        'min': min_time.isoformat(),
        'max': max_time.isoformat(),
    }


def get_point_data(dataset, variable, time, depth, location):
    variables = variable.split(",")

    data = []
    names = []
    units = []
    dsc = DatasetConfig(dataset)
    with open_dataset(dsc) as ds:
        timestamp = ds.timestamps[time]
        for v in variables:
            d = ds.get_point(
                location[0],
                location[1],
                depth,
                time,
                v
            )
            variable_name = dsc.variable[ds.variables[v]].name
            variable_unit = dsc.variable[ds.variables[v]].unit

            data.append(d)
            names.append(variable_name)
            units.append(variable_unit)

    result = {
        'value': ['%s' % float('%.4g' % f) for f in data],
        'location': [round(f, 4) for f in location],
        'name': names,
        'units': units,
    }
    return result
