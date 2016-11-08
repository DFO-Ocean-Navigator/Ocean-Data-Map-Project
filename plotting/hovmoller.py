# vim: set fileencoding=utf-8 :

from grid import Grid
from mpl_toolkits.basemap import Basemap
from mpl_toolkits.axes_grid1 import make_axes_locatable
from netCDF4 import Dataset, netcdftime
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import re
import colormap
from StringIO import StringIO
import geopy
import utils
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url
import datetime


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    points = query.get('path')
    if points is None or len(points) == 0:
        points = [
            '47 N 52.8317 W',
            '47 N 42 W'
        ]
    start = points[0]
    end = points[-1]

    scale = query.get('scale')
    if scale is None or 'auto' in scale:
        scale = None
    else:
        scale = [float(x) for x in scale.split(',')]

    showmap = query.get('showmap') is None or bool(query.get('showmap'))

    interp = query.get('interpolation')
    if interp is None or interp == '':
        interp = {
            'method': 'inv_square',
            'neighbours': 8,
        }

    with Dataset(get_dataset_url(dataset_name), 'r') as dataset:
        if query.get('starttime') is None or \
           len(str(query.get('starttime'))) == 0:
            starttime = 0
        else:
            starttime = int(query.get('starttime'))

        if 'time_counter' in dataset.variables:
            time_var = dataset.variables['time_counter']
        elif 'time' in dataset.variables:
            time_var = dataset.variables['time']

        if starttime >= time_var.shape[0]:
            starttime = -1

        if starttime < 0:
            starttime += time_var.shape[0]

        if query.get('endtime') is None or \
           len(str(query.get('endtime'))) == 0:
            endtime = 0
        else:
            endtime = int(query.get('endtime'))

        if endtime >= time_var.shape[0]:
            endtime = -1

        if endtime < 0:
            endtime += time_var.shape[0]

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

        depth = 0
        depthm = 0
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

        if depth_var is None:
            depth_unit = "m"
        else:
            depth_unit = depth_var.units

        if 'time_counter' in dataset.variables:
            time_var = dataset.variables['time_counter']
        elif 'time' in dataset.variables:
            time_var = dataset.variables['time']

        variables = query.get('variable').split(',')

        if starttime > endtime:
            starttime = endtime - 1
            if starttime < 0:
                starttime = 0
                endtime = 2

        time = range(starttime, endtime + 1)

        vector = False
        if len(variables) > 1:
            vector = True
            v = []
            for name in variables:
                pts, distance, value = grid.hovmoller(
                    dataset.variables[name],
                    points, time, depth, interpolation=interp)
                v.append(value ** 2)

            value = np.sqrt(np.ma.sum(v, axis=0))
        else:
            pts, distance, value = grid.hovmoller(
                dataset.variables[variables[0]],
                points, time, depth, interpolation=interp)

        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variables[0]])
        variable_name = get_variable_name(dataset_name,
                                          dataset.variables[variables[0]])

        if len(dataset.variables[variables[0]].shape) == 3:
            depth_label = ""
        elif depth == 'bottom':
            depth_label = " at Bottom"
        else:
            depth_label = " at " + \
                str(int(np.round(depthm))) + " " + utils.mathtext(depth_unit)

        if variable_unit.startswith("Kelvin"):
            variable_unit = "Celsius"
            value = np.add(value, -273.15)

        t = netcdftime.utime(time_var.units)
        times = t.num2date(time_var[int(starttime):(int(endtime) +
                                                    1)]).tolist()

    if query.get('dataset_quantum') == 'month':
        times = [datetime.date(x.year, x.month, 1) for x in times]

    # Colormap from arguments
    cmap = query.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(cmap)
    if cmap is None:
        if vector:
            cmap = colormap.colormaps.get('speed')
        else:
            cmap = colormap.find_colormap(variable_name)

    filename = utils.get_filename(dataset_name, filetype)
    if filetype == 'csv':
        return
        # CSV File
        output = StringIO()
        try:
            # Write Header
            output.write("Time, Latitude, Longitude, Distance (km)\n")

            # Write Values
            for idx, val in enumerate(value.transpose()):
                if distance[idx] == distance[idx - 1]:
                    continue
                output.write(
                    "%0.4f, %0.4f, %0.1f, " % (pts[0, idx],
                                               pts[1, idx],
                                               distance[idx])
                )

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
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        if showmap:
            width = 2
            width_ratios = [2, 7]
        else:
            width = 1
            width_ratios = [1]

        gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)

        # Bounds for map view
        minlat = np.min(pts[0, :])
        maxlat = np.max(pts[0, :])
        minlon = np.min(pts[1, :])
        maxlon = np.max(pts[1, :])
        lat_d = max(maxlat - minlat, 20)
        lon_d = max(maxlon - minlon, 20)
        minlat -= lat_d / 3
        minlon -= lon_d / 3
        maxlat += lat_d / 3
        maxlon += lon_d / 3

        if showmap:
            # Plot the path on a map
            plt.subplot(gs[0])
            m = Basemap(
                llcrnrlon=minlon,
                llcrnrlat=minlat,
                urcrnrlon=maxlon,
                urcrnrlat=maxlat,
                lat_0=np.mean(pts[0, :]),
                lon_0=np.mean(pts[1, :]),
                resolution='c', projection='merc',
                rsphere=(6378137.00, 6356752.3142),
            )
            # m = basemap.load_arctic()

            m.plot(pts[1, :], pts[0, :],
                   latlon=True, color='r', linestyle='-')
            qx, qy = m([pts[1, -1]], [pts[0, -1]])
            # qu = pts[1, -1] - pts[1, 0]
            # qv = pts[0, -1] - pts[0, 0]
            qu = pts[1, -1] - pts[1, -2]
            qv = pts[0, -1] - pts[0, -2]
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

        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = np.amin(value)
            vmax = np.amax(value)
            if re.search("velocity", variable_name, re.IGNORECASE) or \
                re.search("surface height", variable_name, re.IGNORECASE) or \
                    re.search("wind", variable_name, re.IGNORECASE):
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)
            if vector:
                vmin = 0

        if showmap:
            plt.subplot(gs[1])

        if vector:
            variable_name = re.sub(
                r"(?i)( x | y |zonal |meridional |northward |eastward )", " ",
                variable_name)
            variable_name = re.sub(r" +", " ", variable_name)

        _plot(
            distance, value, times, variable_unit,
            variable_name, vmin, vmax, cmap, scale)

        path_name = query.get('name')
        if path_name is None or path_name == '':
            path_name = "%s to %s" % (geopy.Point(start), geopy.Point(end))
        else:
            path_name += " Path"

        fig.suptitle(u"Hovm\xf6ller Diagram for " + variable_name + depth_label
                     + ", " + "\n" + path_name)

        fig.tight_layout(pad=3, w_pad=4)
        fig.subplots_adjust(top=0.92)

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()


def _plot(distance, values, times, unit, name,
          vmin, vmax, cmap, scale):

    c = plt.pcolormesh(distance, times, values,
                       cmap=cmap,
                       shading='gouraud',
                       vmin=vmin,
                       vmax=vmax)
    ax = plt.gca()
    ax.yaxis_date()
    ax.yaxis.grid(True)
    ax.set_axis_bgcolor('dimgray')

    plt.xlabel("Distance (km)")
    plt.xlim([distance[0], distance[-1]])

    divider = make_axes_locatable(plt.gca())
    cax = divider.append_axes("right", size="5%", pad=0.05)
    bar = plt.colorbar(c, cax=cax)
    bar.set_label("%s (%s)" % (name, utils.mathtext(unit)))
