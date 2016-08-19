from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
from StringIO import StringIO
import utils
from data import load_timeseries
from oceannavigator.util import get_variable_unit, \
    get_dataset_url
import seawater


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    point = query.get('station')
    if point is None or len(point.split(',')) < 2:
        latlon = [47.546667, -52.586667]
    else:
        latlon = point.split(',')

    variables = ['votemper', 'vosaline']

    with Dataset(get_dataset_url(dataset_name), 'r') as dataset:
        if query.get('time') is None or \
           len(str(query.get('starttime'))) == 0:
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

        t = netcdftime.utime(time_var.units)
        timestamp = t.num2date(time_var[time])

        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variables[0]])

        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
        else:
            depth_var = None

        data = []
        times = []
        for v in variables:
            d, t = load_timeseries(
                dataset,
                v,
                range(time, time + 1),
                'all',
                float(latlon[0]),
                float(latlon[1])
            )
            if dataset.variables[v].units.startswith("Kelvin"):
                d = np.add(d, -273.15)
            data.append(d)
            times.append(t)

        depths = depth_var[:]
        depth_unit = depth_var.units

    filename = utils.get_filename(get_dataset_url(dataset_name),
                                  query.get('station'),
                                  variables, variable_unit,
                                  [times[0][0], times[0][-1]], None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            output.write("Depth, Salinity, Temperature\n")

            for idx, val in enumerate(data[0]):
                if np.ma.is_masked(val):
                    break
                else:
                    print val
                output.write("%0.1f, %0.1f, %0.2f\n" % (depths[idx],
                                                        data[1][idx],
                                                        val))
            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        station_name = query.get('station_name')
        if station_name is None or station_name == '':
            station_name = "(%1.4f, %1.4f)" % (
                float(latlon[0]), float(latlon[1]))

        quantum = query.get('dataset_quantum')
        if quantum == 'month':
            dformat = "%B %Y"
        elif quantum == 'day':
            dformat = "%d %B %Y"
        elif quantum == 'hour':
            dformat = "%H:%M %d %B %Y"
        else:
            if 'monthly' in get_dataset_url(dataset_name):
                dformat = "%B %Y"
            else:
                dformat = "%d %B %Y"
        plt.title("T/S Diagram for %s (%s)" % (station_name,
                                               timestamp.strftime(dformat)))

        smin = np.amin(data[1]) - (np.amin(data[1]) * 0.01)
        smax = np.amax(data[1]) + (np.amax(data[1]) * 0.01)
        tmin = np.amin(data[0]) - (np.abs(np.amax(data[0]) * 0.1))
        tmax = np.amax(data[0]) + (np.abs(np.amax(data[0]) * 0.1))

        xdim = round((smax - smin) / 0.1 + 1, 0)
        ydim = round((tmax - tmin) + 1, 0)

        dens = np.zeros((ydim, xdim))
        ti = np.linspace(0, ydim - 1, ydim) + tmin
        si = np.linspace(0, xdim - 1, xdim) * 0.1 + smin

        for j in range(0, int(ydim)):
            for i in range(0, int(xdim)):
                dens[j, i] = seawater.dens(si[i], ti[j], 0)

        dens = dens - 1000

        CS = plt.contour(si, ti, dens, linestyles='dashed', colors='k')
        plt.clabel(CS, fontsize=16, inline=1, fmt=r"$\sigma_t = %1.1f$")
        plt.plot(data[1], data[0], '-')

        labels = []
        for idx, d in enumerate(depths):
            if np.ma.is_masked(data[0][idx]):
                break
            digits = max(np.ceil(np.log10(d)), 3)
            d = np.round(d, -int(digits - 1))
            if d not in labels:
                labels.append(d)
                plt.annotate(
                    '{:.0f}{:s}'.format(d, utils.mathtext(depth_unit)),
                    xy=(data[1][idx], data[0][idx]),
                    xytext=(15, -15),
                    ha='left',
                    textcoords='offset points',
                    arrowprops=dict(arrowstyle='->')  # , shrinkA=0)
                )

        plt.xlabel("Salinity (PSU)")
        plt.ylabel("Temperature (Celsius)")

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
