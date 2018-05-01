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
    def __init__(self, query):
        print "constructer called, query is : " + str(query)
        self.time = query.get('time')
        self.depth = query.get('depth')
        self.area = Area(query)
        self.names = copy.deepcopy(query.get('name')) 
    
    def set_area(self, area):
        self.area=copy.deepcopy(area)
    
    def set_lons(self, lons):
        self.raw_lons = copy.deepcopy(lons)
    
    def split_area(self, divide_lon_line):
        self.inner_area=copy.deepcopy(self.area)
        self.outter_area=copy.deepcopy(self.area)
        for idx, a in enumerate(self.area.area_query):
            print "idx: " + str(idx)
            print "a: " + str(a)
            for idx2, lon  in enumerate(self.raw_lons):
                print "idx2: " + str(idx2)
                print "lon: " + str(lon)

                if abs(lon) > abs(divide_lon_line): # usally outside range of -180 to 180 
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

        if (self.inner_area.stats[0]['variables'][0]['mean'] != u'No Data') and (self.outter_area.stats[0]['variables'][0]['mean'] != u'No Data'):
            print "self.inner_area.stats[0]: " + str(self.inner_area.stats[0])
            print "self.inner_area.stats: " + str( float(self.inner_area.stats[0]['variables'][0]['num']))
            print "self.outter_area.stats: " + str( float(self.outter_area.stats[0]['variables'][0]['num']))
            inner_num = int(self.inner_area.stats[0]['variables'][0]['num'])
            outter_num = int(self.outter_area.stats[0]['variables'][0]['num'])
            inner_mean = float(self.inner_area.stats[0]['variables'][0]['mean'])
            outter_mean = float(self.outter_area.stats[0]['variables'][0]['mean'])
            inner_median = float(self.inner_area.stats[0]['variables'][0]['median'])
            outer_median = float(self.outter_area.stats[0]['variables'][0]['median'])
            
            print "type self.outter_area.stats[0]['variables'][0]['mean']: " + str(type(self.outter_area.stats[0]['variables'][0]['mean']))
            combined_area = copy.deepcopy(self.inner_area.stats)
            combined_area[0]['variables'][0]['num'] = inner_num +  outter_num
            combined_area[0]['variables'][0]['min'] = min(self.inner_area.stats[0]['variables'][0]['min'],  self.outter_area.stats[0]['variables'][0]['min'])
            combined_area[0]['variables'][0]['max'] = max(self.inner_area.stats[0]['variables'][0]['max'],  self.outter_area.stats[0]['variables'][0]['max'])
            combined_area[0]['variables'][0]['mean'] = ((inner_mean*inner_num)+(outter_mean*outter_num))/(inner_num*outter_num)
            combined_area[0]['variables'][0]['median'] = "about " + str((inner_median+outer_median)/2)
            combined_num = int(combined_area[0]['variables'][0]['num'])
            combined_area[0]['variables'][0]['stddev'] = np.sqrt((combined_area[0]['variables'][0]['mean']**2)/combined_num)
            self.area.stats = combined_area
        elif (self.inner_area.stats[0]['variables'][0]['mean'] == "No Data"):
            print "!!!!!!!!!!!!! no points inside" 
            self.area.stats = self.outter_area.stats
        else:
            print "!!!!!!!!!!!!! no points outside" 
            self.area.stats = self.inner_area.stats

    def get_values_object_oreanted(self, area_info, dataset_name, variables):
        print "________open dataset__________"
        with open_dataset(get_dataset_url(dataset_name)) as dataset:

            if self.time is None or (type(self.time) == str and
                                            len(self.time) == 0):
                time = -1
            else:
                time = int(self.time)

            if time < 0:
                time += len(dataset.timestamps)
            time = np.clip(time, 0, len(dataset.timestamps) - 1)

            depth = 0
            depthm = 0

            if self.depth:
                if self.depth == 'bottom':
                    depth = 'bottom'
                    depthm = 'Bottom'
                if len(self.depth) > 0 and \
                        self.depth != 'bottom':
                    depth = int(self.depth)

                    depth = np.clip(depth, 0, len(dataset.depths) - 1)
                    depthm = dataset.depths[depth]

            lat, lon = np.meshgrid(
                np.linspace(area_info.bounds[0], area_info.bounds[2], 50),
                area_info.spaced_points
            )
            print "lenther of: lat, lon:  " + str(len(lat)) + ", " + str(len(lon))
            print "____lon:  " + ", " + str(lon)

            output_fmtstr = "%6.5g"
            for v_idx, v in enumerate(variables):
                var = dataset.variables[v]

                variable_name = get_variable_name(dataset_name, var)
                variable_unit = get_variable_unit(dataset_name, var)
                scale_factor = get_variable_scale_factor(dataset_name, var)

                lat, lon, d = dataset.get_raw_point(
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
                print "area: " + str(area_info.area_query)
                for i, a in enumerate(area_info.area_query):
                    print "i, a: " + str(i) + ", " + str(a)
                    indices = np.where(
                        map(
                            lambda p, poly=area_info.area_polys[i]: poly.contains(p),
                            points
                        )
                    )
                    print "indices____ : " + str(indices)

                    selection = np.ma.array(d.ravel()[indices])
                    print " len(selection): " + str(len(selection))
                    if len(selection) > 0 and not selection.mask.all():
                        area_info.output[i]['variables'].append({
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
                        area_info.output[i]['variables'].append({
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

            area_info.stats = area_info.output
            return

        raise ServerError(gettext("An Error has occurred. When opening the dataset. \
                                Please try again or try a different dataset. \
                                If you would like to report this error please contact oceandatamap@gmail.com"))

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
    elif abs(lon) != 180:
        bounded_lon = (lon%180)
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


def wrap_computer_stats(query, dataset_name, lon_values):

    #determine east or west wrap
    if any(p > 180 for p in lon_values):        #points to the east of the east dateline 
        wrap_val=180
    elif any(p < -180 for p in lon_values):     #points to the west of the west dateline
        wrap_val=-180
    else:
        raise ClientError(gettext("something went wrong. It seems you trying to create a plot across the international date line." + 
                                "While we do support this function it must be done within 360 deg of the default map view. Try refreshing the page and try again"))
    
    variables = query.get('variable')

    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')
    
    new_area = Stats(query)
    new_area.set_lons(lon_values)

    new_area.split_area(wrap_val)

    variables = [re.sub('_anom$', '', v) for v in variables]

    new_area.names, new_area.inner_area.all_rings = get_names_rings(new_area.inner_area.area_query)
    _, new_area.outter_area.all_rings = get_names_rings(new_area.outter_area.area_query)

    new_area.inner_area.bounds = compute_bounds(new_area.inner_area.all_rings)
    new_area.outter_area.bounds = compute_bounds(new_area.outter_area.all_rings)

    new_area.inner_area.area_polys, new_area.inner_area.output = fill_polygons(new_area.inner_area.area_query)
    new_area.outter_area.area_polys, new_area.outter_area.output = fill_polygons(new_area.outter_area.area_query)

    new_area.inner_area.width = new_area.inner_area.bounds[3] - new_area.inner_area.bounds[1] 
    new_area.outter_area.width = new_area.outter_area.bounds[3] - new_area.outter_area.bounds[1]

    spacing = math.floor((new_area.inner_area.width/(new_area.inner_area.width+new_area.outter_area.width))*50)
    new_area.inner_area.spaced_points = np.linspace(new_area.inner_area.bounds[1], new_area.inner_area.bounds[3], spacing)
    new_area.outter_area.spaced_points = np.linspace(new_area.outter_area.bounds[1], new_area.outter_area.bounds[3], 50-spacing)

    new_area.get_values_object_oreanted(new_area.inner_area , dataset_name, variables)
    new_area.get_values_object_oreanted(new_area.outter_area, dataset_name, variables)
    new_area.combine_stats()    

    print "stats: " + str(new_area.area.stats)
    print "_______________________end of world wrap true_________________________________" 
    return json.dumps(sorted(new_area.area.stats, key=itemgetter('name')))

def computer_stats(area, query, dataset_name):
    new_area = Stats(query)
    lon_values = []
    for p in new_area.area.area_query[0]['polygons'][0]:
        p[1] = convert_to_bounded_lon(p[1])
        lon_values.append(p[1])
    new_area.set_lons(lon_values)

    variables = query.get('variable')
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

    variables = [re.sub('_anom$', '', v) for v in variables]

    variables = [re.sub('_anom$', '', v) for v in variables]


    new_area.names, new_area.area.all_rings = get_names_rings(new_area.area.area_query)
    new_area.area.bounds = compute_bounds(new_area.area.all_rings)
    new_area.area.area_polys, new_area.area.output = fill_polygons(new_area.area.area_query)
    new_area.area.spaced_points = np.linspace(new_area.area.bounds[1], new_area.area.bounds[3], 50)
        
    print "__ new_area.area.bounds: " + str(new_area.area.bounds)
    print "new_area.area.area_polys, new_area.area.output : " + str(new_area.area.area_polys[0]) + ", " + str(new_area.area.output)
    print "__ new_area.area.area_query: " + str(new_area.area.area_query)

    new_area.get_values_object_oreanted(new_area.area, dataset_name, variables)
    print "stats: " + str(stats)
    print "_______________________end of world wrap false_________________________________" 
    return json.dumps(sorted(new_area.area.stats, key=itemgetter('name')))
    


def stats(dataset_name, query):
    print "===================================================================================="
    print "query:" + str(query)

    area = copy.deepcopy(query.get('area'))
    points_lat =[]
    for p in area[0]['polygons'][0]:
        points_lat.append(p[1])

    if (max(points_lat)-min(points_lat))>360:
        ClientError(gettext("Error: you are trying to create a plot that is wider than the world. \
        The desired information is ambiguous please select a smaller area and try again"))
    elif any((p > 180 or p < -180) for p in points_lat) and any(-180 <= p <= 180 for p in points_lat): #if there area points on both sides of the date line
        print "_______________________world wrap true_________________________________" 
        return wrap_computer_stats(query, dataset_name, points_lat)
    else:   
        print "points_lat_Werwe:  " + str(points_lat)
        print "_______________________*world wrap false*_________________________________"
        return computer_stats(area, query, dataset_name)   

    ServerError(gettext("Unknown Error: you have tried something that we did not expect. \
                        Please try again or try something else. If you would like to report \
                        this error please contact oceandatamap@gmail.com")) 
