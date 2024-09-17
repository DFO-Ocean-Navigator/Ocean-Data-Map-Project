import datetime
import time

import dateutil.parser
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
import pytz
import visvalingamwyatt as vw
from geopy.distance import distance
from mpl_toolkits.axes_grid1 import make_axes_locatable
from scipy.interpolate import interp1d
from sqlalchemy import func
from sqlalchemy.orm import Session

import plotting.colormap as colormap
import plotting.utils as utils
from data import open_dataset
from data.observational import (
    DataType,
    Platform,
    Sample,
    Station,
)
from data.observational.queries import get_platform_variable_track
from data.utils import datetime_to_timestamp
from plotting.plotter import Plotter


class TrackPlotter(Plotter):
    def __init__(self, dataset_name: str, query: str, db: Session, **kwargs):
        self.plottype: str = "track"
        super().__init__(dataset_name, query, **kwargs)
        self.db = db
        self.size: str = "11x5"
        self.model_depths = None

    def parse_query(self, query):
        super().parse_query(query)
        self.latlon = query.get("latlon") is None or bool(query.get("latlon"))

        track = query.get("track")
        if isinstance(track, str):
            tracks = track.split(",")
        else:
            tracks = track

        self.platform = tracks[0]

        trackvariable = query.get("trackvariable")
        if isinstance(trackvariable, str):
            trackvariables = trackvariable.split(",")
        elif not isinstance(trackvariable, list):
            trackvariables = [trackvariable]
        else:
            trackvariables = trackvariable

        self.trackvariables = trackvariables

        self.starttime = dateutil.parser.parse(query.get("starttime"))
        self.endtime = dateutil.parser.parse(query.get("endtime"))
        self.track_quantum = query.get("track_quantum", "hour")

    def load_data(self):
        platform = self.db.query(Platform).get(self.platform)
        self.name = platform.unique_id

        # First get the variable
        st0 = self.db.query(Station).filter(Station.platform == platform).first()
        datatype_keys = [
            k[0]
            for k in self.db.query(func.distinct(Sample.datatype_key))
            .filter(Sample.station == st0)
            .all()
        ]

        datatypes = (
            self.db.query(DataType)
            .filter(DataType.key.in_([d for d in datatype_keys]))
            .order_by(DataType.key)
            .all()
        )

        variables = [datatypes[int(x)] for x in self.trackvariables]
        self.data_names = [dt.name for dt in variables]
        self.data_units = [dt.unit for dt in variables]
        self.track_cmaps = [colormap.find_colormap(dt.name) for dt in variables]

        d = []
        for v in variables:
            d.append(
                get_platform_variable_track(
                    self.db,
                    platform,
                    v.key,
                    self.track_quantum,
                    starttime=self.starttime,
                    endtime=self.endtime,
                )
            )

        d = np.array(d)

        self.points = d[0, :, 1:3].astype(float)
        add_tz_utc = np.vectorize(lambda x: x.replace(tzinfo=pytz.UTC))
        self.times = add_tz_utc(d[0, :, 0])
        self.data = d[:, :, 4].astype(float)
        self.depth = d[0, :, 3].astype(float)

        d_delta = [
            distance(p0, p1).km for p0, p1 in zip(self.points[0:-1], self.points[1:])
        ]
        d_delta.insert(0, 0)
        self.distances = np.cumsum(d_delta)

        start = int(
            datetime_to_timestamp(self.times[0], self.dataset_config.time_dim_units)
        )
        end = int(
            datetime_to_timestamp(self.times[-1], self.dataset_config.time_dim_units)
        )

        points_simplified = self.points
        if len(self.points) > 100:
            points_simplified = np.array(vw.simplify(self.points, number=100))

        if len(self.variables) > 0:
            with open_dataset(
                self.dataset_config,
                timestamp=start,
                endtime=end,
                variable=self.variables,
                nearest_timestamp=True,
            ) as dataset:
                # Make distance -> time function
                dist_to_time = interp1d(
                    self.distances,
                    [time.mktime(t.timetuple()) for t in self.times],
                    assume_sorted=True,
                    bounds_error=False,
                )

                output_times = dist_to_time(np.linspace(0, self.distances[-1], 100))

                model_times = sorted(
                    [time.mktime(t.timetuple()) for t in dataset.nc_data.timestamps]
                )

                self.model_depths = dataset.depths

                d = []
                depth = 0

                for v in self.variables:
                    if len(np.unique(self.depth)) > 1:
                        pts, dist, md, dep = dataset.get_path_profile(
                            points_simplified,
                            v,
                            int(
                                datetime_to_timestamp(
                                    dataset.nc_data.timestamps[0],
                                    self.dataset_config.time_dim_units,
                                )
                            ),
                            endtime=int(
                                datetime_to_timestamp(
                                    dataset.nc_data.timestamps[-1],
                                    self.dataset_config.time_dim_units,
                                )
                            ),
                        )

                        if len(model_times) > 1:
                            f = interp1d(
                                model_times,
                                md.filled(np.nan),
                                assume_sorted=True,
                                bounds_error=False,
                            )

                            ot = dist_to_time(dist)
                            od = f(ot).diagonal(0, 0, 2).copy()
                        else:
                            od = md

                        # Clear model data beneath observed data
                        od[np.where(self.model_depths > max(self.depth))[0][1:], :] = (
                            np.nan
                        )

                        d.append(od)

                        mt = [
                            int(
                                datetime_to_timestamp(
                                    t, self.dataset_config.time_dim_units
                                )
                            )
                            for t in dataset.nc_data.timestamps
                        ]
                        model_dist = dist
                    else:
                        pts, dist, mt, md = dataset.get_path(
                            self.points,
                            depth,
                            v,
                            datetime_to_timestamp(
                                dataset.nc_data.timestamps[0],
                                self.dataset_config.time_dim_units,
                            ),
                            endtime=datetime_to_timestamp(
                                dataset.nc_data.timestamps[-1],
                                self.dataset_config.time_dim_units,
                            ),
                            times=output_times,
                        )
                        model_dist = dist

                        if len(model_times) > 1:
                            f = interp1d(
                                model_times,
                                md,
                                assume_sorted=True,
                                bounds_error=False,
                            )
                            d.append(np.diag(f(mt)))
                        else:
                            d.append(md)

                model_data = np.ma.array(d)

                variable_units = []
                variable_names = []
                cmaps = []
                for v in self.variables:
                    vc = self.dataset_config.variable[v]
                    variable_units.append(vc.unit)
                    variable_names.append(vc.name)
                    cmaps.append(colormap.find_colormap(vc.name))

                self.model_data = model_data
                self.model_dist = model_dist
                self.model_times = list(
                    map(datetime.datetime.utcfromtimestamp, model_times)
                )
                self.variable_names = variable_names
                self.variable_units = variable_units
                self.cmaps = cmaps

    def plot(self):
        if self.showmap:
            width = 2
            width_ratios = [3, 7]
        else:
            width = 1
            width_ratios = [1]

        numplots = len(self.variables) + len(self.trackvariables)
        if "votemper" in self.variables and "sst" in self.trackvariables:
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
                utils.path_plot(self.points.transpose(), gs[:, 0], False)
            else:
                utils.path_plot(self.points.transpose(), gs[0], False)

        # Plot observed
        if self.showmap:
            subplot = 1
            subplot_inc = 2
        else:
            subplot = 0
            subplot_inc = 1

        for j, v in enumerate(self.trackvariables):
            ax = plt.subplot(gs[subplot])
            subplot += subplot_inc

            # Is the depth changing?
            if len(np.unique(self.depth)) == 1:
                ax.plot(self.distances, self.data[j])
                ax.set_xlim(self.distances[0], self.distances[-1])
                ax.set_xlabel("Distance (km)")
            else:
                self.data[j, np.where(self.depth <= 0)] = np.nan

                RES = (50, 100)

                dd = np.empty((RES[0] + 1, RES[1] + 1))
                dd[:, :] = np.nan
                x = np.linspace(0, max(self.distances), RES[1])
                y = np.linspace(0, max(self.depth), RES[0])

                di = np.digitize(self.distances, x)
                de = np.digitize(self.depth, y)

                co = np.array(list(zip(di, de)))
                dd[co[:, 1], co[:, 0]] = self.data[j]

                c = ax.pcolormesh(
                    x,
                    y,
                    np.ma.masked_invalid(dd[:-1, :-1]),
                    cmap=self.track_cmaps[j],
                    shading="gouraud",
                )
                ax.set_xlim(0, max(self.distances))

                ax.invert_yaxis()
                ax.set_xlabel("Distance (km)")

                ax.set_ylim(max(self.depth), 0)
                divider = make_axes_locatable(ax)
                cax = divider.append_axes("right", size="5%", pad="5%")
                bar = plt.colorbar(c, cax=cax)

            legend = [self.name]

            if len(legend) > 1:
                leg = plt.legend(legend, loc="best")
                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

            if len(np.unique(self.depth)) == 1:
                if self.data_units[j] is not None:
                    ax.set_ylabel(
                        f"{self.data_names[j]} \
                        ({utils.mathtext(self.data_units[j])})"
                    )
                else:
                    ax.set_ylabel(self.data_names[j])
            else:
                if self.data_units[j] is not None:
                    bar.set_label(
                        f"{self.data_names[j]} \
                        ({utils.mathtext(self.data_units[j])})"
                    )
                else:
                    bar.set_label(self.data_names[j])

                ax.set_ylabel("Depth (m)")

        for idx, v in enumerate(self.variables):
            if np.isnan(self.model_data[idx]).all():
                continue

            ax = plt.subplot(gs[subplot])
            subplot += subplot_inc

            if len(np.unique(self.depth)) > 1:
                mdist = np.linspace(0, self.model_dist[-1], 100)
                f = interp1d(
                    self.model_dist,
                    self.model_data[idx],
                    assume_sorted=True,
                    bounds_error=False,
                )
                mdata = f(mdist)
                mdata = np.ma.masked_invalid(mdata)
                mdata = np.ma.masked_greater(mdata, mdata.fill_value)

                c = ax.pcolormesh(
                    mdist,
                    self.model_depths,
                    mdata,
                    cmap=self.cmaps[idx],
                    shading="gouraud",
                )
                ax.invert_yaxis()
                ax.set_ylim(max(self.depth), 0)

                divider = make_axes_locatable(ax)
                cax = divider.append_axes("right", size="5%", pad="5%")
                bar = plt.colorbar(c, cax=cax)
            else:
                ax.plot(self.model_dist, self.model_data[idx])

            ax.set_xlim(
                self.model_dist[0],
                self.model_dist[-1],
            )
            ax.set_xlabel("Distance (km)")

            if len(np.unique(self.depth)) > 1:
                ax.set_ylabel("Depth (m)")
                bar.set_label(
                    f"{self.variable_names[idx]} \
                    ({utils.mathtext(self.variable_units[idx])})"
                )
            else:
                ax.set_ylabel(
                    "%s (%s)"
                    % (
                        self.variable_names[idx],
                        utils.mathtext(self.variable_units[idx]),
                    )
                )
            plt.setp(ax.get_xticklabels(), rotation=30)

        # latlon
        if self.latlon:
            for j, label in enumerate(
                [
                    "Latitude (degrees)",
                    "Longitude (degrees)",
                ]  # [gettext("Latitude (degrees)"), gettext("Longitude (degrees)")]
            ):
                plt.subplot(gs[subplot])
                subplot += subplot_inc

                plt.plot(self.times, self.points[:, j])

                plt.ylabel(label)
                plt.setp(plt.gca().get_xticklabels(), rotation=30)

        fig.suptitle(
            "Track Plot (Observed %s - %s, Modelled %s - %s)"  # gettext("Track Plot (Observed %s - %s, Modelled %s - %s)")
            % (
                self.times[0].strftime("%Y-%m-%d"),
                self.times[-1].strftime("%Y-%m-%d"),
                self.model_times[0].strftime("%Y-%m-%d"),
                self.model_times[-1].strftime("%Y-%m-%d"),
            )
        )
        fig.tight_layout(pad=3, w_pad=4)
        return super().plot(fig)

    def csv(self):
        header = [
            ["Dataset", self.dataset_name],
            ["Buoy ID", self.name],
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

        return super().csv(header, columns, data)
