from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
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

    point = query.get('station')
    if point is None or len(point.split(',')) < 2:
        latlon = [47.546667, -52.586667]
    else:
        latlon = point.split(',')

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

        temperature = data[0]
        salinity = data[1]

        depthm = (depths * ureg.parse_expression(depth_unit)).to(ureg.meter)
        pressure = seawater.pres(depthm, float(latlon[0]))

        sspeed = seawater.svel(salinity, temperature, pressure)

    filename = utils.get_filename(get_dataset_url(dataset_name),
                                  query.get('station'),
                                  variables, variable_unit,
                                  [times[0][0], times[0][-1]], None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            output.write(
                "Depth, Pressure, Salinity, Temperature, Sound Speed\n")

            for idx, val in enumerate(temperature):
                if np.ma.is_masked(val):
                    break
                output.write("%0.1f, %0.1f, %0.1f, %0.1f, %0.1f\n" %
                             (depths[idx],
                              pressure[idx],
                              salinity[idx],
                              temperature[idx],
                              sspeed[idx]))
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

        quantum = query.get('quantum')
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

        plt.plot(sspeed, depthm, '-')

        minspeed = np.amin(sspeed)
        maxspeed = np.amax(sspeed)
        plt.xlim([
            np.amin(sspeed) - (maxspeed - minspeed) * 0.1,
            np.amax(sspeed) + (maxspeed - minspeed) * 0.1,
        ])
        plt.xlabel("Sound Speed (m/s)")
        plt.ylabel("Depth (m)")
        ax = plt.gca()
        ax.invert_yaxis()
        ax.xaxis.set_ticks_position('top')
        ax.xaxis.set_label_position('top')
        plt.title("Sound Speed Profile for %s (%s)" %
                  (station_name, timestamp.strftime(dformat)))
        ax.title.set_position([.5, 1.10])
        plt.subplots_adjust(top=0.85)
        ax.xaxis.grid(True)

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
