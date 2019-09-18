import datetime
import time

import cftime
import dateutil.parser
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import pytz
from flask import current_app
from flask_babel import gettext
from netCDF4 import Dataset, chartostring
from scipy.interpolate import interp1d

import plotting.utils as utils
from data import open_dataset
from data.utils import datetime_to_timestamp
from plotting.plotter import Plotter


class DrifterPlotter(Plotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "drifter"
        super(DrifterPlotter, self).__init__(dataset_name, query, **kwargs)
        self.size: str = '11x5'

    def parse_query(self, query):
        super(DrifterPlotter, self).parse_query(query)
        self.latlon = query.get('latlon') is None or bool(query.get('latlon'))

        drifter = query.get('drifter')
        if isinstance(drifter, str) or isinstance(drifter, str):
            drifters = drifter.split(',')
        else:
            drifters = drifter

        self.drifter = drifters[0]

        buoyvariable = query.get('buoyvariable')
        if isinstance(buoyvariable, str) or isinstance(buoyvariable, str):
            buoyvariables = buoyvariable.split(',')
        else:
            buoyvariables = buoyvariable

        self.buoyvariables = buoyvariables

        self.starttime = query.get('starttime')
        self.endtime = query.get('endtime')

    def load_data(self):
        ds_url = current_app.config['DRIFTER_URL']
        data_names = []
        data_units = []
        with Dataset(ds_url % self.drifter, 'r') as ds:
            self.name = ds.buoyid

            self.imei = str(chartostring(ds['imei'][0]))
            self.wmo = str(chartostring(ds['wmo'][0]))

            t = cftime.utime(ds['data_date'].units)

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
            self.starttime = dateutil.parser.parse(self.starttime).replace(hour=0, minute=0, second=0, microsecond=0)
            self.start = np.where(self.times >= self.starttime)[0].min()
        else:
            self.start = -5

        if self.endtime is not None:
            self.endtime = dateutil.parser.parse(self.endtime).replace(hour=0, minute=0, second=0, microsecond=0)
            self.end = np.where(self.times <= self.endtime)[0].max() + 1
        else:
            self.end = len(self.times) - 1

        if self.start < 0:
            self.start += len(self.times)
        self.start = np.clip(self.start, 0, len(self.times) - 1)
        if self.end < 0:
            self.end += len(self.times)
        self.end = np.clip(self.end, 0, len(self.times) - 1)



        start = int(datetime_to_timestamp(self.starttime, self.dataset_config.time_dim_units))
        end = int(datetime_to_timestamp(self.endtime, self.dataset_config.time_dim_units))
        with open_dataset(self.dataset_config, timestamp=start, endtime=end, variable=self.variables, nearest_timestamp=True) as dataset:
            depth = int(self.depth)

            try:
                model_start = np.where(
                    dataset.timestamps <= self.times[self.start]
                )[0][-1]
            except IndexError:
                model_start = 0

            model_start -= 1
            model_start = np.clip(model_start, 0, len(dataset.timestamps) - 1)

            try:
                model_end = np.where(
                    dataset.timestamps >= self.times[self.end]
                )[0][0]
            except IndexError:
                model_end = len(dataset.timestamps) - 1

            model_end += 1
            model_end = np.clip(
                model_end,
                model_start,
                len(dataset.timestamps) - 1
            )

            model_times = [time.mktime(
                t.timetuple()) for t in dataset.timestamps[model_start:model_end + 1]]
            output_times = [time.mktime(t.timetuple())
                            for t in self.times[self.start:self.end + 1]]
            d = []
            for v in self.variables:
                pts, dist, mt, md = dataset.get_path(
                    self.points[self.start:self.end + 1],
                    depth,
                    list(range(model_start, model_end + 1)),
                    v,
                    times=output_times
                )

                f = interp1d(
                    model_times,
                    md,
                    assume_sorted=True,
                    bounds_error=False,
                )

                d.append(np.diag(f(mt)))

            model_data = np.ma.array(d)

            variable_names = []
            variable_units = []
            scale_factors = []

            for v in self.variables:
                vc = self.dataset_config.variable[v]
                variable_units.append(vc.unit)
                variable_names.append(vc.name)
                scale_factors.append(vc.scale_factor)

            for idx, sf in enumerate(scale_factors):
                model_data[idx, :] = np.multiply(model_data[idx, :], sf)

            self.model_data = model_data
            self.model_times = list(
                map(datetime.datetime.utcfromtimestamp, mt))
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

        figuresize = list(map(float, self.size.split("x")))
        figuresize[1] *= numplots
        fig = plt.figure(figsize=figuresize, dpi=self.dpi)
        gs = gridspec.GridSpec(numplots, width, width_ratios=width_ratios)

        if self.showmap:
            # Plot the path on a map
            if numplots > 1:
                plt.subplot(gs[:, 0])
            else:
                plt.subplot(gs[0])

            utils.path_plot(
                self.points[self.start:self.end].transpose(), False)

        # Plot observed
        if self.showmap:
            subplot = 1
            subplot_inc = 2
        else:
            subplot = 0
            subplot_inc = 1

        for j, v in enumerate(self.buoyvariables):
            ax = plt.subplot(gs[subplot])
            subplot += subplot_inc

            ax.plot(self.times[self.start:self.end],
                    self.data[j][self.start:self.end])

            if v == 'sst' and 'votemper' in self.variables:
                i = self.variables.index('votemper')
                plt.plot(
                    self.model_times,
                    self.model_data[i]
                )

            legend = [self.name]
            if v == 'sst' and 'votemper' in self.variables:
                legend = legend + ["%s (Modelled)" % self.name]

            if 'votemper' in self.variables and v == 'sst':
                legend = [gettext("Observed"), gettext("Modelled")]

            if len(legend) > 1:
                leg = plt.legend(legend, loc='best')
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            if self.data_units[j] is not None:
                plt.ylabel("%s (%s)" % (self.data_names[j],
                                        utils.mathtext(self.data_units[j])))
            else:
                plt.ylabel(self.data_names[j]),

            plt.setp(ax.get_xticklabels(), rotation=30)

        for idx, v in enumerate(self.variables):
            if v == 'votemper' and 'sst' in self.buoyvariables:
                continue

            if np.isnan(self.model_data[idx]).all():
                continue

            ax = plt.subplot(gs[subplot])
            subplot += subplot_inc

            ax.plot(
                self.model_times,
                self.model_data[idx]
            )

            plt.ylabel("%s (%s)" % (self.variable_names[idx],
                                    utils.mathtext(self.variable_units[idx])))
            plt.setp(ax.get_xticklabels(), rotation=30)

        # latlon
        if self.latlon:
            for j, label in enumerate([gettext("Latitude (degrees)"),
                                       gettext("Longitude (degrees)")]):
                plt.subplot(gs[subplot])
                subplot += subplot_inc

                plt.plot(self.times[self.start:self.end],
                         self.points[self.start:self.end, j])

                plt.ylabel(label)
                plt.setp(plt.gca().get_xticklabels(), rotation=30)

        fig.suptitle(gettext("Drifter Plot (IMEI: %s, WMO: %s)") %
                     (self.imei, self.wmo))
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
        columns += ["Buoy " + n for n in self.data_names]
        columns += ["Model " + n for n in self.variable_names]

        data = []
        for idx, t in enumerate(self.times):
            if idx < self.start or idx > self.end:
                continue

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
