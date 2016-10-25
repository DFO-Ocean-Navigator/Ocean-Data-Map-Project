from netCDF4 import Dataset, netcdftime
import numpy as np
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url, get_dataset_climatology
from shapely.geometry import LinearRing, Polygon, MultiPolygon, Point
from shapely.ops import cascaded_union
from oceannavigator.misc import list_areas
from plotting.grid import Grid
import json
from operator import itemgetter
import re


def stats(dataset_name, query):
    variables = query.get('variable')
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

    variables_anom = variables
    variables = [re.sub('_anom$', '', v) for v in variables]

    area = query.get('area')
    names = None
    data = None

    names = []
    all_rings = []
    for idx, a in enumerate(area):
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
    data = None

    if len(all_rings) > 1:
        combined = cascaded_union(all_rings)
    else:
        combined = all_rings[0]

    combined = combined.envelope

    bounds = combined.bounds

    with Dataset(get_dataset_url(dataset_name), 'r') as dataset:
        if query.get('time') is None or (type(query.get('time')) == str and
                                         len(query.get('time')) == 0):
            time = -1
        else:
            time = int(query.get('time'))

        if 'time_counter' in dataset.variables:
            time_var = dataset.variables['time_counter']
        elif 'time' in dataset.variables:
            time_var = dataset.variables['time']
        if time >= time_var.shape[0]:
            time = -1

        if time < 0:
            time += time_var.shape[0]

        timestamp = netcdftime.utime(time_var.units).num2date(time_var[time])

        depth = 0
        depthm = 0
        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
        else:
            depth_var = None

        if depth_var is not None and query.get('depth'):
            if query.get('depth') == 'bottom':
                depth = 'bottom'
                depthm = 'Bottom'
            if len(query.get('depth')) > 0 and \
                    query.get('depth') != 'bottom':
                depth = int(query.get('depth'))

                if depth >= depth_var.shape[0]:
                    depth = 0
                depthm = depth_var[int(depth)]

        if 'nav_lat' in dataset.variables:
            latvarname = 'nav_lat'
            lonvarname = 'nav_lon'
        elif 'latitude' in dataset.variables:
            latvarname = 'latitude'
            lonvarname = 'longitude'

        grid = Grid(dataset, latvarname, lonvarname)
        lat, lon = np.meshgrid(
            np.linspace(bounds[0], bounds[2], 50),
            np.linspace(bounds[1], bounds[3], 50)
        )
        miny, maxy, minx, maxx = grid.bounding_box_grid(lat, lon)

        lat = dataset.variables[latvarname][miny:maxy, minx:maxx]
        lon = dataset.variables[lonvarname][miny:maxy, minx:maxx]

        data = []
        allvars = []
        variable_units = []
        variable_names = []
        variable_depths = []
        for v_idx, v in enumerate(variables):
            var = dataset.variables[v]
            allvars.append(v)

            variable_names.append(get_variable_name(dataset_name, var))
            variable_units.append(get_variable_unit(dataset_name, var))

            if v != variables_anom[v_idx]:
                variable_names[-1] += " Anomaly"

            if len(var.shape) == 3:
                d = var[time, miny:maxy, minx:maxx]
                variable_depths.append("")
            elif depth == 'bottom':
                fulldata = var[time, :, miny:maxy, minx:maxx]
                reshaped = fulldata.reshape([fulldata.shape[0], -1])
                edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))

                depths = edges[1, 0, :]
                indices = edges[1, 1, :]

                d = np.ma.MaskedArray(np.zeros([fulldata.shape[1],
                                                fulldata.shape[2]]),
                                      mask=True,
                                      dtype=fulldata.dtype)

                d[np.unravel_index(indices, d.shape)] = fulldata.reshape(
                    [fulldata.shape[0], -1])[depths, indices]
                variable_depths.append("(@ Bottom)")
            else:
                d = var[time, depth, miny:maxy, minx:maxx]
                variable_depths.append("(@%d %s)" % (np.round(depthm),
                                                     depth_var.units))
            data.append(d)

        if all(map(lambda v: len(dataset.variables[v].shape) == 3, allvars)):
            depth = 0

    for idx, d in enumerate(data):
        if variable_units[idx].startswith("Kelvin"):
            variable_units[idx] = "Celsius"
            data[idx] = d - 273.15

    # Anomomilies
    if variables != variables_anom:
        with Dataset(get_dataset_climatology(dataset_name), 'r') as dataset:
            for v_idx, v in enumerate(variables):
                if v == variables_anom[v_idx]:
                    continue
                var = dataset.variables[v]

                if len(var.shape) == 3:
                    d = var[timestamp.month - 1, miny:maxy, minx:maxx]
                elif depth == 'bottom':
                    fulldata = var[
                        timestamp.month - 1, :, miny:maxy, minx:maxx]
                    reshaped = fulldata.reshape([fulldata.shape[0], -1])
                    edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))

                    depths = edges[1, 0, :]
                    indices = edges[1, 1, :]

                    d = np.ma.MaskedArray(np.zeros([fulldata.shape[1],
                                                    fulldata.shape[2]]),
                                          mask=True,
                                          dtype=fulldata.dtype)

                    d[np.unravel_index(indices, d.shape)] = fulldata.reshape(
                        [fulldata.shape[0], -1])[depths, indices]
                else:
                    d = var[timestamp.month - 1, depth, miny:maxy, minx:maxx]

                data[v_idx] = data[v_idx] - d

    lon[np.where(lon > 180)] -= 360
    points = [Point(p) for p in zip(lat.ravel(), lon.ravel())]
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

        poly = MultiPolygon(polygons)

        indices = np.where(map(lambda p, poly=poly: poly.contains(p), points))

        res = {
            'name': a.get('name'),
            'variables': [],
        }

        for idx, d in enumerate(data):
            selection = np.ma.array(d.ravel()[indices])

            fmtstr = "%6.5g"
            if len(selection) > 0 and not selection.mask.all():
                res['variables'].append({
                    'name': ("%s %s" % (variable_names[idx],
                                        variable_depths[idx])).strip(),
                    'unit': variable_units[idx],
                    'min': fmtstr % np.ma.amin(selection).astype(float),
                    'max': fmtstr % np.ma.amax(selection).astype(float),
                    'mean': fmtstr % np.ma.mean(selection).astype(float),
                    'median': fmtstr % np.ma.median(selection).astype(float),
                    'stddev': fmtstr % np.ma.std(selection).astype(float),
                    'num': "%d" % selection.count(),
                })
            else:
                res['variables'].append({
                    'name': ("%s %s" % (variable_names[idx],
                                        variable_depths[idx])).strip(),
                    'unit': variable_units[idx],
                    'min': "No Data",
                    'max': "No Data",
                    'mean': "No Data",
                    'median': "No Data",
                    'stddev': "No Data",
                    'num': "0",
                })

        output.append(res)
        # if len(rings) > 1:
        #     u = cascaded_union(rings)
        # else:
        #     u = rings[0]

    return json.dumps(sorted(output, key=itemgetter('name')))
