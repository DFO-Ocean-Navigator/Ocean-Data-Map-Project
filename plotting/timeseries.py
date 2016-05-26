from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
from mpl_toolkits.axes_grid1 import make_axes_locatable
from matplotlib.ticker import ScalarFormatter
import matplotlib
import numpy as np
import re
import colormap
import cStringIO
from grid import Grid
import os
from oceannavigator import app
from pykml import parser


def plot(url, climate_url, **kwargs):
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

    dataset = Dataset(url, 'r')

    # if query.get('time') is None or len(query.get('time')) == 0:
    #     time = -1
    # else:
    #     time = int(query.get('time'))

    # if time >= dataset.variables['time_counter'].shape[0]:
    #     time = -1

    variable_unit = dataset.variables[variables[0]].units
    variable_name = dataset.variables[
        variables[0]].long_name.replace(" at CMC", "")

    depth = 0
    if query.get('depth') and len(query.get('depth')) > 0:
        if query.get('depth') == 'all':
            depth = 'all'
            depth_label = ''
        else:
            depth = int(query.get('depth'))
            if depth >= dataset.variables['deptht'].shape[0]:
                depth = 0

    depth_units = dataset.variables['deptht'].units
    if 'deptht' in dataset.variables and \
       depth != 'all' and \
       'deptht' in dataset.variables[variables[0]].dimensions:
        depth_label = " at %d%s" % (dataset.variables['deptht'][depth],
                                    depth_units)
    else:
        depth_label = ''

    grid = Grid(dataset, 'nav_lat', 'nav_lon')
    y, x = grid.find_index([float(latlon[0])], [float(latlon[1])])

    data = []
    times = []
    t = netcdftime.utime(dataset.variables["time_counter"].units)
    for v in variables:
        var = dataset.variables[v]
        if len(var.shape) == 4:
            if depth == 'all':
                d = var[:, :, y[0], x[0]]
            else:
                d = var[:, depth, y[0], x[0]]
        elif len(var.shape) == 3:
            d = var[:, y[0], x[0]]
            depth = 0
        else:
            d = []

        times.append(t.num2date(dataset.variables["time_counter"][:]))

        data.append(d)
    depths = dataset.variables['deptht'][:]

    # timestamp = t.num2date(
    #     dataset.variables["time_counter"][time])
    dataset.close()

    # Figure size
    size = kwargs.get('size').replace("x", " ").split()
    figuresize = (float(size[0]), float(size[1]))
    fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

    # Colormap from arguments
    cmap = query.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(cmap)
    if cmap is None:
        # if anom:
        #     cmap = colormap.colormaps['anomaly']
        # else:
            cmap = colormap.find_colormap(variable_name)

    if variable_unit == "Kelvins":
        variable_unit = "Celsius"
        for idx, val in enumerate(data):
            data[idx] = np.add(val, -273.15)

    if vector:
        mag = np.sqrt(data[0] ** 2 + data[1] ** 2)
        variable_name = re.sub(r"(?i)( x | y |zonal |meridional )", " ",
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

        # c = m.imshow(mag, vmin=vmin, vmax=vmax, cmap=cmap)

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
                   re.search("wind", variable_name):  # or \
                        # anom:
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)
                    if variable_unit == "fraction":
                        vmin = 0
                        vmax = 1

    station_name = query.get('station_name')
    if station_name is None or station_name == '':
        station_name = "(%1.4f, %1.4f)" % (float(latlon[0]), float(latlon[1]))
    plt.title("%s%s at %s" % (variable_name.title(), depth_label,
                              station_name))

    d = data[0]
    t = times[0]
    if vector:
        d = mag
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

    # if 'monthly' in url:
    #     dformat = "%B %Y"
    # else:
    #     dformat = "%d %B %Y"
    # fig.tight_layout(pad=3, w_pad=4)
    # Output the plot
    buf = cStringIO.StringIO()
    try:
        plt.savefig(buf, format='png')
        plt.close(fig)
        return buf.getvalue()
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
