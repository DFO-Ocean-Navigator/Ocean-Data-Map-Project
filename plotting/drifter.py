from grid import Grid
from netCDF4 import Dataset, netcdftime
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import utils
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url
import pytz
import dateutil.parser
from oceannavigator import app
import plotter


class DrifterPlotter(plotter.Plotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "drifter"
        super(DrifterPlotter, self).__init__(dataset_name, query, format)
        self.size = '11x5'

    def parse_query(self, query):
        super(DrifterPlotter, self).parse_query(query)
        self.latlon = query.get('latlon') is None or bool(query.get('latlon'))

        drifter = query.get('drifter')
        if isinstance(drifter, str) or isinstance(drifter, unicode):
            drifters = drifter.split(',')
        else:
            drifters = drifter

        self.drifter = drifters[0]

        buoyvariable = query.get('buoyvariable')
        if isinstance(buoyvariable, str) or isinstance(buoyvariable, unicode):
            buoyvariables = buoyvariable.split(',')
        else:
            buoyvariables = buoyvariable

        self.buoyvariables = buoyvariables

        self.starttime = query.get('starttime')
        self.endtime = query.get('endtime')

    def load_data(self):
        ds_url = app.config['DRIFTER_URL']
        data_names = []
        data_units = []
        with Dataset(ds_url % self.drifter, 'r') as ds:
            self.name = ds.buoyid

            t = netcdftime.utime(ds['data_date'].units)

            d = []
            for v in self.buoyvariables:
                d.append(ds[v][:])
                if "long_name" in ds[v].ncattrs():
                    data_names.append(ds[v].long_name)
                else:
                    data_names.append(v)

                if "units" in ds[v].ncattrs():
                    data_units.append(ds[v].units)
                else:
                    data_units.append(None)

            self.data = d

            self.times = t.num2date(ds['data_date'][:])
            self.points = np.array([
                ds['latitude'][:],
                ds['longitude'][:],
            ]).transpose()

        data_names = data_names[:len(self.buoyvariables)]
        data_units = data_units[:len(self.buoyvariables)]

        for i, t in enumerate(self.times):
            if t.tzinfo is None:
                self.times[i] = t.replace(tzinfo=pytz.UTC)

        self.data_names = data_names
        self.data_units = data_units

        if self.starttime is not None:
            d = dateutil.parser.parse(self.starttime)
            self.start = np.where(self.times >= d)[0].min()
        else:
            self.start = 0

        if self.endtime is not None:
            d = dateutil.parser.parse(self.endtime)
            self.end = np.where(self.times <= d)[0].max() + 1
        else:
            self.end = len(self.times)

        with Dataset(get_dataset_url(self.dataset_name), 'r') as dataset:
            latvar, lonvar = utils.get_latlon_vars(dataset)
            grid = Grid(dataset, latvar.name, lonvar.name)

            depth_var = utils.get_depth_var(dataset)

            if depth_var is None:
                depth = [0]
            else:
                depth = depth_var[:]

            depth = 0

            d = []
            for v in self.variables:
                md = grid.path(
                    dataset.variables[v],
                    depth, self.points, self.times,
                    interpolation=utils.get_interpolation(self.query))
                d.append(md)
            model_data = np.ma.array(d)

            variable_names = []
            variable_units = []

            for v in self.variables:
                variable_units.append(get_variable_unit(self.dataset_name,
                                                        dataset.variables[v]))
                variable_names.append(get_variable_name(self.dataset_name,
                                                        dataset.variables[v]))

            for idx, u in enumerate(variable_units):
                variable_units[idx], model_data[idx, :] = \
                    self.kelvin_to_celsius(u, model_data[idx, :])

            self.model_data = model_data
            self.variable_names = variable_names
            self.variable_units = variable_units

    def plot(self):
        if self.showmap:
            width = 2
            width_ratios = [2, 7]
        else:
            width = 1
            width_ratios = [1]

        numplots = len(self.variables) + len(self.buoyvariables)
        if "votemper" in self.variables and "sst" in self.buoyvariables:
            numplots -= 1

        if self.latlon:
            numplots += 2

        figuresize = map(float, self.size.split("x"))
        figuresize[1] *= numplots
        fig = plt.figure(figsize=figuresize, dpi=self.dpi)
        gs = gridspec.GridSpec(numplots, width, width_ratios=width_ratios)

        if self.showmap:
            # Plot the path on a map
            if numplots > 1:
                plt.subplot(gs[:, 0])
            else:
                plt.subplot(gs[0])

            utils.path_plot(self.points.transpose(), False)

        # Plot observed
        if self.showmap:
            subplot = 1
            subplot_inc = 2
        else:
            subplot = 0
            subplot_inc = 1

        for j, v in enumerate(self.buoyvariables):
            plt.subplot(gs[subplot])
            subplot += subplot_inc

            plt.plot(self.times[self.start:self.end],
                     self.data[j][self.start:self.end])

            if v == 'sst' and 'votemper' in self.variables:
                i = self.variables.index('votemper')
                plt.plot(
                    self.times[self.start:self.end],
                    self.model_data[i][self.start:self.end])

            legend = [self.name]
            if v == 'sst' and 'votemper' in self.variables:
                legend = legend + ["%s (Modelled)" % self.name]

            if 'votemper' in self.variables and v == 'sst':
                legend = ["Observed", "Modelled"]

            if len(legend) > 1:
                leg = plt.legend(legend, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            if self.data_units[j] is not None:
                plt.ylabel("%s (%s)" % (self.data_names[j],
                                        utils.mathtext(self.data_units[j])))
            else:
                plt.ylabel(self.data_names[j]),

            plt.setp(plt.gca().get_xticklabels(), rotation=30)

        for idx, v in enumerate(self.variables):
            if v == 'votemper' and 'sst' in self.buoyvariables:
                continue

            plt.subplot(gs[subplot])
            subplot += subplot_inc

            plt.plot(self.times[self.start:self.end],
                     self.model_data[idx][self.start:self.end])

            plt.ylabel("%s (%s)" % (self.variable_names[idx],
                                    utils.mathtext(self.variable_units[idx])))
            plt.setp(plt.gca().get_xticklabels(), rotation=30)

        # latlon
        if self.latlon:
            for j, label in enumerate(["Latitude (degrees)",
                                      "Longitude (degrees)"]):
                plt.subplot(gs[subplot])
                subplot += subplot_inc

                plt.plot(self.times[self.start:self.end],
                         self.points[self.start:self.end, j])

                plt.ylabel(label)
                plt.setp(plt.gca().get_xticklabels(), rotation=30)

        fig.tight_layout(pad=3, w_pad=4)
        return super(DrifterPlotter, self).plot(fig)

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
            ['Buoy ID', self.name],
        ]

        columns = [
            "Time",
            "Latitude",
            "Longitude",
        ]
        columns += map(lambda n: "Buoy " + n, self.data_names)
        columns += map(lambda n: "Model " + n, self.variable_names)

        data = []
        for idx, t in enumerate(self.times):
            entry = [
                t.isoformat(),
                "%0.4f" % self.points[idx][0],
                "%0.4f" % self.points[idx][1],
            ]

            for v in range(0, len(self.data_names)):
                entry.append("%0.3f" % self.data[v][idx])
            for v in range(0, len(self.variables)):
                entry.append("%0.3f" % self.model_data[v, idx])

            data.append(entry)

        return super(DrifterPlotter, self).csv(header, columns, data)
