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

class Area:
    def __init__(self, query):
        print "constructer called, query is : " + str(query)
        self.area_query = copy.deepcopy(query.get('area'))

class Stats:
    def __init__(self, query, lons):
        print "constructer called, query is : " + str(query)
        self.area = Area(query)
        #self.oldname = "asfa"
        #self.area.bounds = []
        #self.area.all_rings = []
        self.variable = copy.deepcopy(query.get('variables'))
        self.names = copy.deepcopy(query.get('name')) 
        self.raw_lons = copy.deepcopy(lons)


    
    def set_area(self, area):
        self.area=copy.deepcopy(area)
    
    def split_area(self, divide_lon_line):
        self.test = "test"
        self.inner_area=copy.deepcopy(self.area)
        self.outter_area=copy.deepcopy(self.area)
        for idx, a in enumerate(self.area.area_query):
            print "idx: " + str(idx)
            print "a: " + str(a)
            for idx2, lon  in enumerate(self.raw_lons):
                print "idx2: " + str(idx2)
                print "lon: " + str(lon)

                if abs(lon) > abs(divide_lon_line): # outside range of -180 to 180
                    print "setting inner_area val"
                    self.inner_area.area_query[idx]['polygons'][0][idx2][1] = divide_lon_line
                    self.outter_area.area_query[idx]['polygons'][0][idx2][1] = convert_to_bounded_lon(lon)
                elif abs(lon) < abs(divide_lon_line):
                    print "setting outter_area val"
                    self.outter_area.area_query[idx]['polygons'][0][idx2][1] = -divide_lon_line
    
    def combine_stats(self):
        print "self.inner_area.stats[0]['variables'][0]['mean']: " + str(type(self.inner_area.stats[0]['variables'][0]['mean'])) + ", " + str(self.inner_area.stats[0]['variables'][0]['mean'])
        print "u'No Data': " + str(type(u'No Data'))
        print "self.outter_area.stats[0]['variables'][0]['mean']: " + str(self.outter_area.stats[0]['variables'][0]['mean'])
        if self.inner_area.stats[0]['variables'][0]['mean'] == u'No Data':
            print "____inner = no data"
        else:
            print "____inner != no data"
        if self.outter_area.stats[0]['variables'][0]['mean'] == u'No Data':
            print "____outter_area = no data"
        else:
            print "____outter_area != no data"
        if (self.inner_area.stats[0]['variables'][0]['mean'] != u'No Data') and (self.outter_area.stats[0]['variables'][0]['mean'] != u'No Data'):
            print "self.inner_area.stats[0]: " + str(self.inner_area.stats[0])
            print "self.inner_area.stats: " + str( float(self.inner_area.stats[0]['variables'][0]['num']))
            print "self.outter_area.stats: " + str( float(self.outter_area.stats[0]['variables'][0]['num']))
            t1 = int(self.inner_area.stats[0]['variables'][0]['num'])
            t2 = int(self.outter_area.stats[0]['variables'][0]['num'])
            t3 = float(self.inner_area.stats[0]['variables'][0]['mean'])
            t4 = float(self.outter_area.stats[0]['variables'][0]['mean'])
            median1 = float(self.inner_area.stats[0]['variables'][0]['median'])
            median2 = float(self.outter_area.stats[0]['variables'][0]['median'])
            
            print "type self.outter_area.stats[0]['variables'][0]['mean']: " + str(type(self.outter_area.stats[0]['variables'][0]['mean']))
            combined_area = copy.deepcopy(self.inner_area.stats)
            combined_area[0]['variables'][0]['num'] = t1 +  t2
            combined_area[0]['variables'][0]['min'] = min(self.inner_area.stats[0]['variables'][0]['min'],  self.outter_area.stats[0]['variables'][0]['min'])
            combined_area[0]['variables'][0]['max'] = max(self.inner_area.stats[0]['variables'][0]['max'],  self.outter_area.stats[0]['variables'][0]['max'])
            combined_area[0]['variables'][0]['mean'] = ((t3*t1)+(t4*t2))/(t1*t2)
            combined_area[0]['variables'][0]['median'] = "about " + str((median1+median2)/2)
            temp5 = int(combined_area[0]['variables'][0]['num'])
            combined_area[0]['variables'][0]['stddev'] = np.sqrt((combined_area[0]['variables'][0]['mean']**2)/temp5)
            self.area.stats = combined_area
        elif (self.inner_area.stats[0]['variables'][0]['mean'] == "No Data"):
            print "!!!!!!!!!!!!! no points inside" 
            self.area.stats = self.outter_area.stats
        else:
            print "!!!!!!!!!!!!! no points outside" 
            self.area.stats = self.inner_area.stats
        

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

