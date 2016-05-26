from grid import Grid, bathymetry
from mpl_toolkits.basemap import Basemap
from mpl_toolkits.axes_grid1 import make_axes_locatable
from netCDF4 import Dataset, netcdftime
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter
import numpy as np
import re
import colormap
import cStringIO
import os
from oceannavigator import app
from pykml import parser


def plot(url, climate_url, **kwargs):
    query = kwargs.get('query')

    points = query.get('transect_pts')
    if points is None or len(points) == 0:
        points = [
            '47 N 52.8317 W',
            '47 N 42 W'
        ]
    start = points[0]
    end = points[-1]

    if query.get('time') is None or len(query.get('time')) == 0:
        time = -1
    else:
        time = int(query.get('time'))

    scale = query.get('scale')
    if scale is None or scale == 'auto':
        scale = None
    else:
        scale = [float(x) for x in scale.split(',')]

    showmap = query.get('showmap') is None or bool(query.get('showmap'))

    surface = query.get('surfacevariable')
    if surface is not None and (surface == '' or surface == 'none'):
        surface = None

    with Dataset(url, 'r') as dataset:
        grid = Grid(dataset, 'nav_lat', 'nav_lon')
        depth = dataset.variables['deptht'][:]

        if time >= dataset.variables['time_counter'].shape[0]:
            time = -1

        velocity = False
        variables = query.get('variable').split(',')
        anom = str(query.get('anomaly')).lower() in ['true', 'yes', 'on']
        if len(variables) > 1 or \
            ('votemper' not in variables and
                'vosaline' not in variables and
                'bottom_votemper' not in variables and
                'bottom_vosaline' not in variables):
            anom = False

        if len(variables) > 1:
            velocity = True
            v = []
            for name in variables:
                v.append(dataset.variables[name])

            transect_pts, distance, parallel, perpendicular = \
                grid.velocitytransect(v[0], v[1], points, time)
        else:
            transect_pts, distance, value = grid.transect(
                dataset.variables[variables[0]],
                points, time)

        if surface is not None:
            surface_pts, surface_dist, surface_value = grid.surfacetransect(
                dataset.variables[surface],
                points, time)
            surface_name = dataset.variables[
                surface].long_name.replace(" at CMC", "")
            surface_unit = dataset.variables[surface].units
            if surface_unit == "Kelvins":
                surface_unit = "Celsius"
                surface_value = np.add(surface_value, -273.15)

        variable_unit = dataset.variables[variables[0]].units
        variable_name = dataset.variables[
            variables[0]].long_name.replace(" at CMC", "")
        if variable_unit == "Kelvins":
            variable_unit = "Celsius"
            value = np.add(value, -273.15)

        if anom:
            variable_name += " Anomaly"

        t = netcdftime.utime(dataset.variables["time_counter"].units)
        timestamp = t.num2date(dataset.variables["time_counter"][int(time)])

    if anom:
        with Dataset(climate_url, 'r') as dataset:
            grid = Grid(dataset, 'nav_lat', 'nav_lon')
            climate_points, climate_distance, climate_value = grid.transect(
                dataset.variables[variables[0]],
                points, time)

            if dataset.variables[variables[0]].units == "Kelvins":
                climate_value = np.add(climate_value, -273.15)

            value = value - climate_value

    # Bathymetry
    with Dataset(app.config['BATHYMETRY_FILE'], 'r') as dataset:
        bath_x, bath_y = bathymetry(
            dataset.variables['y'],
            dataset.variables['x'],
            dataset.variables['z'],
            points)

    # Colormap from arguments
    cmap = query.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(cmap)
    if cmap is None:
        if anom:
            cmap = colormap.colormaps['anomaly']
        else:
            cmap = colormap.find_colormap(variable_name)

    # Figure size
    size = kwargs.get('size').replace("x", " ").split()
    figuresize = (float(size[0]), float(size[1]) * (1 if not velocity else 2))
    fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

    if showmap:
        width = 2
        width_ratios = [2, 7]
    else:
        width = 1
        width_ratios = [1]

    if velocity:
        gs = gridspec.GridSpec(
            2, width, width_ratios=width_ratios, height_ratios=[1, 1])
    else:
        gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)

    # Bounds for map view
    minlat = np.min(transect_pts[0, :])
    maxlat = np.max(transect_pts[0, :])
    minlon = np.min(transect_pts[1, :])
    maxlon = np.max(transect_pts[1, :])
    lat_d = max(maxlat - minlat, 20)
    lon_d = max(maxlon - minlon, 20)
    minlat -= lat_d / 3
    minlon -= lon_d / 3
    maxlat += lat_d / 3
    maxlon += lon_d / 3

    if showmap:
        # Plot the transect on a map
        if velocity:
            plt.subplot(gs[:, 0])
        else:
            plt.subplot(gs[0])
        m = Basemap(
            llcrnrlon=minlon,
            llcrnrlat=minlat,
            urcrnrlon=maxlon,
            urcrnrlat=maxlat,
            lat_0=np.mean(transect_pts[0, :]),
            lon_0=np.mean(transect_pts[1, :]),
            resolution='c', projection='merc',
            rsphere=(6378137.00, 6356752.3142),
        )
        # m = basemap.load_arctic()

        m.plot(transect_pts[1, :], transect_pts[0, :],
               latlon=True, color='r', linestyle='-')
        qx, qy = m([transect_pts[1, -1]], [transect_pts[0, -1]])
        # qu = transect_pts[1, -1] - transect_pts[1, 0]
        # qv = transect_pts[0, -1] - transect_pts[0, 0]
        qu = transect_pts[1, -1] - transect_pts[1, -2]
        qv = transect_pts[0, -1] - transect_pts[0, -2]
        qmag = np.sqrt(qu ** 2 + qv ** 2)
        qu /= qmag
        qv /= qmag
        m.quiver(qx, qy, qu, qv,
                 pivot='tip',
                 scale=8,
                 width=0.25,
                 minlength=0.25,
                 color='r')
        m.etopo()
        m.drawparallels(
            np.arange(
                round(minlat),
                round(maxlat),
                round(lat_d / 1.5)
            ), labels=[0, 1, 0, 0])
        m.drawmeridians(
            np.arange(
                round(minlon),
                round(maxlon),
                round(lon_d / 1.5)
            ), labels=[0, 0, 0, 1])

    # transect Plot
    if velocity:
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = min(np.amin(parallel), np.amin(perpendicular))
            vmax = max(np.amax(parallel), np.amin(perpendicular))
            vmin = min(vmin, -vmax)
            vmax = max(vmax, -vmin)

        if showmap:
            plt.subplot(gs[1])
        else:
            plt.subplot(gs[0])
        divider = _transect_plot(
            distance, parallel, depth, variable_unit, bath_x, bath_y,
            "Parallel", vmin, vmax, cmap, scale)
        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)
        if showmap:
            plt.subplot(gs[3])
        else:
            plt.subplot(gs[1])
        divider = _transect_plot(
            distance, perpendicular, depth, variable_unit, bath_x, bath_y,
            "Perpendicular", vmin, vmax, cmap, scale)
        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)

    else:
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = np.amin(value)
            vmax = np.amax(value)
            if re.search("velocity", variable_name) or anom:
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)

        if showmap:
            plt.subplot(gs[1])
        divider = _transect_plot(
            distance, value, depth, variable_unit, bath_x, bath_y,
            variable_name, vmin, vmax, cmap, scale)

        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)

    transect_name = query.get('transect_name')
    if transect_name is None or transect_name == '':
        transect_name = "Transect from " + start + " to " + end
    else:
        transect_name += " Transect"

    if 'monthly' in url:
        dformat = "%B %Y"
    else:
        dformat = "%d %B %Y"

    if velocity:
        fig.suptitle("Sea water velocity, " + timestamp.strftime(dformat) +
                     "\n" + transect_name)
    else:
        fig.suptitle(variable_name + ", " + timestamp.strftime(dformat) +
                     "\n" + transect_name)

    fig.tight_layout(pad=3, w_pad=4)
    if velocity:
        fig.subplots_adjust(top=0.9)

    # Output the plot
    buf = cStringIO.StringIO()
    try:
        plt.savefig(buf, format='png')
        return buf.getvalue()
    finally:
        buf.close()


