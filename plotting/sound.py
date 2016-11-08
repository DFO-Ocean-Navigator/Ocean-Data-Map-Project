from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import matplotlib.ticker as tkr
import numpy as np
from StringIO import StringIO
import utils
from data import load_timeseries
from oceannavigator.util import get_variable_unit, get_dataset_url
import seawater
from pint import UnitRegistry


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    points = query.get('station')
    if points is None or len(points) < 1:
        latlon = [[47.546667, -52.586667]]
    else:
        latlon = points

    variables = ['votemper', 'vosaline']
    ureg = UnitRegistry()

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
        for p in latlon:
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

        depthm = (depths * ureg.parse_expression(depth_unit)).to(ureg.meter)
        pressure = [seawater.pres(depthm, ll[0]) for ll in latlon]

        sspeed = seawater.svel(salinity, temperature, pressure)

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
            output.write(
                "Latitude, Longitude, Depth, Pressure, Salinity, Temperature, Sound Speed\n")

            for idx, p in enumerate(points):
                for idx2, val in enumerate(temperature[idx]):
                    if np.ma.is_masked(val):
                        break
                    output.write("%0.4f, %0.4f, %0.1f, %0.1f, %0.1f, %0.1f, %0.1f\n" %
                                (p[0], p[1],
                                 depths[idx],
                                 pressure[idx][idx2],
                                 salinity[idx][idx2],
                                 temperature[idx][idx2],
                                 sspeed[idx][idx2]))
            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        names = query.get('names')
        if names is None or \
                len(names) == 0 or \
                len(names) != len(points) or \
                names[0] is None:
            names = ["(%1.4f, %1.4f)" % (float(l[0]), float(l[1])) for l in
                     latlon]

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

        ax = plt.gca()
        for ss in sspeed:
            ax.plot(ss, depthm, '-')

        minspeed = np.amin(sspeed)
        maxspeed = np.amax(sspeed)

        ax.set_xlim([
            np.amin(sspeed) - (maxspeed - minspeed) * 0.1,
            np.amax(sspeed) + (maxspeed - minspeed) * 0.1,
        ])
        ax.set_xlabel("Sound Speed (m/s)")
        ax.set_ylabel("Depth (m)")
        ax.invert_yaxis()
        ax.xaxis.set_ticks_position('top')
        ax.xaxis.set_label_position('top')
        x_format = tkr.FuncFormatter(lambda x, pos: "%d" % x)
        ax.xaxis.set_major_formatter(x_format)
        ax.set_title("Sound Speed Profile for %s (%s)" %
                    (", ".join(names), timestamp.strftime(dformat)))
        ax.title.set_position([.5, 1.10])
        plt.subplots_adjust(top=0.85)
        ax.xaxis.grid(True)

        if len(latlon) > 1:
            leg = plt.legend(names, loc='best')
            for legobj in leg.legendHandles:
                legobj.set_linewidth(4.0)

        ylim = ax.get_ylim()
        ax2 = ax.twinx()
        depthm = (depths * ureg.parse_expression(depth_unit)).to(ureg.meter)
        ax2.set_ylim((ylim * ureg.meters).to(ureg.feet).magnitude)
        ax2.set_ylabel("Depth (ft)")

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
