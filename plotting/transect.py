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
from StringIO import StringIO
import os
from oceannavigator import app
from pykml import parser
import geopy
import utils


def plot(url, climate_url, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

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

    interp = query.get('interpolation')
    if interp is None or interp == '':
        interp = {
            'method': 'inv_square',
            'neighbours': 8,
        }

    with Dataset(url, 'r') as dataset:
        if 'nav_lat' in dataset.variables:
            latvarname = 'nav_lat'
            lonvarname = 'nav_lon'
        elif 'latitude' in dataset.variables:
            latvarname = 'latitude'
            lonvarname = 'longitude'

        grid = Grid(dataset, latvarname, lonvarname)

        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
        else:
            depth_var = None

        if depth_var is None:
            depth = [0]
            depth_unit = "m"
        else:
            depth = depth_var[:]
            depth_unit = depth_var.units

        if 'time_counter' in dataset.variables:
            time_var = dataset.variables['time_counter']
        elif 'time' in dataset.variables:
            time_var = dataset.variables['time']

        if time >= time_var.shape[0]:
            time = -1

        if time < 0:
            time += time_var.shape[0]

        velocity = False
        variables = query.get('variable').split(',')
        anom = str(query.get('anomaly')).lower() in ['true', 'yes', 'on']
        if len(variables) > 1 or \
            ('votemper' not in variables and
             'vosaline' not in variables):
            anom = False

        if len(variables) > 1:
            velocity = True
            v = []
            for name in variables:
                v.append(dataset.variables[name])

            transect_pts, distance, parallel, perpendicular = \
                grid.velocitytransect(
                    v[0], v[1], points, time, interpolation=interp)
        else:
            transect_pts, distance, value = grid.transect(
                dataset.variables[variables[0]],
                points, time, interpolation=interp)

        if surface is not None:
            surface_pts, surface_dist, surface_value = grid.surfacetransect(
                dataset.variables[surface],
                points, time, interpolation=interp)
            surface_name = dataset.variables[
                surface].long_name.replace(" at CMC", "")
            surface_unit = dataset.variables[surface].units
            if surface_unit.startswith("Kelvin"):
                surface_unit = "Celsius"
                surface_value = np.add(surface_value, -273.15)

        variable_unit = dataset.variables[variables[0]].units
        variable_name = dataset.variables[
            variables[0]].long_name.replace(" at CMC", "")
        if variable_unit.startswith("Kelvin"):
            variable_unit = "Celsius"
            value = np.add(value, -273.15)

        if anom:
            variable_name += " Anomaly"

        t = netcdftime.utime(time_var.units)
        timestamp = t.num2date(time_var[int(time)])

    if anom:
        with Dataset(climate_url, 'r') as dataset:
            if 'nav_lat' in dataset.variables:
                latvarname = 'nav_lat'
                lonvarname = 'nav_lon'
            elif 'latitude' in dataset.variables:
                latvarname = 'latitude'
                lonvarname = 'longitude'

            grid = Grid(dataset, latvarname, lonvarname)
            climate_points, climate_distance, climate_value = grid.transect(
                dataset.variables[variables[0]],
                points, timestamp.month - 1, interpolation=interp)

            if dataset.variables[variables[0]].units.startswith("Kelvin"):
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

    filename = utils.get_filename(url, None,
                                  variables, variable_unit,
                                  timestamp, None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            # Write Header
            output.write("Latitude, Longitude, Distance (km), ")
            if surface is not None:
                output.write("%s (%s), " % (surface_name, surface_unit))
            output.write(", ".join(["%d%s" % (np.round(d), depth_unit) for d
                                   in depth]))
            output.write("\n")

            # Write Values
            for idx, val in enumerate(value.transpose()):
                if distance[idx] == distance[idx - 1]:
                    continue
                output.write(
                    "%0.4f, %0.4f, %0.1f, " % (transect_pts[0, idx],
                                               transect_pts[1, idx],
                                               distance[idx])
                )
                if surface is not None:
                    output.write("%0.4f, ", surface_value[idx])

                output.write(", ".join([
                    "%0.4f" % n for n in val
                ]))
                output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(
            size[1]) * (1 if not velocity else 2))
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
        linearthresh = query.get('linearthresh')
        if linearthresh is None or linearthresh == '':
            linearthresh = 200
        linearthresh = float(linearthresh)
        if not linearthresh > 0:
            linearthresh = 1

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
                "Parallel", vmin, vmax, cmap, scale, linearthresh)
            if surface:
                _surface_plot(
                    divider, surface_dist, surface_value, surface_unit,
                    surface_name)
            if showmap:
                plt.subplot(gs[3])
            else:
                plt.subplot(gs[1])
            divider = _transect_plot(
                distance, perpendicular, depth, variable_unit, bath_x, bath_y,
                "Perpendicular", vmin, vmax, cmap, scale, linearthresh)
            if surface:
                _surface_plot(
                    divider, surface_dist, surface_value, surface_unit,
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
                variable_name, vmin, vmax, cmap, scale, linearthresh)

            if surface:
                _surface_plot(
                    divider, surface_dist, surface_value, surface_unit,
                    surface_name)

        transect_name = query.get('transect_name')
        if transect_name is None or transect_name == '':
            transect_name = "Transect from %s to %s" % (geopy.Point(start),
                                                        geopy.Point(end))
        else:
            transect_name += " Transect"

        quantum = query.get('quantum')
        if quantum == 'month':
            dformat = "%B %Y"
        elif quantum == 'day':
            dformat = "%d %B %Y"
        elif quantum == 'hour':
            dformat = "%H:%M %d %B %Y"
        else:
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
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
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
                   vmin, vmax, cmap, scale, linearthresh=200):

    c = plt.pcolormesh(distance, depth, values,
                       cmap=cmap,
                       shading='gouraud',
                       vmin=vmin,
                       vmax=vmax)
    plt.gca().invert_yaxis()
    plt.yscale('symlog', linthreshy=linearthresh)
    plt.gca().yaxis.set_major_formatter(ScalarFormatter())

    # Mask out the bottom
    plt.fill_between(bath_x, bath_y * -1, plt.ylim()[0],
                     facecolor='dimgray', hatch='xx')
    plt.gca().set_axis_bgcolor('dimgray')

    plt.xlabel("Distance (km)")
    plt.ylabel("Depth (m)")
    plt.xlim([distance[0], distance[-1]])

    # Tighten the y-limits
    deep = np.amax(bath_y * -1)
    l = 10 ** np.floor(np.log10(deep))
    plt.ylim(np.ceil(deep / l) * l, 0)
    plt.yticks(list(plt.yticks()[0]) + [linearthresh, plt.ylim()[0]])

    # Show the linear threshold
    plt.plot([distance[0], distance[-1]],
             [linearthresh, linearthresh],
             'k:', alpha=0.5)

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
