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

        times = None
        temperature = []
        salinity = []
        for p in points:
            data = []
            for v in variables:
                d, t = load_timeseries(
                    dataset,
                    v,
                    range(time, time + 1),
                    'all',
                    float(p[0]),
                    float(p[1])
                )
                if times is None:
                    times = t
                data.append(d)
            temperature.append(data[0])
            salinity.append(data[1])

        depths = depth_var[:]
        depth_unit = depth_var.units

        temperature = np.ma.array(temperature)
        salinity = np.ma.array(salinity)

        if variable_unit.startswith("Kelvin"):
            temperature = np.ma.add(temperature, -273.15)
            variable_unit = "Celsius"

    filename = utils.get_filename(dataset_name, filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            output.write("\n".join([
                "// Dataset: %s" % dataset_name,
                "// Timestamp: %s" % timestamp.isoformat(),
                ""
            ]))
            output.write("Latitude, Longitude, Depth, Salinity, Temperature\n")

            for idx, p in enumerate(points):
                for idx2, val in enumerate(temperature[idx]):
                    if np.ma.is_masked(val):
                        break
                    output.write("%0.4f, %0.4f, %0.1f, %0.1f, %0.2f\n" %
                                 (p[0], p[1],
                                  depths[idx2],
                                  salinity[idx][idx2],
                                  temperature[idx][idx2]))
            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

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

        plt.title("T/S Diagram for %s (%s)" % (", ".join(names),
                                               timestamp.strftime(dformat)))

        smin = np.amin(salinity) - (np.amin(salinity) * 0.01)
        smax = np.amax(salinity) + (np.amax(salinity) * 0.01)
        tmin = np.amin(temperature) - (np.abs(np.amax(temperature) * 0.1))
        tmax = np.amax(temperature) + (np.abs(np.amax(temperature) * 0.1))

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

        for idx, _ in enumerate(temperature):
            plt.plot(salinity[idx], temperature[idx], '-')

        plt.xlabel("Salinity (PSU)")
        plt.ylabel("Temperature (Celsius)")

        if len(points) > 1:
            leg = plt.legend(names, loc='best')
            for legobj in leg.legendHandles:
                legobj.set_linewidth(4.0)
        else:
            labels = []
            for idx, d in enumerate(depths):
                if np.ma.is_masked(data[0][idx]):
                    break
                digits = max(np.ceil(np.log10(d)), 3)
                d = np.round(d, -int(digits - 1))
                if d not in labels:
                    labels.append(d)
                    for idx2, _ in enumerate(temperature):
                        plt.annotate(
                            '{:.0f}{:s}'.format(d, utils.mathtext(depth_unit)),
                            xy=(salinity[idx2][idx], temperature[idx2][idx]),
                            xytext=(15, -15),
                            ha='left',
                            textcoords='offset points',
                            arrowprops=dict(arrowstyle='->')  # , shrinkA=0)
                        )

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
