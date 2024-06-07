import datetime
from textwrap import wrap

import matplotlib
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import xarray as xr
from matplotlib.ticker import ScalarFormatter
from mpl_toolkits.axes_grid1 import make_axes_locatable

import plotting.colormap as colormap
import plotting.utils as utils
from data import open_dataset
from data.utils import datetime_to_timestamp
from plotting.point import PointPlotter

LINEAR = 200


class TimeseriesPlotter(PointPlotter):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "timeseries"
        super(TimeseriesPlotter, self).__init__(dataset_name, query, **kwargs)
        self.size: str = "11x5"

    def parse_query(self, query):
        super(TimeseriesPlotter, self).parse_query(query)

        qdepth = query.get("depth")
        if isinstance(qdepth, list):
            qdepth = qdepth[0]
        depth = qdepth

        if qdepth and hasattr(qdepth, "__len__") and len(qdepth) > 0:
            if qdepth == "all":
                depth = "all"
            elif qdepth == "bottom":
                depth = "bottom"
            else:
                depth = int(qdepth)

        self.depth = depth

    def load_data(self):

        with open_dataset(
            self.dataset_config,
            variable=self.variables,
            timestamp=self.starttime,
            endtime=self.endtime,
            interp=self.interp,
            radius=self.radius,
            neighbours=self.neighbours,
        ) as dataset:
            self.load_misc(dataset, self.variables)

            variable = self.variables[0]

            self.variable_unit = self.dataset_config.variable[
                dataset.variables[variable]
            ].unit
            self.variable_name = self.dataset_config.variable[
                dataset.variables[variable]
            ].name

            if (
                self.depth != "all"
                and self.depth != "bottom"
                and (
                    set(dataset.variables[variable].dimensions)
                    & set(dataset.nc_data.depth_dimensions)
                )
            ):
                self.depth_label = " at %d m" % (np.round(dataset.depths[self.depth]))

            elif self.depth == "bottom":
                self.depth_label = " at Bottom"
            else:
                self.depth_label = ""

            # Override depth request if requested variable has no depth
            # (i.e. surface only)
            if not (
                set(dataset.variables[variable].dimensions)
                & set(dataset.nc_data.depth_dimensions)
            ):
                self.depth = 0

            point_data = []
            depths = []
            for p in self.points:
                data = []
                if self.depth == "all":
                    d, depths = dataset.get_timeseries_profile(
                        float(p[0]), float(p[1]), self.starttime, self.endtime, variable
                    )
                else:
                    d, depths = dataset.get_timeseries_point(
                        float(p[0]),
                        float(p[1]),
                        self.depth,
                        self.starttime,
                        self.endtime,
                        variable,
                        return_depth=True,
                    )
                data.append(d)
                point_data.append(np.ma.array(data))

            point_data = np.ma.array(point_data)

            starttime_idx = dataset.nc_data.timestamp_to_time_index(self.starttime)
            endtime_idx = dataset.nc_data.timestamp_to_time_index(self.endtime)
            times = dataset.nc_data.timestamps[starttime_idx : endtime_idx + 1]
            if self.dataset_config.quantum == "month":
                times = [datetime.date(x.year, x.month, 1) for x in times]

            if "mag" in variable and self.depth != "all":
                # Under the current API this indicates that velocity data is being
                # loaded. Save each velocity vectorcomponent (X and Y) for possible
                # CSV export later. Currently, we only provide velocity components
                # for a single depth.

                vector_variables = [
                    self.dataset_config.vector_variables[variable][
                        "east_vector_component"
                    ],
                    self.dataset_config.vector_variables[variable][
                        "north_vector_component"
                    ],
                ]

                self.vector_variable_names = self.get_variable_names(
                    dataset, vector_variables
                )
                self.vector_variable_units = self.get_variable_units(
                    dataset, vector_variables
                )

                d = []
                vector_point_data = []
                for vv in vector_variables:
                    for p in self.points:
                        vector_data = []

                        d, _ = dataset.get_timeseries_point(
                            float(p[0]),
                            float(p[1]),
                            self.depth,
                            self.starttime,
                            self.endtime,
                            vv,
                            return_depth=True,
                        )

                    vector_data.append(d)
                    vector_point_data.append(np.ma.array(vector_data))

                self.quiver_data = vector_point_data

            self.times = times
            self.data = point_data
            self.depths = depths
            self.depth_unit = "m"

    def csv(self):
        header = [
            ["Dataset", self.dataset_config.name],
            ["Attribution", self.dataset_config.attribution],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Time",
        ]

        # Check to see if the quiver attribute is present. If so the CSV export will
        # also include X and Y velocity components (pulled from the quiver_data
        # attribute) and bearing information (to be calculated below).
        has_quiver = hasattr(self, "quiver_data")

        if self.depth != "all":
            if isinstance(self.depth, str):
                header.append(["Depth", self.depth])
            else:
                header.append(["Depth", "%.4f%s" % (self.depth, self.depth_unit)])

            columns.append("%s (%s)" % (self.variable_name, self.variable_unit))
            if has_quiver:
                columns.extend(
                    [
                        "%s (%s)"
                        % (
                            self.vector_variable_names[0],
                            self.vector_variable_units[0],
                        ),
                        "%s (%s)"
                        % (
                            self.vector_variable_names[1],
                            self.vector_variable_units[1],
                        ),
                        "Bearing (degrees clockwise positive from North)",
                    ]
                )
        else:
            max_dep_idx = np.where(~self.data[:, 0, 0, :].mask)[1].max()
            if not has_quiver:
                header.append(
                    ["Variable", "%s (%s)" % (self.variable_name, self.variable_unit)]
                )
                for dep in self.depths[: max_dep_idx + 1]:
                    columns.append("%d%s" % (np.round(dep), self.depth_unit))
            else:
                header_text = "%s (%s) %s (%s) %s (%s) %s" % (
                    self.variable_name,
                    self.variable_unit,
                    self.vector_variable_names[0],
                    self.vector_variable_units[0],
                    self.vector_variable_names[1],
                    self.vector_variable_units[1],
                    "Bearing (degrees clockwise positive from North)",
                )
                header.append(["Variables", header_text])
                for var_name in [
                    self.variable_name,
                    *self.vector_variable_names,
                    "Bearing",
                ]:
                    for dep in self.depths[: max_dep_idx + 1]:
                        columns.append(
                            "%s at %d%s" % (var_name, np.round(dep), self.depth_unit)
                        )

        if has_quiver:
            # Calculate bearings.
            bearing = np.arctan2(self.quiver_data[1][:], self.quiver_data[0][:])
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi
            # Deal with undefined angles (where velocity is 0 or very close)
            inds = np.where(
                np.logical_and(
                    np.abs(self.quiver_data[1]) < 10e-6,
                    np.abs(self.quiver_data[0]) < 10e-6,
                )
            )
            bearing[inds] = np.nan

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
                if self.depth == "all":
                    entry.extend(
                        ["%0.3f" % f for f in self.data[p, 0, t, : max_dep_idx + 1]]
                    )
                    if has_quiver:
                        entry.extend(
                            [
                                "%0.3f" % f
                                for f in self.quiver_data[0][p, t, : max_dep_idx + 1]
                            ]
                        )
                        entry.extend(
                            [
                                "%0.3f" % f
                                for f in self.quiver_data[1][p, t, : max_dep_idx + 1]
                            ]
                        )
                        entry.extend(
                            ["%0.3f" % f for f in bearing[p, t, : max_dep_idx + 1]]
                        )
                else:
                    entry.append("%0.3f" % self.data[p, 0, t])
                    if has_quiver:
                        entry.extend(
                            [
                                "%0.3f" % self.quiver_data[0][p, t],
                                "%0.3f" % self.quiver_data[1][p, t],
                                "%0.3f" % bearing[p, t],
                            ]
                        )
                data.append(entry)

        d = np.array(data)
        d[np.where(d == "nan")] = ""
        data = d.tolist()

        return super(TimeseriesPlotter, self).csv(header, columns, data)

    def stats_csv(self):
        header = [
            ["Dataset", self.dataset_config.name],
            ["Attribution", self.dataset_config.attribution],
        ]

        columns = ["Statistics"]

        # Check to see if the quiver attribute is present. If so the CSV export will
        # also include X and Y velocity components (pulled from the quiver_data
        # attribute) and bearing information (to be calculated below).
        has_quiver = hasattr(self, "quiver_data")

        columns.append("%s (%s)" % (self.variable_name, self.variable_unit))

        if has_quiver:
            columns.extend(
                [
                    "%s (%s)"
                    % (
                        self.vector_variable_names[0],
                        self.vector_variable_units[0],
                    ),
                    "%s (%s)"
                    % (
                        self.vector_variable_names[1],
                        self.vector_variable_units[1],
                    ),
                    "Bearing (degrees clockwise positive from North)",
                ]
            )

            # Calculate bearings.
            bearing = np.arctan2(self.quiver_data[1][:], self.quiver_data[0][:])
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi
            # Deal with undefined angles (where velocity is 0 or very close)
            inds = np.where(
                np.logical_and(
                    np.abs(self.quiver_data[1]) < 10e-6,
                    np.abs(self.quiver_data[0]) < 10e-6,
                )
            )
            bearing[inds] = np.nan
            stats_data = np.stack(
                (
                    self.data.ravel(),
                    self.quiver_data[0].ravel(),
                    self.quiver_data[1].ravel(),
                    bearing.ravel(),
                )
            ).T
        else:
            stats_data = np.expand_dims(self.data, 1)

        data = [
            ["Min"] + np.array(np.nanmin(stats_data, axis=0)).tolist(),
            ["Max"] + np.array(np.nanmax(stats_data, axis=0)).tolist(),
            ["Mean"] + np.array(np.nanmean(stats_data, axis=0)).tolist(),
            ["Standard Deviation"] + np.array(np.nanstd(stats_data, axis=0)).tolist(),
        ]

        return super(TimeseriesPlotter, self).csv(header, columns, data)

    def netcdf(self):
        pts = np.array(self.points)
        depths = np.unique(self.depths)
        timestamps = [
            datetime_to_timestamp(time, self.dataset_config.time_dim_units)
            for time in self.times
        ]
        data = np.nan * np.ones((self.times.size, depths.size, len(pts), len(pts)))
        for idx in range(len(pts)):
            data[:, :, idx, idx] = np.reshape(
                self.data[idx], (self.times.size, depths.size)
            )
        data_vars = {
            self.variables[0]: (
                ["time", "depth", "latitude", "longitude"],
                data,
                {
                    "units": self.variable_unit,
                    "name": self.variable_unit,
                },
            )
        }
        coords = {
            "time": (["time"], timestamps),
            "depth": (["depth"], np.unique(self.depths)),
            "latitude": (["latitude"], pts[:, 0]),
            "longitude": (["longitude"], pts[:, 1]),
        }
        ds = xr.Dataset(data_vars=data_vars, coords=coords)
        ds["time"].attrs = {"units": self.dataset_config.time_dim_units}

        return super(TimeseriesPlotter, self).netcdf(ds)

    def plot(self):
        if self.scale:
            vmin = self.scale[0]
            vmax = self.scale[1]
        else:
            vmin, vmax = utils.normalize_scale(
                self.data, self.dataset_config.variable[self.variables[0]]
            )

        if self.cmap is None:
            self.cmap = colormap.find_colormap(self.variable_name)

        datenum = matplotlib.dates.date2num(self.times)
        var_unit = utils.mathtext(self.variable_unit)
        if self.depth == "all":
            size = list(map(float, self.size.split("x")))
            numpoints = len(self.points)
            figuresize = (size[0], size[1] * numpoints)
            fig, ax = plt.subplots(
                numpoints, 1, sharex=True, figsize=figuresize, dpi=self.dpi
            )

            if not isinstance(ax, np.ndarray):
                ax = [ax]

            for idx, p in enumerate(self.points):
                d = self.data[idx, 0, :]
                dlim = np.ma.flatnotmasked_edges(d[0, :])
                maxdepth = self.depths[dlim[1]].max()
                mindepth = self.depths[dlim[0]].min()

                c = ax[idx].pcolormesh(
                    datenum,
                    self.depths[: dlim[1] + 1],
                    d[:, : dlim[1] + 1].transpose(),
                    shading="gouraud",
                    cmap=self.cmap,
                    vmin=vmin,
                    vmax=vmax,
                )
                ax[idx].invert_yaxis()
                if maxdepth > LINEAR:
                    ax[idx].set_yscale("symlog", linthresh=LINEAR)
                ax[idx].yaxis.set_major_formatter(ScalarFormatter())

                if maxdepth > LINEAR:
                    lim = 10 ** np.floor(np.log10(maxdepth))
                    ax[idx].set_ylim(np.ceil(maxdepth / lim) * lim, mindepth)
                    ax[idx].set_yticks(list(ax[idx].get_yticks()) + [maxdepth, LINEAR])
                else:
                    ax[idx].set_ylim(maxdepth, mindepth)
                ax[idx].set_ylabel("Depth (%s)" % utils.mathtext(self.depth_unit))

                ax[idx].xaxis_date()
                ax[idx].set_xlim(datenum[0], datenum[-1])

                ax[idx].text(
                    0,
                    -0.25,
                    self.get_stats_str(self.data[idx, 0, :], var_unit),
                    fontsize=14,
                    transform=ax[idx].transAxes,
                )

                divider = make_axes_locatable(ax[idx])
                cax = divider.append_axes("right", size="5%", pad=0.05)
                bar = plt.colorbar(c, cax=cax)
                bar.set_label(f"{self.variable_name.title()} ({var_unit})")
                ax[idx].set_title(
                    "%s%s at %s"
                    % (self.variable_name.title(), self.depth_label, self.names[idx])
                )
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
                utils.point_plot(
                    np.array(
                        [
                            [x[0] for x in self.points],  # Latitudes
                            [x[1] for x in self.points],  # Longitudes
                        ]
                    ),
                    gs[0, subplot],
                )
                subplot += 1

            plt.subplot(gs[:, subplot])
            for idx, _ in enumerate(self.points):
                plt.plot_date(
                    datenum,
                    np.squeeze(self.data[idx, :, :]),
                    fmt="-",
                    figure=fig,
                    xdate=True,
                )
            plt.ylabel(
                f"{self.variable_name.title()} ({var_unit})",
                fontsize=14,
            )
            plt.ylim(vmin, vmax)

            # Title
            if self.plotTitle is None or self.plotTitle == "":
                wrapped_title = wrap(
                    "%s%s at %s"
                    % (
                        self.variable_name.title(),
                        self.depth_label,
                        ", ".join(self.names),
                    ),
                    80,
                )
                plt.title("\n".join(wrapped_title), fontsize=15)
            else:
                plt.title(self.plotTitle, fontsize=15)

            ax = plt.gca()
            ax.grid(True)

            fig.autofmt_xdate()

            self.plot_legend(fig, self.names)

            ax.text(
                0,
                -0.25,
                self.get_stats_str(self.data, var_unit),
                fontsize=14,
                transform=ax.transAxes,
            )

            if self.axis_range:
                plt.gca().set_ylim(self.axis_range[0])

        return super(TimeseriesPlotter, self).plot(fig)
