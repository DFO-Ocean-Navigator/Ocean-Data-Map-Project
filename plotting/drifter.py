from grid import Grid
from mpl_toolkits.basemap import Basemap
from netCDF4 import Dataset, netcdftime
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
from StringIO import StringIO
import utils
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url
import pytz
import dateutil.parser


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    drifter = query.get('drifter')
    if isinstance(drifter, str) or isinstance(drifter, unicode):
        drifters = drifter.split(',')
    else:
        drifters = drifter

    buoyvariable = query.get('buoyvariable')
    if isinstance(buoyvariable, str) or isinstance(buoyvariable, unicode):
        buoyvariables = buoyvariable.split(',')
    else:
        buoyvariables = buoyvariable

    points = []
    times = []
    names = []
    data = []
    data_names = []
    data_units = []

    ds_url = 'http://localhost:8080/thredds/dodsC/misc/output/%s.nc'
    for drifter in drifters:
        with Dataset(ds_url % drifter, 'r') as ds:
            names.append(ds.buoyid)

            t = netcdftime.utime(ds['data_date'].units)

            d = []
            for v in buoyvariables:
                d.append(ds[v][:])
                if "long_name" in ds[v].ncattrs():
                    data_names.append(ds[v].long_name)
                else:
                    data_names.append(v)

                if "units" in ds[v].ncattrs():
                    data_units.append(ds[v].units)
                else:
                    data_units.append(None)

            data.append(d)

            times.append(t.num2date(ds['data_date'][:]))
            points.append(np.array([
                ds['latitude'][:],
                ds['longitude'][:],
            ]).transpose())

    data_names = data_names[:len(buoyvariables)]
    data_units = data_units[:len(buoyvariables)]

    for i, t in enumerate(times):
        for j, tt in enumerate(t):
            if tt.tzinfo is None:
                times[i][j] = tt.replace(tzinfo=pytz.UTC)

    start = query.get('starttime')
    if start is not None:
        d = dateutil.parser.parse(start)
        start = []
        for t in times:
            start.append(np.where(t >= d)[0].min())
    else:
        start = [0] * len(times)

    end = query.get('endtime')
    if end is not None:
        d = dateutil.parser.parse(end)
        end = []
        for t in times:
            end.append(np.where(t <= d)[0].max() + 1)
    else:
        end = []
        for t in times:
            end.append(len(t))

    scale = query.get('scale')
    if scale is None or 'auto' in scale:
        scale = None
    else:
        scale = [float(x) for x in scale.split(',')]

    showmap = query.get('showmap') is None or bool(query.get('showmap'))
    latlon = query.get('latlon') is None or bool(query.get('latlon'))

    interp = query.get('interpolation')
    if interp is None or interp == '':
        interp = {
            'method': 'inv_square',
            'neighbours': 8,
        }

    model_data = []

    with Dataset(get_dataset_url(dataset_name), 'r') as dataset:
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
        else:
            depth = depth_var[:]

        depth = 0

        variable = query.get('variable')
        if isinstance(variable, str) or isinstance(variable, unicode):
            variables = query.get('variable').split(',')
        else:
            variables = variable

        for idx, p in enumerate(points):
            d = []
            for v in variables:
                md = grid.path(
                    dataset.variables[v],
                    depth, p, times[idx], interpolation=interp)
                d.append(md)
            model_data.append(np.ma.array(d))

        variable_names = []
        variable_units = []

        for v in variables:
            variable_units.append(get_variable_unit(dataset_name,
                                                    dataset.variables[v]))
            variable_names.append(get_variable_name(dataset_name,
                                                    dataset.variables[v]))

        for idx, u in enumerate(variable_units):
            if u.startswith("Kelvin"):
                variable_units[idx] = "Celsius"

                for i, d in enumerate(model_data):
                    model_data[i][idx, :] = d[idx, :] - 273.15

    filename = utils.get_filename(dataset_name, filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            output.write("Time, BuoyID, Latitude, Longitude, ")
            output.write(", ".join(map(lambda n: "Buoy " + n, data_names) +
                                   map(lambda n: "Model " + n, variable_names)
                                   ))
            output.write("\n")

            for p_idx, p in enumerate(points):
                for idx, t in enumerate(times[p_idx]):
                    output.write(
                        "%s, %s, %0.4f, %0.4f" % (
                            t.isoformat(),
                            names[p_idx],
                            p[idx][0],
                            p[idx][1])
                    )
                    for v in range(0, len(data_names)):
                        output.write(", %0.1f" % data[p_idx][v][idx])
                    for v in range(0, len(variables)):
                        output.write(", %0.1f" % model_data[p_idx][v, idx])
                    output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        if showmap:
            width = 2
            width_ratios = [2, 7]
        else:
            width = 1
            width_ratios = [1]

        numplots = len(variables) + len(buoyvariables)
        if "votemper" in variables and "sst" in buoyvariables:
            numplots -= 1

        if latlon:
            numplots += 2

        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]) * numplots)
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))
        gs = gridspec.GridSpec(numplots, width, width_ratios=width_ratios)

        # Bounds for map view
        minlat = 90
        maxlat = -90
        minlon = 360
        maxlon = -360
        for idx, p in enumerate(points):
            minlat = min(minlat, np.amin(p[start[idx]:end[idx], 0]))
            maxlat = max(maxlat, np.amax(p[start[idx]:end[idx], 0]))
            minlon = min(minlon, np.amin(p[start[idx]:end[idx], 1]))
            maxlon = max(maxlon, np.amax(p[start[idx]:end[idx], 1]))

        pp = np.hstack(points)
        lat_d = max(maxlat - minlat, 20)
        lon_d = max(maxlon - minlon, 20)
        minlat -= lat_d / 3
        minlon -= lon_d / 3
        maxlat += lat_d / 3
        maxlon += lon_d / 3

        minlat = max(-90, minlat)
        maxlat = min(90, maxlat)

        if showmap:
            # Plot the path on a map
            if numplots > 1:
                plt.subplot(gs[:, 0])
            else:
                plt.subplot(gs[0])
            m = Basemap(
                llcrnrlon=minlon,
                llcrnrlat=minlat,
                urcrnrlon=maxlon,
                urcrnrlat=maxlat,
                lat_0=np.mean(pp[0]),
                lon_0=np.mean(pp[1]),
                resolution='c', projection='merc',
                rsphere=(6378137.00, 6356752.3142),
            )

            for idx, p in enumerate(points):
                m.plot(p[start[idx]:end[idx], 1], p[
                       start[idx]:end[idx], 0], latlon=True, linestyle='-')
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

        # Plot observed
        if showmap:
            subplot = 1
            subplot_inc = 2
        else:
            subplot = 0
            subplot_inc = 1

        for j, v in enumerate(buoyvariables):
            plt.subplot(gs[subplot])
            subplot += subplot_inc

            for idx, _ in enumerate(times):
                plt.plot(times[idx][start[idx]:end[idx]],
                         data[idx][j][start[idx]:end[idx]])

                if v == 'sst' and 'votemper' in variables:
                    i = variables.index('votemper')
                    plt.plot(
                        times[idx][
                            start[idx]:end[idx]],
                        model_data[idx][i][start[idx]:end[idx]])

            legend = names
            if v == 'sst' and 'votemper' in variables:
                legend = legend + ["%s (Modelled)" % n for n in names]

            if len(names) == 1 and 'votemper' in variables and v == 'sst':
                legend = ["Observed", "Modelled"]

            if len(legend) > 1:
                leg = plt.legend(legend, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            if data_units[j] is not None:
                plt.ylabel("%s (%s)" % (data_names[j],
                                        utils.mathtext(data_units[j])))
            else:
                plt.ylabel(data_names[j]),

            plt.setp(plt.gca().get_xticklabels(), rotation=30)

        for idx, v in enumerate(variables):
            if v == 'votemper' and 'sst' in buoyvariables:
                continue

            plt.subplot(gs[subplot])
            subplot += subplot_inc

            for i, _ in enumerate(times):
                plt.plot(times[i][start[i]:end[i]],
                         model_data[i][idx][start[i]:end[i]])
            if len(names) > 1:
                leg = plt.legend(names, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            plt.ylabel("%s (%s)" % (variable_names[idx],
                                    utils.mathtext(variable_units[idx])))
            plt.setp(plt.gca().get_xticklabels(), rotation=30)

        # latlon
        if latlon:
            plt.subplot(gs[subplot])
            subplot += subplot_inc

            for idx, _ in enumerate(times):
                plt.plot(times[idx][start[idx]:end[idx]],
                         points[idx][start[idx]:end[idx], 0])

            plt.ylabel("Latitude (degrees)")

            if len(names) > 1:
                leg = plt.legend(names, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            plt.setp(plt.gca().get_xticklabels(), rotation=30)

            plt.subplot(gs[subplot])
            subplot += subplot_inc

            for idx, _ in enumerate(times):
                plt.plot(times[idx][start[idx]:end[idx]],
                         points[idx][start[idx]:end[idx], 1])

            plt.ylabel("Longitude (degrees)")

            if len(names) > 1:
                leg = plt.legend(names, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            plt.setp(plt.gca().get_xticklabels(), rotation=30)

        # fig.suptitle(variable_name + ", " + timestamp.strftime(dformat) +
        #              "\n" + transect_name)
        fig.tight_layout(pad=3, w_pad=4)
        # if velocity:
        #     fig.subplots_adjust(top=0.9)
        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
