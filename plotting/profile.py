from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
from StringIO import StringIO
import utils
from data import load_timeseries
from textwrap import wrap
from oceannavigator.util import get_variable_unit, get_variable_name, \
    get_dataset_url, get_dataset_climatology
import re
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

    variables = query.get('variable')
    if variables is None:
        variables = 'votemper,vosaline'

    if isinstance(variables, str) or isinstance(variables, unicode):
        variables = variables.split(',')

    variables_anom = variables
    variables = [re.sub('_anom$', '', v) for v in variables]

    variable_names = []
    variable_units = []

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

        for idx, v in enumerate(variables):
            variable_names.append(get_variable_name(dataset_name,
                                                    dataset.variables[v]))
            variable_units.append(get_variable_unit(dataset_name,
                                                    dataset.variables[v]))
            if variables_anom[idx] != variables[idx]:
                variable_names[-1] = variable_names[-1] + " Anomaly"

        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
        else:
            depth_var = None

        times = None
        point_data = []
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
            point_data.append(np.ma.array(data))

        depths = depth_var[:]
        depth_unit = depth_var.units

        point_data = np.ma.array(point_data)

        for idx, unit in enumerate(variable_units):
            if unit.startswith("Kelvin"):
                variable_units[idx] = "Celsius"
                point_data[:, idx, :] = point_data[:, idx, :] - 273.15

    if variables != variables_anom:
        with Dataset(get_dataset_climatology(dataset_name), 'r') as dataset:
            for p_idx, p in enumerate(points):
                data = []
                for idx, v in enumerate(variables):
                    if v != variables_anom[idx]:
                        d, t = load_timeseries(
                            dataset,
                            v,
                            range(timestamp.month - 1, timestamp.month),
                            'all',
                            float(p[0]),
                            float(p[1])
                        )
                        point_data[p_idx, idx] = point_data[p_idx, idx] - d

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
            output.write("Latitude, Longitude, Depth, ")
            output.write(", ".join(map(lambda x: "%s (%s)" % x,
                                       zip(variable_names, variable_units))))
            output.write("\n")

            # For each point
            for p in range(0, point_data.shape[0]):
                for d in range(0, point_data.shape[2]):
                    if point_data[p, :, d].mask.all():
                        continue
                    output.write("%0.4f, %0.4f, " % tuple(points[p]))
                    output.write("%0.1f, " % depths[d])
                    output.write(", ".join(map(lambda v: "%0.1f" % v,
                                               point_data[p, :, d])))
                    output.write("\n")

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    elif filetype == 'txt':
        output = StringIO()
        try:
            output.write("//<CreateTime>%s</CreateTime>\n" %
                         datetime.datetime.now().isoformat())
            output.write("//<Software>Ocean Navigator</Software>\n")
            output.write("\t".join([
                "Cruise",
                "Station",
                "Type",
                "yyyy-mm-ddThh:mm:ss.sss",
                "Longitude [degrees_east]",
                "Latitude [degrees_north]",
                "Depth [m]"
            ] + map(lambda x: "%s [%s]" % x, zip(variable_names,
                                                 variable_units))))
            output.write("\n")

            cruise = dataset_name

            first_point = True
            # For each point
            for p in range(0, point_data.shape[0]):
                first_depth = True

                # For each depth
                for d in range(0, point_data.shape[2]):
                    if point_data[p, :, d].mask.any():
                        continue

                    if first_depth:
                        output.write("\t".join([
                            cruise,
                            names[p],
                            "C",
                            timestamp.isoformat(),
                            "%0.4f" % points[p][1],
                            "%0.4f" % points[p][0],
                        ]))
                        first_depth = False
                    else:
                        output.write("\t" * 5)

                    output.write("\t".join([
                        "",
                        "%d" % depths[d],
                    ] + map(lambda x: "%0.1f" % x, point_data[p, :,
                                                              d].tolist())))
                    output.write("\n")

                if first_point:
                    first_point = False
                    cruise = ""

            return (output.getvalue(), mime, filename)
        finally:
            output.close()
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))

        # fig, (ax1, ax2) = plt.subplots(1, 2, sharey=True,
        fig, ax = plt.subplots(1, len(variables), sharey=True,
                               figsize=figuresize,
                               dpi=float(kwargs.get('dpi')))
        if len(variables) == 1:
            ax = [ax]

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

        for idx, _ in enumerate(variables):
            ax[idx].plot(point_data[:, idx, :].transpose(), depths)
            ax[idx].xaxis.set_label_position('top')
            ax[idx].xaxis.set_ticks_position('top')
            ax[idx].set_xlabel("%s (%s)" %
                               (variable_names[idx],
                                utils.mathtext(variable_units[idx])))
            if variables[idx] != variables_anom[idx]:
                xlim = np.abs(ax[idx].get_xlim()).max()
                ax[idx].set_xlim([-xlim, xlim])

        ax[0].invert_yaxis()
        ax[0].set_ylabel("Depth (%s)" % utils.mathtext(depth_unit))

        if len(points) > 1:
            leg = plt.legend(names, loc='best')
            for legobj in leg.legendHandles:
                legobj.set_linewidth(4.0)

        plt.suptitle("\n".join(wrap(
            "%s Profile for %s (%s)" %
                    (", ".join(variable_names),
                     ", ".join(names),
                     timestamp.strftime(dformat)), 80)))
        fig.tight_layout()
        fig.subplots_adjust(top=0.88)

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