def get_names_rings(area):
    names = []
    all_rings =[]
    data = None

    for idx, a in enumerate(area):
        if isinstance(a, str) or isinstance(a, unicode):
            a = a.encode("utf-8")
            sp = a.split('/', 1)
            if data is None:
                data = list_areas(sp[0])

            b = [x for x in data if x.get('key') == a]
            a = b[0]
            area[idx] = a

    print "area: " + str(area)

    rings = [LinearRing(p) for p in a['polygons']]
    if len(rings) > 1:
        u = cascaded_union(rings)
    else:
        u = rings[0]
    all_rings.append(u.envelope)
    if a.get('name'):
        names.append(a.get('name'))

    names = sorted(names)
    
    return names, all_rings

def convert_to_bounded_lon(lon):
    if (math.degrees(math.sin(math.radians(lon)))<0):
        bounded_lon = ((lon%180)-180)
    else:
        bounded_lon = (lon%180)
    return bounded_lon

def compute_bounds(all_rings):  
    if len(all_rings) > 1:
        combined = cascaded_union(all_rings)
    else:
        combined = all_rings[0]

    combined = combined.envelope
    bounds_not_wrapped = copy.deepcopy(combined.bounds)
    print "bounds_not_wrapped: " + str(bounds_not_wrapped)  
    bounds=(bounds_not_wrapped[0], convert_to_bounded_lon(bounds_not_wrapped[1]), bounds_not_wrapped[2], convert_to_bounded_lon(bounds_not_wrapped[3]))
    return bounds

def fill_polygons(area):
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

    return area_polys, output


def computer_wrap_stats(area, query, dataset_name, lon_valuse):
    #determ left east or west wrap
    if any(p > 180 for p in lon_valuse): #points to the east of the east dateline 
        print "_ there are points to the east of the east dateline"
        wrap_val=180
    elif any(p < -180 for p in lon_valuse): #points to the west of the west dateline
        print "_ there are points to the west of the west dateline" 
        wrap_val=-180
    else:
        print "!!!!!!!!!Error raised"
        raise ClientError(gettext("someing went wrong. te seems you trying to creat a plot across the internatinal date line." + 
                                "While we do support this function it must be done within 360 deg of the defalut map view. Try refreshing the page and try again"))
    
    variables = query.get('variable')

    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')
    
    new_area = Stats(query, lon_valuse)
    #new_area = stats_area(query, lon_valuse)
    new_area.split_area(wrap_val)
    print "inner_area: " + str(new_area.inner_area.area_query)
    print "outter_area: " + str(new_area.outter_area.area_query)

    variables = [re.sub('_anom$', '', v) for v in variables]
    
    new_area.names = "me"
    new_area.new_name = "metoo"

    new_area.names, new_area.inner_area.all_rings = get_names_rings(new_area.inner_area.area_query)
    _, new_area.outter_area.all_rings = get_names_rings(new_area.outter_area.area_query)

    new_area.inner_area.bounds = compute_bounds(new_area.inner_area.all_rings)
    new_area.outter_area.bounds = compute_bounds(new_area.outter_area.all_rings)

    new_area.inner_area.area_polys, new_area.inner_area.output = fill_polygons(new_area.inner_area.area_query)
    new_area.outter_area.area_polys, new_area.outter_area.output = fill_polygons(new_area.outter_area.area_query)
    
    print "________open dataset__________"
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

        #stats = get_values(dataset, dataset_name, np.linspace(bounds[1], bounds[3], 50), bounds, variables, depth, time, area, depthm, area_polys, output)

        new_area.inner_area.stats = get_values(dataset, dataset_name, np.linspace(new_area.inner_area.bounds[1], new_area.inner_area.bounds[3], 50), new_area.inner_area.bounds, variables, depth, time, new_area.inner_area.area_query, depthm, new_area.inner_area.area_polys, new_area.inner_area.output)
        new_area.outter_area.stats =  get_values(dataset, dataset_name, np.linspace(new_area.inner_area.bounds[1], new_area.inner_area.bounds[3], 50), new_area.inner_area.bounds, variables, depth, time, new_area.outter_area.area_query, depthm, new_area.outter_area.area_polys, new_area.outter_area.output)
        new_area.combine_stats()



    

    #conbine
    print "stats: " + str(new_area.area.stats)
    print "_______________________end of world wrap true_________________________________" 
    return json.dumps(sorted(new_area.area.stats, key=itemgetter('name')))

