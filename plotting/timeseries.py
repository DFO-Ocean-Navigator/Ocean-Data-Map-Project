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


def plot(url, climate_url=None, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    point = query.get('station')
    if point is None or len(point.split(',')) < 2:
        latlon = [47.546667, -52.586667]
    else:
        latlon = point.split(',')

    scale = query.get('scale')
    if scale is None or scale == 'auto':
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

    with Dataset(url, 'r') as dataset:
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

        variable_unit = dataset.variables[variables[0]].units
        variable_name = dataset.variables[
            variables[0]].long_name.replace(" at CMC", "")

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

        if ('deptht' not in dataset.variables[variables[0]].dimensions and
                'depth' not in dataset.variables[variables[0]].dimensions):
            depth = 0

        data = []
        times = []
        for v in variables:
            d, t = load_timeseries(
                dataset,
                v,
                range(starttime, endtime + 1),
                depth,
                float(latlon[0]),
                float(latlon[1])
            )
            data.append(d)
            times.append(t)

        if depth_var is not None:
            depths = depth_var[:]
            depth_unit = depth_var.units
        else:
            depths = [0]
            depth_unit = "m"

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"
        for idx, val in enumerate(data):
            data[idx] = np.add(val, -273.15)

    if vector:
        mag = np.sqrt(data[0] ** 2 + data[1] ** 2)
        variable_name = re.sub(
            r"(?i)( x | y |zonal |meridional |northward |eastward )", " ",
            variable_name)
        if scale:
            vmin = scale[0]
            vmax = scale[1]
        else:
            vmin = 0
            vmax = np.amax(mag)
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

            for d in data:
                vmin = min(vmin, np.amin(d))
                vmax = max(vmax, np.amax(d))
                if re.search("free surface", variable_name) or \
                    re.search("velocity", variable_name) or \
                        re.search("wind", variable_name):
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)
            if variable_unit == "fraction":
                vmin = 0
                vmax = 1

    d = data[0]
    t = times[0]
    if vector:
        d = mag

    filename = utils.get_filename(url, query.get('station'),
                                  variables, variable_unit,
                                  [times[0][0], times[0][-1]], None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            # Write Header
            output.write("Time, ")
            if depth == 'all':
                d = np.ma.compress_cols(d)
                output.write(", ".join([
                    "%d%s" % (np.round(dep), depth_unit)
                    for dep in depths[:d.shape[1]]
                ]))
            else:
                output.write("%s (%s)" % (variable_name, variable_unit))
            output.write("\n")

            for idx, vals in enumerate(d):
                output.write("%s, " % t[idx].isoformat())
                if depth == 'all':
                    output.write(", ".join([
                        "%0.4f" % value for value in vals
                    ]))
                else:
                    output.write("%0.4f" % vals)

                output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()

        pass
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        # Colormap from arguments
        cmap = query.get('colormap')
        if cmap is not None:
            cmap = colormap.colormaps.get(cmap)
        if cmap is None:
            cmap = colormap.find_colormap(variable_name)

        station_name = query.get('station_name')
        if station_name is None or station_name == '':
            station_name = "(%1.4f, %1.4f)" % (
                float(latlon[0]), float(latlon[1]))
        plt.title("%s%s at %s" % (variable_name.title(), depth_label,
                                  station_name))

        datenum = matplotlib.dates.date2num(t)
        if depth == 'all':
            LINEAR = 200
            dlim = np.ma.flatnotmasked_edges(d[0, :])
            maxdepth = depths[dlim[1]]

            c = plt.pcolormesh(
                datenum, depths[:dlim[1] + 1], d[:, :dlim[1] + 1].transpose(),
                shading='gouraud', cmap=cmap, vmin=vmin, vmax=vmax)
            plt.gca().invert_yaxis()
            if maxdepth > LINEAR:
                plt.yscale('symlog', linthreshy=LINEAR)
            plt.gca().yaxis.set_major_formatter(ScalarFormatter())
            plt.gca().xaxis_date()

            plt.xlim(datenum[0], datenum[-1])
            if maxdepth > LINEAR:
                l = 10 ** np.floor(np.log10(maxdepth))
                plt.ylim(np.ceil(maxdepth / l) * l, depths[0])
                plt.yticks(list(plt.yticks()[0]) + [maxdepth, LINEAR])
            else:
                plt.ylim(maxdepth, depths[0])
            plt.ylabel("Depth (%s)" % depth_units)
            fig.autofmt_xdate()

            divider = make_axes_locatable(plt.gca())
            cax = divider.append_axes("right", size="5%", pad=0.05)
            bar = plt.colorbar(c, cax=cax)
            bar.set_label(variable_name.title() + " (" + variable_unit + ")")
        else:
            plt.plot_date(datenum, d, '-', figure=fig)
            plt.ylabel(variable_name.title() + " (" + variable_unit + ")")
            plt.gca().xaxis.grid(True)
            plt.gca().yaxis.grid(True)
            fig.autofmt_xdate()

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
            'name': doc.Document.Folder.name.text,
            'stations': []
        }

        for place in folder.Placemark:
            c_txt = place.Point.coordinates.text
            lonlat = c_txt.split(',')

            group['stations'].append({'name': str(place.name), 'point':
                                      lonlat[1] + "," + lonlat[0]})

        group['stations'] = sorted(group['stations'], key=lambda k: k['name'])

        stations.append(group)

    return stations
