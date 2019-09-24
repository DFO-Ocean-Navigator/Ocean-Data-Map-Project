import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from mpl_toolkits.axes_grid1 import make_axes_locatable
from matplotlib.ticker import ScalarFormatter
import matplotlib
import numpy as np
import re
from textwrap import wrap
import plotting.colormap as colormap
import plotting.utils as utils
import plotting.point as plPoint
import datetime
from data import open_dataset

LINEAR = 200


class TimeseriesPlotter(plPoint.PointPlotter):

    def __init__(self, dataset_name: str, query: str, format: str):
        self.plottype: str = "timeseries"
        super(TimeseriesPlotter, self).__init__(dataset_name, query, format)
        self.size: str = '11x5'

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Time",
        ]

        if len(self.variables) > 1:
            # Under the current API this indicates that velocity has been
            # selected, which actually is derived from two variables: X and Y
            # velocities. As such, the CSV export will also include X and Y
            # velocity components (pulled from the quiver_data attribute) and
            # bearing information (to be calculated below).
            have_quiver = hasattr(self, 'quiver_data')
        else:
            have_quiver = False

        if self.depth != 'all':
            if isinstance(self.depth, str) or isinstance(self.depth, str):
                header.append(["Depth", self.depth])
            else:
                header.append(
                    ["Depth", "%d%s" % (np.round(self.depths[self.depth]),
                                        self.depth_unit)]
                )

            columns.append("%s (%s)" % (self.variable_name,
                                        self.variable_unit))
            if have_quiver:
                columns.extend([
                    "%s (%s)" % (self.variable_names[0],
                                 self.variable_units[0]),
                    "%s (%s)" % (self.variable_names[1],
                                 self.variable_units[1]),
                    "Bearing (degrees clockwise positive from North)"
                ])
        else:
            max_dep_idx = np.where(~self.data[:, 0, 0, :].mask)[1].max()
            if not have_quiver:
                header.append(["Variable", "%s (%s)" % (self.variable_name,
                                                        self.variable_unit)])
                for dep in self.depths[:max_dep_idx + 1]:
                    columns.append("%d%s" % (np.round(dep), self.depth_unit))
            else:
                header_text = "%s (%s) %s (%s) %s (%s) %s" % (
                    self.variable_name, self.variable_unit,
                    self.variable_names[0], self.variable_units[0],
                    self.variable_names[1], self.variable_units[1],
                    "Bearing (degrees clockwise positive from North)"
                )
                header.append(["Variables", header_text])
                for var_name in [self.variable_name, self.variable_names[0],
                                 self.variable_names[1], "Bearing"]:
                    for dep in self.depths[:max_dep_idx + 1]:
                        columns.append(
                            "%s at %d%s" % (
                                var_name, np.round(dep), self.depth_unit
                            )
                        )

        if have_quiver:
            # Calculate bearings.
            bearing = np.arctan2(self.quiver_data[1][:],
                                 self.quiver_data[0][:])
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi
            # Deal with undefined angles (where velocity is 0 or very close)
            inds=np.where(
                np.logical_and(
                    np.abs(self.quiver_data[1])<10e-6,
                    np.abs(self.quiver_data[0])<10e-6
                    )
                 )
            bearing[inds]=np.nan

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
                    entry.extend(["%0.3f" % f for f in self.data[p, 0, t, :max_dep_idx + 1]])
                    if have_quiver:
                        entry.extend(["%0.3f" % f for f in self.quiver_data[0][p, t, :max_dep_idx + 1]])
                        entry.extend(["%0.3f" % f for f in self.quiver_data[1][p, t, :max_dep_idx + 1]])
                        entry.extend(["%0.3f" % f for f in bearing[p, t, :max_dep_idx + 1]])
                else:
                    entry.append("%0.3f" % self.data[p, 0, t])
                    if have_quiver:
                        entry.extend([
                            "%0.3f" % self.quiver_data[0][p, t],
                            "%0.3f" % self.quiver_data[1][p, t],
                            "%0.3f" % bearing[p, t]
                        ])
                data.append(entry)

        d = np.array(data)
        d[np.where(d == 'nan')] = ''
        data = d.tolist()

        return super(TimeseriesPlotter, self).csv(header, columns, data)

    def plot(self):
        if len(self.variables) > 1:
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
                vmin, vmax = utils.normalize_scale(self.data,
                    self.dataset_config.variable[self.variables[0]])

        if self.cmap is None:
            self.cmap = colormap.find_colormap(self.variable_name)

        datenum = matplotlib.dates.date2num(self.times)
        if self.depth == 'all':
            size = list(map(float, self.size.split("x")))
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
            # Create base figure
            figure_size = self.figuresize
            figure_size[0] *= 1.5 if self.showmap else 1.0
            fig = plt.figure(figsize=figure_size, dpi=self.dpi)

            # Setup figure layout
            width = 1
            if self.showmap:
                width += 1
                # Horizontally scale the actual plots by 2x the size of
                # the location map
                width_ratios = [1, 2]
            else:
                width_ratios = None

            # Create layout helper
            gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)
            subplot = 0

            # Render point location
            if self.showmap:
                plt.subplot(gs[0, 0])
                subplot += 1
                utils.point_plot(np.array([ [x[0] for x in self.points], # Latitudes
                                            [x[1] for x in self.points]])) # Longitudes

            plt.subplot(gs[:, subplot])
            plt.plot_date(
                datenum, self.data[:, 0, :].transpose(), '-', figure=fig)
            plt.ylabel("%s (%s)" % (self.variable_name.title(),
                                    utils.mathtext(self.variable_unit)), fontsize=14)
            plt.ylim(vmin, vmax)

            # Title
            if self.plotTitle is None or self.plotTitle == "":
                wrapped_title = wrap(
                    "%s%s at %s" % (
                        self.variable_name.title(),
                        self.depth_label,
                        ", ".join(self.names)
                    ), 80)
                plt.title("\n".join(wrapped_title), fontsize=15)
            else :
                plt.title(self.plotTitle,fontsize=15)

            plt.gca().grid(True)

            fig.autofmt_xdate()

            self.plot_legend(fig, self.names)

        return super(TimeseriesPlotter, self).plot(fig)

    def parse_query(self, query):
        super(TimeseriesPlotter, self).parse_query(query)

        depth = 0
        qdepth = query.get('depth')
        if isinstance(qdepth, list):
            qdepth = qdepth[0]

        if qdepth and hasattr(qdepth, "__len__") and len(qdepth) > 0:
            if qdepth == 'all':
                depth = 'all'
            elif qdepth == 'bottom':
                depth = 'bottom'
            else:
                depth = int(qdepth)

        self.depth = depth

    def load_data(self):
        with open_dataset(self.dataset_config) as dataset:
            self.load_misc(dataset, self.variables)
            self.fix_startend_times(dataset, self.starttime, self.endtime)

            if len(self.variables) == 1:
                self.variable_unit = self.dataset_config.variable[
                    dataset.variables[self.variables[0]]
                ].unit
                self.variable_name = self.dataset_config.variable[
                    dataset.variables[self.variables[0]]
                ].name
            else:
                self.variable_name = self.get_vector_variable_name(dataset,
                        self.variables)
                self.variable_unit = self.get_vector_variable_unit(dataset,
                        self.variables)
            var = self.variables[0]
            if self.depth != 'all' and self.depth != 'bottom' and \
                (set(dataset.variables[var].dimensions) &
                    set(dataset.depth_dimensions)):
                self.depth_label = " at %d m" % (
                    np.round(dataset.depths[self.depth])
                )

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
            for idx, factor in enumerate(self.scale_factors):
                if factor != 1.0:
                    point_data[idx] = np.multiply(point_data[idx], factor)

            times = dataset.timestamps[self.starttime:self.endtime + 1]
            if self.query.get('dataset_quantum') == 'month':
                times = [datetime.date(x.year, x.month, 1) for x in times]

            # depths = dataset.depths
            depths = dep

        if point_data.shape[1] == 2:
            # Under the current API this indicates that velocity data is being
            # loaded. Save each velocity component (X and Y) for possible CSV
            # export later.
            self.quiver_data = [point_data[:, 0, :], point_data[:, 1, :]]

            point_data = np.ma.expand_dims(
                np.sqrt(
                    point_data[:, 0, :] ** 2 + point_data[:, 1, :] ** 2
                ), 1
            )

        self.times = times
        self.data = point_data
        self.depths = depths
        self.depth_unit = "m"
