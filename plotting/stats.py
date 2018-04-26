import numpy as np
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url, get_variable_scale_factor
from shapely.geometry import LinearRing, Polygon, MultiPolygon, Point
from shapely.ops import cascaded_union
from oceannavigator.misc import list_areas
import json
from operator import itemgetter
import re
from flask_babel import gettext
from data import open_dataset
import math
import copy
from oceannavigator.errors import ClientError, ServerError

def get_values(opened_dataset, dataset_name, lon_spacing, bounds, variables, depth, time, area, depthm, area_polys, output):
    
    lat, lon = np.meshgrid(
        np.linspace(bounds[0], bounds[2], 50),
        lon_spacing
    )
    print "lenther of: lat, lon:  " + str(len(lat)) + ", " + str(len(lon))
    print "____lon:  " + ", " + str(lon)

    output_fmtstr = "%6.5g"
    for v_idx, v in enumerate(variables):
        var = opened_dataset.variables[v]

        variable_name = get_variable_name(dataset_name, var)
        variable_unit = get_variable_unit(dataset_name, var)
        scale_factor = get_variable_scale_factor(dataset_name, var)

        lat, lon, d = opened_dataset.get_raw_point(
            lat.ravel(),
            lon.ravel(),
            depth,
            time,
            v
        )

        if scale_factor != 1.0:
            d = np.multiply(d, scale_factor)

        if variable_unit.startswith("Kelvin"):
            variable_unit = "Celsius"
            d = d - 273.15

        lon[np.where(lon > 180)] -= 360

        if len(var.dimensions) == 3:
            variable_depth = ""
        elif depth == 'bottom':
            variable_depth = "(@ Bottom)"
        else:
            variable_depth = "(@%d m)" % np.round(depthm)

        points = [Point(p) for p in zip(lat.ravel(), lon.ravel())]
        print "len points: " + str(len(points))
        print "area: " + str(area)
        for i, a in enumerate(area):
            print "i, a: " + str(i) + ", " + str(a)
            indices = np.where(
                map(
                    lambda p, poly=area_polys[i]: poly.contains(p),
                    points
                )
            )
            print "indices____ : " + str(indices)

            selection = np.ma.array(d.ravel()[indices])
            print " len(selection): " + str(len(selection))
            if len(selection) > 0 and not selection.mask.all():
                output[i]['variables'].append({
                    'name': ("%s %s" % (variable_name,
                                        variable_depth)).strip(),
                    'unit': variable_unit,
                    'min': output_fmtstr % (
                        np.ma.amin(selection).astype(float)
                    ),
                    'max': output_fmtstr % (
                        np.ma.amax(selection).astype(float)
                    ),
                    'mean': output_fmtstr % (
                        np.ma.mean(selection).astype(float)
                    ),
                    'median': output_fmtstr % (
                        np.ma.median(selection).astype(float)
                    ),
                    'stddev': output_fmtstr % (
                        np.ma.std(selection).astype(float)
                    ),
                    'num': "%d" % selection.count(),
                })
            else:
                output[i]['variables'].append({
                    'name': ("%s %s" % (variable_name,
                                        variable_depth)).strip(),
                    'unit': variable_unit,
                    'min': gettext("No Data"),
                    'max': gettext("No Data"),
                    'mean': gettext("No Data"),
                    'median': gettext("No Data"),
                    'stddev': gettext("No Data"),
                    'num': "0",
                })
    return output


def combine(area1, area2):
    print "area1: " + str( float(area1[0]['variables'][0]['num']))
    print "area2: " + str( float(area2[0]['variables'][0]['num']))
    t1 = int(area1[0]['variables'][0]['num'])
    t2 = int(area2[0]['variables'][0]['num'])
    t3 = float(area1[0]['variables'][0]['mean'])
    t4 = float(area2[0]['variables'][0]['mean'])
    median1 = float(area1[0]['variables'][0]['median'])
    median2 = float(area2[0]['variables'][0]['median'])
    
    print "type area2[0]['variables'][0]['mean']: " + str(type(area2[0]['variables'][0]['mean']))
    combined_area = copy.copy(area1)
    combined_area[0]['variables'][0]['num'] = t1 +  t2
    combined_area[0]['variables'][0]['min'] = min(area1[0]['variables'][0]['min'],  area2[0]['variables'][0]['min'])
    combined_area[0]['variables'][0]['max'] = max(area1[0]['variables'][0]['max'],  area2[0]['variables'][0]['max'])
    combined_area[0]['variables'][0]['mean'] = ((t3*t1)+(t4*t2))/(t1*t2)
    combined_area[0]['variables'][0]['median'] = "about " + str((median1+median2)/2)
    temp5 = int(combined_area[0]['variables'][0]['num'])
    combined_area[0]['variables'][0]['stddev'] = np.sqrt((combined_area[0]['variables'][0]['mean']**2)/temp5)
    return combined_area  

