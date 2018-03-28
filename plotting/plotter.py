from abc import ABCMeta, abstractmethod
from io import StringIO
import matplotlib.pyplot as plt
import datetime
import numpy as np
import plotting.utils
import plotting.colormap
import re
import pint
from oceannavigator.util import (
    get_variable_unit,
    get_variable_name,
    get_variable_scale_factor,
    get_dataset_attribution
)
from flask_babel import format_date, format_datetime
import contextlib
from PIL import Image


# Base class for all plotting objects
class Plotter(metaclass=ABCMeta):
    def __init__(self, dataset_name, query, format):
        self.dataset_name = dataset_name
        self.query = query
        self.format = format
        self.dpi = 72.
        self.size = '11x9'
        self.compare = False
        self.filetype, self.mime = utils.get_mimetype(format)
        self.filename = utils.get_filename(
            self.plottype,
            dataset_name,
            self.filetype
        )

    # Called by views.py to parse query, load data, and return the generated file
    # to be displayed by Javascript.
    def run(self, **kwargs):
        if 'size' in kwargs and kwargs.get('size') is not None:
            self.size = kwargs.get('size')

        if 'dpi' in kwargs and kwargs.get('dpi') is not None:
            self.dpi = float(kwargs.get('dpi'))

        # Extract requested data
        self.parse_query(self.query)

        self.load_data()

        if self.filetype == 'csv':
            return self.csv()
        elif self.filetype == 'txt':
            return self.odv_ascii()
        else:
            return self.plot()

    # Receives query sent from javascript and parses it.
    @abstractmethod
    def parse_query(self, query):
        quantum = query.get('quantum')
        if quantum == 'month':
            self.date_formatter = lambda x: format_date(x, "MMMM yyyy")
        elif quantum == 'day':
            self.date_formatter = lambda x: format_date(x, "long")
        elif quantum == 'hour':
            self.date_formatter = lambda x: format_datetime(x)
        else:
            self.date_formatter = lambda x: format_date(x, "long")

        def get_time(param):
            if query.get(param) is None or len(str(query.get(param))) == 0:
                return -1
            else:
                try:
                    return int(query.get(param))
                except ValueError:
                    return query.get(param)

        self.time = get_time('time')
        self.starttime = get_time('starttime')
        self.endtime = get_time('endtime')

        # Parse variable scale
        def parse_scale(query_scale):
            if query_scale is None or 'auto' in query_scale:
                return None     
            return [float(x) for x in query_scale.split(',')]

        self.scale = parse_scale(query.get('scale'))

        variables = query.get('variable')
        if variables is None:
            variables = ['votemper']

        if isinstance(variables, str) or isinstance(variables, str):
            variables = variables.split(',')

        self.variables = [v for v in variables if v != '']

        # Parse right-view if in compare mode
        if query.get("compare_to") is not None:
            self.compare = query.get("compare_to")
            self.compare['variables'] = self.compare['variable'].split(',')

            if self.compare['colormap_diff'] == 'default':
                self.compare['colormap_diff'] = 'anomaly'

            try:
                # Variable scale
                self.compare['scale'] = parse_scale(self.compare['scale'])
            except KeyError:
                print("Ignoring scale attribute.")
            try:
                # Difference plot scale
                self.compare['scale_diff'] = parse_scale(self.compare['scale_diff'])
            except KeyError:
                print "Ignoring scale_diff attribute."

        cmap = query.get('colormap')
        if cmap is not None:
            cmap = colormap.colormaps.get(cmap)
        self.cmap = cmap

        linearthresh = query.get('linearthresh')
        if linearthresh is None or linearthresh == '':
            linearthresh = 200
        linearthresh = float(linearthresh)
        if not linearthresh > 0:
            linearthresh = 1
        self.linearthresh = linearthresh

        depth = query.get('depth')
        if depth is None or len(str(depth)) == 0:
            depth = 0

        if isinstance(depth, str) and depth.isdigit():
            depth = int(depth)

        if isinstance(depth, list):
            for i in range(0, len(depth)):
                if isinstance(depth[i], str) and depth[i].isdigit():
                    depth[i] = int(depth[i])

        self.depth = depth

        self.showmap = query.get('showmap') is None or \
            bool(query.get('showmap'))

    @abstractmethod
    def load_data(self):
        pass

    def load_misc(self, data, variables):
        self.variable_names = self.get_variable_names(data, variables)
        self.variable_units = self.get_variable_units(data, variables)
        self.scale_factors = self.get_variable_scale_factors(data, variables)

    def plot(self, fig=None):
        if fig is None:
            fig = plt.gcf()

        fig.text(1.0, 0.015, get_dataset_attribution(self.dataset_name),
                ha='right', size='small', va='top')
        if self.compare:
            fig.text(1.0, 0.0, get_dataset_attribution(self.compare['dataset']),
                ha='right', size='small', va='top')

        with contextlib.closing(StringIO()) as buf:
            plt.savefig(
                buf,
                format=self.filetype,
                dpi='figure',
                bbox_inches='tight',
                pad_inches=0.5,
            )
            plt.close(fig)

            if self.filetype == 'png':
                buf.seek(0)
                im = Image.open(buf)
                with contextlib.closing(StringIO()) as buf2:
                    im.save(buf2, format='PNG', optimize=True)
                    return (buf2.getvalue(), self.mime, self.filename)

            return (buf.getvalue(), self.mime, self.filename)

    def csv(self, header=[], columns=[], data=[]):
        with contextlib.closing(StringIO()) as buf:
            buf.write("\n".join(
                ["// %s: %s" % (h[0], h[1]) for h in header]
            ))
            buf.write("\n")
            buf.write(", ".join(columns))
            buf.write("\n")

            for l in data:
                buf.write(", ".join(map(str, l)))
                buf.write("\n")

            return (buf.getvalue(), self.mime, self.filename)

    def odv_ascii(self, cruise="", variables=[], variable_units=[],
                  station=[], latitude=[], longitude=[], depth=[], time=[],
                  data=[]):
        with contextlib.closing(StringIO()) as buf:
            buf.write("//<CreateTime>%s</CreateTime>\n" % (
                datetime.datetime.now().isoformat()
            ))
            buf.write("//<Software>Ocean Navigator</Software>\n")
            buf.write("\t".join([
                "Cruise",
                "Station",
                "Type",
                "yyyy-mm-ddThh:mm:ss.sss",
                "Longitude [degrees_east]",
                "Latitude [degrees_north]",
                "Depth [m]",
            ] + ["%s [%s]" % x for x in zip(variables, variable_units)]))
            buf.write("\n")

            if len(depth.shape) == 1:
                depth = np.reshape(depth, (depth.shape[0], 1))

            for idx in range(0, len(station)):
                for idx2 in range(0, depth.shape[1]):
                    if idx > 0 or idx2 > 0:
                        cruise = ""

                    if isinstance(data[idx], np.ma.MaskedArray):
                        if len(data.shape) == 3 and \
                           data[idx, :, idx2].mask.all():
                            continue
                        if len(data.shape) == 2 and \
                           np.ma.is_masked(data[idx, idx2]):
                            continue

                    line = [
                        cruise,
                        station[idx],
                        "C",
                        time[idx].isoformat(),
                        "%0.4f" % longitude[idx],
                        "%0.4f" % latitude[idx],
                        "%0.1f" % depth[idx, idx2],
                    ]
                    if len(data.shape) == 1:
                        line.append(str(data[idx]))
                    elif len(data.shape) == 2:
                        line.append(str(data[idx, idx2]))
                    else:
                        line.extend(list(map(str, data[idx, :, idx2])))

                    if idx > 0 and station[idx] == station[idx - 1] or \
                       idx2 > 0:
                        line[1] = ""
                        line[2] = ""
                        line[3] = ""
                        line[4] = ""
                        line[5] = ""

                    buf.write("\t".join(line))
                    buf.write("\n")

            return (buf.getvalue(), self.mime, self.filename)

    def get_variable_names(self, dataset, variables):
        names = []

        for idx, v in enumerate(variables):
            names.append(get_variable_name(self.dataset_name,
                                           dataset.variables[v]))

        return names

    def get_variable_units(self, dataset, variables):
        units = []

        for idx, v in enumerate(variables):
            units.append(get_variable_unit(self.dataset_name,
                                           dataset.variables[v]))

        return units

    def get_variable_scale_factors(self, dataset, variables):
        factors = []

        for idx, v in enumerate(variables):
            factors.append(get_variable_scale_factor(self.dataset_name,
                                                     dataset.variables[v]))

        return factors

    def clip_value(self, input_value, variable):
        output = input_value

        if output >= variable.shape[0]:
            output = variable.shape[0] - 1

        if output < 0:
            output = 0

        return output

    def fix_startend_times(self, dataset, starttime, endtime):
        starttime = np.clip(starttime, 0, len(dataset.timestamps) - 1)
        endtime = np.clip(endtime, 0, len(dataset.timestamps) - 1)

        if starttime > endtime:
            starttime = endtime - 1
            if starttime < 0:
                starttime = 0
                endtime = 2

    def plot_legend(self, figure, labels):
        if len(labels) > 10:
            legend = plt.legend(labels, loc='upper right',
                                bbox_to_anchor=(1, 0, 0.25, 1),
                                borderaxespad=0.,
                                bbox_transform=figure.transFigure,
                                ncol=np.ceil(self.data.shape[0] /
                                             30.0).astype(int))
        elif len(labels) > 1:
            legend = plt.legend(labels, loc='best')
        else:
            legend = None

        if legend:
            for legobj in legend.legendHandles:
                legobj.set_linewidth(4.0)

    def vector_name(self, name):
        n = re.sub(
            r"(?i)( x | y |zonal |meridional |northward |eastward )",
            " ",
            name
        )
        return re.sub(r" +", " ", n)

    # Convert Kelvin to Celsius
    def kelvin_to_celsius(self, unit, data):
        ureg = pint.UnitRegistry()
        try:
            u = ureg.parse_units(unit.lower())
        except:
            u = ureg.dimensionless

        if u == ureg.boltzmann_constant:
            u = ureg.kelvin

        if u == ureg.kelvin:
            unit = "Celsius"
            data = ureg.Quantity(data, u).to(ureg.celsius).magnitude

        return (unit, data)
