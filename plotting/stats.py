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


def stats(dataset_name, query):
    variables = query.get('variable')
    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

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

    if len(all_rings) > 1:
        combined = cascaded_union(all_rings)
    else:
        combined = all_rings[0]

    combined = combined.envelope
    bounds = combined.bounds

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

        lat, lon = np.meshgrid(
            np.linspace(bounds[0], bounds[2], 50),
            np.linspace(bounds[1], bounds[3], 50)
        )

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
            for i, a in enumerate(area):
                indices = np.where(
                    map(
                        lambda p, poly=area_polys[i]: poly.contains(p),
                        points
                    )
                )

                selection = np.ma.array(d.ravel()[indices])
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

    return json.dumps(sorted(output, key=itemgetter('name')))