def convert_to_bounded_lon(lon):
    if (math.degrees(math.sin(math.radians(lon)))<0):
        bounded_lon = ((lon%180)-180)
    else:
        bounded_lon = (lon%180)
    return bounded_lon

def computer_wrap_stats(area, query, dataset_name):
    #determ left east or west wrap
    if any(p > 180 for p in area[0]['polygons'][0][:][1]): #points to the east of the east dateline 
        i=1
    elif any(p < -180 for p in area[0]['polygons'][0][:][1]): #points to the west of the west dateline 
        j=2
    else:
        raise ClientError(gettext("someing went wrong. te seems you trying to creat a plot across the internatinal date line." + 
                                "While we do support this function it must be done within 360 deg of the defalut map view. Try refreshing the page and try again"))
    

    #conbine
    return "null"

def computer_stats(area, query, dataset_name):
    variables = query.get('variable')
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

    variables = [re.sub('_anom$', '', v) for v in variables]
    names = None
    data = None

    names = []
    all_rings = []
    for idx, a in enumerate(area):
        for idx_2, points in enumerate(a['polygons']):
            a['polygons'][idx_2] = map(lambda point: [point[0], convert_to_bounded_lon(point[1])], points)
        if isinstance(a, str) or isinstance(a, unicode):
            a = a.encode("utf-8")
            sp = a.split('/', 1)
            if data is None:
                data = list_areas(sp[0])

            b = [x for x in data if x.get('key') == a]
            a = b[0]
            area[idx] = a

        rings = [LinearRing(p) for p in a['polygons']]
        if len(rings) > 1:
            u = cascaded_union(rings)
        else:
            u = rings[0]
        all_rings.append(u.envelope)
        if a.get('name'):
            names.append(a.get('name'))

    names = sorted(names)

    if len(all_rings) > 1:
        combined = cascaded_union(all_rings)
    else:
        combined = all_rings[0]

    combined = combined.envelope
    bounds_not_wrapped = copy.copy(combined.bounds)
    bounds=(bounds_not_wrapped[0], convert_to_bounded_lon(bounds_not_wrapped[1]), bounds_not_wrapped[2], convert_to_bounded_lon(bounds_not_wrapped[3]))
    area_polys = []
    output = []
    for a in area:
        rings = [LinearRing(p) for p in a['polygons']]
        innerrings = [LinearRing(p) for p in a['innerrings']]

        polygons = []
        for r in rings:
            inners = []
            for ir in innerrings:
                if r.contains(ir):
                    inners.append(ir)

            polygons.append(Polygon(r, inners))

        area_polys.append(MultiPolygon(polygons))

        output.append({
            'name': a.get('name'),
            'variables': [],
        })

    with open_dataset(get_dataset_url(dataset_name)) as dataset:
        if query.get('time') is None or (type(query.get('time')) == str and
                                        len(query.get('time')) == 0):
            time = -1
        else:
            time = int(query.get('time'))

        if time < 0:
            time += len(dataset.timestamps)
        time = np.clip(time, 0, len(dataset.timestamps) - 1)

        depth = 0
        depthm = 0

        if query.get('depth'):
            if query.get('depth') == 'bottom':
                depth = 'bottom'
                depthm = 'Bottom'
            if len(query.get('depth')) > 0 and \
                    query.get('depth') != 'bottom':
                depth = int(query.get('depth'))

                depth = np.clip(depth, 0, len(dataset.depths) - 1)
                depthm = dataset.depths[depth]

        stats = get_values(dataset, dataset_name, np.linspace(bounds[1], bounds[3], 50), bounds, variables, depth, time, area, depthm, area_polys, output)
        return json.dumps(sorted(stats, key=itemgetter('name')))
    raise ServerError(gettext("An Error has occored. When oping the dataset. Please try again or try a different dataset. If you would like to report this error please contact oceandatamap@gmail.com"))


def stats(dataset_name, query):
    print "===================================================================================="
    print "query:" + str(query)

    area = query.get('area')
    print "area : " + str(area) 
    points_lat = area[0]['polygons'][0][:][1]
    if (max(points_lat)-min(points_lat))>360:
        ClientError(gettext("Error: you are trying to create a plot that is wider than the world. The desired information is ambiguous please select a smaller area and try again"))
    elif any((p > 180 or p < -180) and (-180 <= p <= 180) for p in area[0]['polygons'][0][:][1]): #if there area points on both sides of the date line
        world_wrap = True 
        print "_______________________world wrap true_________________________________" 
        return computer_stats(area, query, dataset_name)
    else: # all(-180 <= p <= 180 for p in area[0]['polygons'][0][:][1]):
        print "_______________________*world wrap false*_________________________________"
        world_wrap = False
        return computer_stats(area, query, dataset_name)   
    #else:
    #    print "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! Error"
    ServerError(gettext("Unknow Error: you have tried something that we did not expect. Please try again or try something else. If you would like to report this error please contact oceandatamap@gmail.com")) 