def computer_stats(area, query, dataset_name):
    variables = query.get('variable')
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

    variables = [re.sub('_anom$', '', v) for v in variables]

    names, all_rings = get_names_rings(area)
    #for idx, a in enumerate(area):
    #    for idx_2, points in enumerate(a['polygons']):
    #        a['polygons'][idx_2] = map(lambda point: [point[0], convert_to_bounded_lon(point[1])], points)
    #    if isinstance(a, str) or isinstance(a, unicode):
    #        a = a.encode("utf-8")
    #        sp = a.split('/', 1)
    #        if data is None:
    #            data = list_areas(sp[0])
    #   
    #        b = [x for x in data if x.get('key') == a]
    #        a = b[0]
    #        area[idx] = a
    #
    #    rings = [LinearRing(p) for p in a['polygons']]
    #    if len(rings) > 1:
    #        u = cascaded_union(rings)
    #    else:
    #        u = rings[0]
    #    all_rings.append(u.envelope)
    #    if a.get('name'):
    #        names.append(a.get('name'))

    bounds = compute_bounds(all_rings)

    area_polys, output = fill_polygons(area)

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
        print "stats: " + str(stats)
        print "_______________________end of world wrap false_________________________________" 
        return json.dumps(sorted(stats, key=itemgetter('name')))
    raise ServerError(gettext("An Error has occored. When oping the dataset. Please try again or try a different dataset. If you would like to report this error please contact oceandatamap@gmail.com"))


def stats(dataset_name, query):
    print "===================================================================================="
    print "query:" + str(query)

    area = copy.deepcopy(query.get('area'))
    print "area : " + str(area) 
    points_lat =[]
    for p in area[0]['polygons'][0]:
        print p[1]
        points_lat.append(p[1])
    #points_lat = area[0]['polygons'][0]
    print "points_lat: " + str(points_lat)

    if (max(points_lat)-min(points_lat))>360:
        ClientError(gettext("Error: you are trying to create a plot that is wider than the world. The desired information is ambiguous please select a smaller area and try again"))
    elif any((p > 180 or p < -180) for p in points_lat) and any(-180 <= p <= 180 for p in points_lat): #if there area points on both sides of the date line
        world_wrap = True 
        print "_______________________world wrap true_________________________________" 
        return computer_wrap_stats(area, query, dataset_name, points_lat)
    else: # all(-180 <= p <= 180 for p in area[0]['polygons'][0][:][1]):
        print "points_lat_Werwe:  " + str(points_lat)
        print "_______________________*world wrap false*_________________________________"
        world_wrap = False
        return computer_stats(area, query, dataset_name)   

    ServerError(gettext("Unknow Error: you have tried something that we did not expect. Please try again or try something else. If you would like to report this error please contact oceandatamap@gmail.com")) 
