import matplotlib.pyplot as plt
from mpl_toolkits.axes_grid1 import make_axes_locatable
from matplotlib.ticker import ScalarFormatter
import matplotlib
import numpy as np
import re
from textwrap import wrap
import colormap
import utils
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url
import datetime
import point
from data import open_dataset

LINEAR = 200


class TimeseriesPlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "timeseries"
        super(TimeseriesPlotter, self).__init__(dataset_name, query, format)
        self.size = '11x5'

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Time",
        ]

        if self.depth != 'all':
            if isinstance(self.depth, str) or isinstance(self.depth, unicode):
                header.append(["Depth", self.depth])
            else:
                header.append(["Depth", "%d" % self.depths[self.depth]])

            columns.append("%s (%s)" % (self.variable_name,
                                        self.variable_unit))
        else:
            header.append(["Variable", "%s (%s)" % (self.variable_name,
                                                    self.variable_unit)])
            max_dep_idx = np.where(~self.data[:, 0, 0, :].mask)[1].max()
            for dep in self.depths[:max_dep_idx + 1]:
                columns.append("%d%s" % (np.round(dep), self.depth_unit))

        data = []

        # For each point
        for p in range(0, self.data.shape[0]):
            # For each time
            for t in range(0, self.data.shape[2]):
                entry = [
                    "%0.4f" % self.points[p][0],
                    "%0.4f" % self.points[p][1],
                    self.times[t].isoformat(),
                ]
                if self.depth == 'all':
                    entry.extend(map(
                        lambda f: "%0.3f" % f,
                        self.data[p, 0, t, :max_dep_idx + 1]
                    ))
                else:
                    entry.append("%0.3f" % self.data[p, 0, t])

                data.append(entry)

        d = np.array(data)
        d[np.where(d == 'nan')] = ''
        data = d.tolist()

        return super(TimeseriesPlotter, self).csv(header, columns, data)

    def plot(self):
        if len(self.variables) > 1:
            self.variable_name = self.vector_name(self.variable_name)
            if self.scale:
                vmin = self.scale[0]
                vmax = self.scale[1]
            else:
                vmin = 0
                vmax = self.data.max()
                if self.cmap is None:
                    self.cmap = colormap.colormaps.get('speed')
        else:
            if self.scale:
                vmin = self.scale[0]
                vmax = self.scale[1]
            else:
                vmin = self.data.min()
                vmax = self.data.max()

                if self.variable_unit == "fraction":
                    vmin = 0
                    vmax = 1
                elif np.any(map(lambda x: re.search(x, self.variable_name,
                                                    re.IGNORECASE), [
                    "free surface",
                    "surface height",
                    "velocity",
                    "wind"
                ])):
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)

        if self.cmap is None:
            self.cmap = colormap.find_colormap(self.variable_name)

        datenum = matplotlib.dates.date2num(self.times)
        if self.depth == 'all':
            size = map(float, self.size.split("x"))
            numpoints = len(self.points)
            figuresize = (size[0], size[1] * numpoints)
            fig, ax = plt.subplots(
                numpoints, 1, sharex=True, figsize=figuresize,
                dpi=self.dpi)

            if not isinstance(ax, np.ndarray):
                ax = [ax]

            for idx, p in enumerate(self.points):
                d = self.data[idx, 0, :]
                dlim = np.ma.flatnotmasked_edges(d[0, :])
                maxdepth = self.depths[dlim[1]].max()
                mindepth = self.depths[dlim[0]].min()

                c = ax[idx].pcolormesh(
                    datenum, self.depths[:dlim[1] + 1], d[
                        :, :dlim[1] + 1].transpose(),
                    shading='gouraud', cmap=self.cmap, vmin=vmin, vmax=vmax)
                ax[idx].invert_yaxis()
                if maxdepth > LINEAR:
                    ax[idx].set_yscale('symlog', linthreshy=LINEAR)
                ax[idx].yaxis.set_major_formatter(ScalarFormatter())

                if maxdepth > LINEAR:
                    l = 10 ** np.floor(np.log10(maxdepth))
                    ax[idx].set_ylim(np.ceil(maxdepth / l) * l, mindepth)
                    ax[idx].set_yticks(
                        list(ax[idx].get_yticks()) + [maxdepth, LINEAR])
                else:
                    ax[idx].set_ylim(maxdepth, mindepth)
                ax[idx].set_ylabel("Depth (%s)" %
                                   utils.mathtext(self.depth_unit))

                ax[idx].xaxis_date()
                ax[idx].set_xlim(datenum[0], datenum[-1])

                divider = make_axes_locatable(ax[idx])
                cax = divider.append_axes("right", size="5%", pad=0.05)
                bar = plt.colorbar(c, cax=cax)
                bar.set_label("%s (%s)" % (self.variable_name.title(),
                                           utils.mathtext(self.variable_unit)))
                ax[idx].set_title(
                    "%s%s at %s" % (
                        self.variable_name.title(), self.depth_label,
                        self.names[idx]))
                plt.setp(ax[idx].get_xticklabels(), rotation=30)
            fig.autofmt_xdate()
        else:
            fig = plt.figure(figsize=self.figuresize(), dpi=self.dpi)
            wrapped_title = wrap(
                "%s%s at %s" % (
                    self.variable_name.title(),
                    self.depth_label,
                    ", ".join(self.names)
                ), 80)

            plt.title("\n".join(wrapped_title))
            plt.plot_date(
                datenum, self.data[:, 0, :].transpose(), '-', figure=fig)
            plt.ylabel("%s (%s)" % (self.variable_name.title(),
                                    utils.mathtext(self.variable_unit)))
            plt.ylim(vmin, vmax)
            plt.gca().xaxis.grid(True)
            plt.gca().yaxis.grid(True)
            fig.autofmt_xdate()

            self.plot_legend(fig, self.names)

        return super(TimeseriesPlotter, self).plot(fig)

    def parse_query(self, query):
        super(TimeseriesPlotter, self).parse_query(query)

        depth = 0
        qdepth = query.get('depth')
        if isinstance(qdepth, list):
            qdepth = qdepth[0]

        if qdepth and len(qdepth) > 0:
            if qdepth == 'all':
                depth = 'all'
            elif qdepth == 'bottom':
                depth = 'bottom'
            else:
                depth = int(qdepth)

        self.depth = depth

    def load_data(self):
        with open_dataset(get_dataset_url(self.dataset_name)) as dataset:
            self.fix_startend_times(dataset)

            self.variable_unit = get_variable_unit(
                self.dataset_name,
                dataset.variables[self.variables[0]]
            )
            self.variable_name = get_variable_name(
                self.dataset_name,
                dataset.variables[self.variables[0]]
            )

            var = self.variables[0]
            if self.depth != 'all' and self.depth != 'bottom' and \
                (set(dataset.variables[var].dimensions) &
                    set(dataset.depth_dimensions)):
                self.depth_label = " at %dm" % (dataset.depths[self.depth])

            elif self.depth == 'bottom':
                self.depth_label = ' at Bottom'
            else:
                self.depth_label = ''

            if not (set(dataset.variables[var].dimensions) &
                    set(dataset.depth_dimensions)):
                self.depth = 0

            times = None
            point_data = []
            for p in self.points:
                data = []
                for v in self.variables:
                    if self.depth == 'all':
                        d, dep = dataset.get_timeseries_profile(
                            float(p[0]),
                            float(p[1]),
                            self.starttime,
                            self.endtime,
                            v
                        )
                    else:
                        d, dep = dataset.get_timeseries_point(
                            float(p[0]),
                            float(p[1]),
                            self.depth,
                            self.starttime,
                            self.endtime,
                            v,
                            return_depth=True
                        )

                    data.append(d)

                point_data.append(np.ma.array(data))

            point_data = np.ma.array(point_data)
            times = dataset.timestamps[self.starttime:self.endtime + 1]
            if self.query.get('dataset_quantum') == 'month':
                times = [datetime.date(x.year, x.month, 1) for x in times]

            # depths = dataset.depths
            depths = dep

        # TODO: pint
        if self.variable_unit.startswith("Kelvin"):
            self.variable_unit = "Celsius"
            for idx, v in enumerate(self.variables):
                point_data[:, idx, :] = point_data[:, idx, :] - 273.15

        if point_data.shape[1] == 2:
            point_data = np.ma.expand_dims(
                np.sqrt(
                    point_data[:, 0, :] ** 2 + point_data[:, 1, :] ** 2
                ), 1
            )

        self.times = times
        self.data = point_data
        self.depths = depths
        self.depth_unit = "m"
