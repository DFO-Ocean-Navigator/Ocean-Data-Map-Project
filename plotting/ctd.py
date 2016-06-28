from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
from StringIO import StringIO
import utils
from data import load_timeseries
from oceannavigator.util import get_variable_unit, get_variable_name, \
    get_dataset_url


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

        temperature_name = get_variable_name(dataset_name,
                                             dataset.variables[variables[0]])
        temperature_unit = get_variable_unit(dataset_name,
                                             dataset.variables[variables[0]])
        salinity_name = get_variable_name(dataset_name,
                                          dataset.variables[variables[1]])
        salinity_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variables[1]])

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
            data.append(d)
            times.append(t)

        depths = depth_var[:]
        depth_unit = depth_var.units

        temperature = data[0]
        salinity = data[1]

        if temperature_unit.startswith("Kelvin"):
            temperature = np.add(temperature, -273.15)
            temperature_unit = "Celsius"

    filename = utils.get_filename(get_dataset_url(dataset_name),
                                  query.get('station'),
                                  variables, temperature_unit + "," +
                                  salinity_unit,
                                  [times[0][0], times[0][-1]], None,
                                  filetype)
    if filetype == 'csv':
        # CSV File
        output = StringIO()
        try:
            output.write(
                "Depth, Temperature, Salinity\n")

            for idx, val in enumerate(temperature):
                if np.ma.is_masked(val):
                    break
                output.write("%0.1f, %0.1f, %0.1f, %0.1f, %0.1f\n" %
                             (depths[idx], temperature[idx], salinity[idx]))
            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        # fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))
        fig, (ax1, ax2) = plt.subplots(1, 2, sharey=True,
                                       figsize=figuresize,
                                       dpi=float(kwargs.get('dpi')))

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

        ax1.plot(temperature, depths, 'b-')
        ax1.invert_yaxis()
        ax1.set_ylabel("Depth (%s)" % depth_unit)
        ax1.set_xlabel("%s (%s)" % (temperature_name, temperature_unit))
        ax1.xaxis.set_label_position('top')
        ax1.xaxis.set_ticks_position('top')
        ax2.plot(salinity, depths, 'r-')
        ax2.set_xlabel("%s (%s)" % (salinity_name, salinity_unit))
        ax2.xaxis.set_label_position('top')
        ax2.xaxis.set_ticks_position('top')

        plt.suptitle("CTD Profile for %s (%s)" %
                    (station_name, timestamp.strftime(dformat)))
        fig.tight_layout()
        fig.subplots_adjust(top=0.90)

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