def _surface_plot(axis_divider, distance, values, units, name):
    surface_ax = axis_divider.append_axes("top", size="15%", pad=0.15)
    surface_ax.plot(distance, values, color='r')
    surface_ax.locator_params(nbins=3)
    surface_ax.yaxis.tick_right()
    surface_ax.yaxis.set_label_position("right")
    label = plt.ylabel(units)
    title = plt.title(name)
    plt.setp(title, size='smaller')
    plt.setp(label, size='smaller')
    plt.setp(surface_ax.get_yticklabels(), size='x-small')
    plt.xlim([0, distance[-1]])
    if re.search("free surface", name):
        ylim = plt.ylim()
        plt.ylim([min(ylim[0], -ylim[1]), max([-ylim[0], ylim[1]])])
        surface_ax.yaxis.grid(True)
    # s = surface_ax.imshow(np.tile(values, [2, 1]),
                            # cmap=colormap.find_colormap(name))
    surface_ax.axes.get_xaxis().set_visible(False)


def _transect_plot(distance, values, depth, unit, bath_x, bath_y, name,
                   vmin, vmax, cmap, scale):
    LINEAR = 200

    c = plt.pcolormesh(distance, depth, values.data,
                       cmap=cmap,
                       shading='gouraud',
                       vmin=vmin,
                       vmax=vmax)
    plt.gca().invert_yaxis()
    plt.yscale('symlog', linthreshy=LINEAR)
    plt.gca().yaxis.set_major_formatter(ScalarFormatter())

    # Mask out the bottom
    plt.fill_between(bath_x, bath_y * -1, plt.ylim()[0],
                     facecolor='dimgray', hatch='xx')

    plt.xlabel("Distance (km)")
    plt.ylabel("Depth (m)")
    plt.xlim([distance[0], distance[-1]])

    # Tighten the y-limits
    deep = np.amax(bath_y * -1)
    ylim = plt.ylim()
    l = 10 ** np.floor(np.log10(deep))
    plt.ylim(np.ceil(deep / l) * l, ylim[1])
    plt.yticks(list(plt.yticks()[0]) + [LINEAR, plt.ylim()[0]])

    divider = make_axes_locatable(plt.gca())
    cax = divider.append_axes("right", size="5%", pad=0.05)
    bar = plt.colorbar(c, cax=cax)
    bar.set_label(name + " (" + unit + ")")

    return divider


def list_transects():
    TRANSECT_DIR = os.path.join(app.config['OVERLAY_KML_DIR'], 'transect')

    transects = []
    for f in os.listdir(TRANSECT_DIR):
        if not f.endswith(".kml"):
            continue

        doc = parser.parse(os.path.join(TRANSECT_DIR, f)).getroot()
        # nsmap = {"k": doc.nsmap[None]}
        folder = doc.Document.Folder

        group = {
            'name': doc.Document.Folder.name.text,
            'transects': []
        }

        for place in folder.Placemark:
            c_txt = place.LineString.coordinates.text
            coords = []
            for point_txt in c_txt.split():
                lonlat = point_txt.split(',')
                coords.append(lonlat[1] + "," + lonlat[0])

            group['transects'].append({'name': str(place.name), 'pts': coords})
        group['transects'] = sorted(group['transects'],
                                    key=lambda k: k['name'])

        transects.append(group)

    return transects
