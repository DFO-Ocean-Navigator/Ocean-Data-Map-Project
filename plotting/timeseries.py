from netCDF4 import Dataset
import matplotlib.pyplot as plt
from mpl_toolkits.axes_grid1 import make_axes_locatable
from matplotlib.ticker import ScalarFormatter
import matplotlib
import numpy as np
import re
import colormap
from StringIO import StringIO
import os
from oceannavigator import app
from pykml import parser
from data import load_timeseries
import utils
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url
import datetime


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    points = query.get('station')
    if points is None or len(points) < 1:
        points = [[47.546667, -52.586667]]

    names = query.get('names')
    if names is None or \
            len(names) == 0 or \
            len(names) != len(points) or \
            names[0] is None:
        names = ["(%1.4f, %1.4f)" % (float(l[0]), float(l[1])) for l in
                 points]

    t = sorted(zip(names, points))
    names = [n for (n, p) in t]
    points = [p for (n, p) in t]

    scale = query.get('scale')
    if scale is None or 'auto' in scale:
        scale = None
    else:
        scale = [float(x) for x in scale.split(',')]

    variables = query.get('variable').split(',')
    vector = False
    if len(variables) > 1:
        vector = True

    depth = 0
    if query.get('depth') and len(query.get('depth')) > 0:
        if query.get('depth') == 'all':
            depth = 'all'
            depth_label = ''
        elif query.get('depth') == 'bottom':
            depth = 'bottom'
        else:
            depth = int(query.get('depth'))

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

        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variables[0]])
        variable_name = get_variable_name(dataset_name,
                                          dataset.variables[variables[0]])

        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
            depth_units = depth_var.units
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
            depth_units = depth_var.units
        else:
            depth_var = None
            depth_units = ''

        if depth != 'all' and depth != 'bottom' and \
           (depth_var is None or depth >= depth_var.shape[0]):
            depth = 0

        if ('deptht' in dataset.variables or 'depth' in dataset.variables):
            if depth != 'all' and depth != 'bottom' and \
                ('deptht' in dataset.variables[variables[0]].dimensions or
                 'depth' in dataset.variables[variables[0]].dimensions):
                depth_label = " at %d%s" % (depth_var[depth],
                                            depth_units)
            elif depth == 'bottom':
                depth_label = ' at Bottom'
            else:
                depth_label = ''
        else:
            depth_label = ''

        if ('deptht' not in dataset.variables[variables[0]].dimensions and
                'depth' not in dataset.variables[variables[0]].dimensions):
            depth = 0

        times = None
        point_data = []
        for p in points:
            data = []
            for v in variables:
                d, t = load_timeseries(
                    dataset,
                    v,
                    range(starttime, endtime + 1),
                    depth,
                    float(p[0]),
                    float(p[1])
                )
                if times is None:
                    if query.get('dataset_quantum') == 'month':
                        t = [datetime.date(x.year, x.month, 1) for x in t]
                    times = t

                data.append(d)

            point_data.append(np.ma.array(data))

        point_data = np.ma.array(point_data)

        if depth_var is not None:
            depths = depth_var[:]
            depth_unit = depth_var.units
        else:
            depths = [0]
            depth_unit = "m"

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"
        for idx, v in enumerate(variables):
            point_data[:, idx, :] = point_data[:, idx, :] - 273.15

    if vector:
        mags = np.sqrt(point_data[:, 0, :] ** 2 + point_data[:, 1, :] ** 2)
        variable_name = re.sub(
            r"(?i)( x | y |zonal |meridional |northward |eastward )", " ",
            variable_name)
        if scale:
            vmin = scale[0]
            vmax = scale[1]
        else:
            vmin = 0
            vmax = np.amax(mags)
            if query.get('colormap') is None or \
                    query.get('colormap') == 'default':
                cmap = colormap.colormaps.get('speed')
    else:
        if scale:
            vmin = scale[0]
            vmax = scale[1]
        else:
            vmin = np.inf
            vmax = -np.inf

            for d in point_data:
                vmin = min(vmin, np.amin(d))
                vmax = max(vmax, np.amax(d))
                if re.search("free surface", variable_name, re.IGNORECASE) or \
                    re.search("surface height", variable_name,
                              re.IGNORECASE) or \
                    re.search("velocity", variable_name, re.IGNORECASE) or \
                        re.search("wind", variable_name, re.IGNORECASE):
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)
            if variable_unit == "fraction":
                vmin = 0
                vmax = 1

    t = times
    if vector:
        point_data = np.ma.expand_dims(mags, 1)

    filename = utils.get_filename(get_dataset_url(dataset_name),
                                  ",".join(names),
                                  variables, variable_unit,
                                  [times[0], times[-1]], None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            # Write Header
            output.write("Time, Latitude, Longitude, ")
            if depth == 'all':
                max_dep_idx = np.where(~point_data[:, 0, 0, :].mask)[1].max()
                output.write(", ".join([
                    "%d%s" % (np.round(dep), depth_unit)
                    for dep in depths[:max_dep_idx + 1]
                ]))
            else:
                output.write("%s (%s)" % (variable_name, variable_unit))
            output.write("\n")

            for idx, p in enumerate(points):
                for idx2, vals in enumerate(point_data[idx, 0, :]):
                    output.write("%s, " % t[idx2].isoformat())
                    output.write("%0.4f, %0.4f, " % tuple(p))
                    if depth == 'all':
                        output.write(", ".join([
                            "%0.4f" % value for value in vals[:max_dep_idx + 1]
                        ]))
                    else:
                        output.write("%0.4f" % vals)

                    output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()

        # Colormap from arguments
        cmap = query.get('colormap')
        if cmap is not None:
            cmap = colormap.colormaps.get(cmap)
        if cmap is None:
            cmap = colormap.find_colormap(variable_name)

        datenum = matplotlib.dates.date2num(t)
        if depth == 'all':
            figuresize = (float(size[0]), float(size[1]) * len(points))
            fig, ax = plt.subplots(
                len(points), 1, sharex=True, figsize=figuresize,
                dpi=float(kwargs.get('dpi')))
            if len(points) == 1:
                ax = [ax]

            LINEAR = 200

            for idx, p in enumerate(points):
                d = point_data[idx, 0, :]
                dlim = np.ma.flatnotmasked_edges(d[0, :])
                maxdepth = depths[dlim[1]]

                c = ax[idx].pcolormesh(
                    datenum, depths[:dlim[1] + 1], d[
                        :, :dlim[1] + 1].transpose(),
                    shading='gouraud', cmap=cmap, vmin=vmin, vmax=vmax)
                ax[idx].invert_yaxis()
                if maxdepth > LINEAR:
                    ax[idx].set_yscale('symlog', linthreshy=LINEAR)
                ax[idx].yaxis.set_major_formatter(ScalarFormatter())

                if maxdepth > LINEAR:
                    l = 10 ** np.floor(np.log10(maxdepth))
                    ax[idx].set_ylim(np.ceil(maxdepth / l) * l, depths[0])
                    ax[idx].set_yticks(
                        list(ax[idx].get_yticks()) + [maxdepth, LINEAR])
                else:
                    ax[idx].set_ylim(maxdepth, depths[0])
                ax[idx].set_ylabel("Depth (%s)" % utils.mathtext(depth_units))

                ax[idx].xaxis_date()
                ax[idx].set_xlim(datenum[0], datenum[-1])

                divider = make_axes_locatable(ax[idx])
                cax = divider.append_axes("right", size="5%", pad=0.05)
                bar = plt.colorbar(c, cax=cax)
                bar.set_label("%s (%s)" % (variable_name.title(),
                                           utils.mathtext(variable_unit)))
                ax[idx].set_title(
                    "%s%s at %s" % (variable_name.title(), depth_label,
                                    names[idx]))
                plt.setp(ax[idx].get_xticklabels(), rotation=30)
            fig.autofmt_xdate()
        else:
            figuresize = (float(size[0]), float(size[1]))
            fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))
            plt.title("%s%s at %s" % (variable_name.title(), depth_label,
                                      ",".join(names)))
            plt.plot_date(
                datenum, point_data[:, 0, :].transpose(), '-', figure=fig)
            plt.ylabel("%s (%s)" % (variable_name.title(),
                                    utils.mathtext(variable_unit)))
            plt.ylim(vmin, vmax)
            plt.gca().xaxis.grid(True)
            plt.gca().yaxis.grid(True)
            fig.autofmt_xdate()

            if len(points) > 1:
                plt.legend(names, loc='best')

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()


def list_stations():
    STATION_DIR = os.path.join(app.config['OVERLAY_KML_DIR'], 'station')

    stations = []
    for f in os.listdir(STATION_DIR):
        if not f.endswith(".kml"):
            continue

        doc = parser.parse(os.path.join(STATION_DIR, f)).getroot()
        folder = doc.Document.Folder

        group = {
            'name': doc.Document.Folder.name.text.encode("utf-8"),
            'stations': []
        }

        for place in folder.Placemark:
            c_txt = place.Point.coordinates.text
            lonlat = c_txt.split(',')

            group['stations'].append({
                'name': place.name.text.encode("utf-8"),
                'point': lonlat[1] + "," + lonlat[0]
            })

        group['stations'] = sorted(group['stations'], key=lambda k: k['name'])

        stations.append(group)

    return stations
