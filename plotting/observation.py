import numbers
import re
from textwrap import wrap

import dateutil.parser
import matplotlib.pyplot as plt
import numpy as np
import pint
import pytz
from babel.dates import format_datetime
from sqlalchemy import func
from sqlalchemy.orm import Session

from data import open_dataset
from data.observational import DataType, Sample, Station
from data.utils import datetime_to_timestamp
from plotting.point import PointPlotter
from plotting.utils import mathtext
from utils.errors import ClientError


class ObservationPlotter(PointPlotter):
    def __init__(self, dataset_name: str, query: str, db: Session, **kwargs):
        self.plottype: str = "observation"
        self.db = db
        super(ObservationPlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):
        if isinstance(self.observation[0], numbers.Number):
            self.observation_variable_names = []
            self.observation_variable_units = []

            self.data = []
            self.timestamps = []
            self.observation_times = []
            self.names = []

            for idx, o in enumerate(self.observation):
                station = self.db.query(Station).get(o)
                observation = {
                    "time": station.time.isoformat(),
                    "longitude": station.longitude,
                    "latitude": station.latitude,
                }
                self.observation_time = station.time
                self.observation_times.append(station.time)

                if station.name:
                    self.names.append(station.name)
                else:
                    self.names.append(
                        f"({station.latitude:.4f}, {station.longitude:.4f})"
                    )
                datatype_keys = [
                    k[0]
                    for k in self.db.query(func.distinct(Sample.datatype_key))
                    .filter(Sample.station == station)
                    .all()
                ]

                datatypes = (
                    self.db.query(DataType)
                    .filter(DataType.key.in_(datatype_keys))
                    .order_by(DataType.key)
                    .all()
                )

                observation["datatypes"] = [
                    f"{dt.name} [{dt.unit}]" for dt in datatypes
                ]

                data = []
                for dt in datatypes:
                    data.append(
                        self.db.query(Sample.depth, Sample.value)
                        .filter(Sample.station == station, Sample.datatype == dt)
                        .all()
                    )

                    if idx == 0:
                        self.observation_variable_names.append(dt.name)
                        self.observation_variable_units.append(dt.unit)

                observation["data"] = np.ma.array(data)  # .transpose()
                self.observation[idx] = observation

                self.points = [
                    [o["latitude"], o["longitude"]] for o in self.observation
                ]

        cftime = datetime_to_timestamp(station.time, self.dataset_config.time_dim_units)

        with open_dataset(
            self.dataset_config,
            variable=self.variables,
            timestamp=int(cftime),
            nearest_timestamp=True,
        ) as dataset:
            ts = dataset.nc_data.timestamps

            observation_times = []
            timestamps = []
            for o in self.observation:
                observation_time = dateutil.parser.parse(o["time"]).replace(
                    tzinfo=pytz.UTC
                )
                observation_times.append(observation_time)

                deltas = [(x - observation_time).total_seconds() for x in ts]

                time = np.abs(deltas).argmin()
                timestamp = ts[time]
                timestamps.append(timestamp)

            try:
                self.load_misc(dataset, self.variables)
            except IndexError as e:
                raise ClientError(
                    (
                        "The selected variable(s) were not found in the dataset. \
                        Most likely, this variable is a derived product from existing \
                        dataset variables. Please select another variable."
                    )
                    + str(e)
                )

            point_data, self.depths = self.get_data(
                dataset,
                self.variables,
                datetime_to_timestamp(
                    timestamps[0], self.dataset_config.time_dim_units
                ),
            )
            point_data = np.ma.array(point_data)

        self.data = point_data
        self.observation_time = observation_time
        self.observation_times = observation_times
        self.timestamps = timestamps
        self.timestamp = timestamp

    def parse_query(self, query):
        super(ObservationPlotter, self).parse_query(query)

        observation_variable = list(map(int, query.get("observation_variable")))
        observation = query.get("observation")
        if not isinstance(observation[0], numbers.Number):
            observation_variable_names = [
                re.sub(r" \[.*\]", "", x) for x in observation[0]["datatypes"]
            ]
            observation_variable_units = [
                re.match(r".*\[(.*)\]", x).group(1) for x in observation[0]["datatypes"]
            ]

            self.parse_names_points(
                [str(o.get("station")) for o in observation],
                [[o.get("latitude"), o.get("longitude")] for o in observation],
            )

            self.observation_variable_names = observation_variable_names
            self.observation_variable_units = observation_variable_units

        self.observation = observation
        self.observation_variable = observation_variable

    def plot(self):
        v = set([])
        for idx in self.observation_variable:
            v.add(self.observation_variable_names[idx])
        for n in self.variable_names:
            v.add(n)

        numplots = len(v)

        fig, ax = self.setup_subplots(numplots)

        data = []
        for o in self.observation:
            d = np.ma.MaskedArray(o["data"])
            d[np.where(d == "")] = np.ma.masked
            d = np.ma.masked_invalid(d.filled(np.nan).astype(np.float32))
            data.append(d)

        ureg = pint.UnitRegistry()
        ax_idx = -1
        axis_map = {}
        unit_map = {}
        for idx in self.observation_variable:
            ax_idx += 1
            for d in data:
                if d.shape[1] == 1:
                    style = "."
                else:
                    style = "-"

                ax[ax_idx].plot(d[idx, :, 1], d[idx, :, 0], style)
            ax[ax_idx].xaxis.set_label_position("top")
            ax[ax_idx].xaxis.set_ticks_position("top")
            ax[ax_idx].set_xlabel(
                "%s (%s)"
                % (
                    self.observation_variable_names[idx],
                    mathtext(self.observation_variable_units[idx]),
                )
            )
            axis_map[self.observation_variable_names[idx]] = ax[ax_idx]

            try:
                if "_" in self.observation_variable_units[idx]:
                    u = self.observation_variable_units[idx].lower().split("_", 1)[1]
                else:
                    u = self.observation_variable_units[idx].lower()
                unit_map[self.observation_variable_names[idx]] = ureg.parse_units(u)

            except:
                unit_map[self.observation_variable_names[idx]] = ureg.dimensionless

        for k, v in list(unit_map.items()):
            if v == ureg.speed_of_light:
                unit_map[k] = ureg.celsius

        for idx, var in enumerate(self.variables):
            if axis_map.get(self.variable_names[idx]) is not None:
                axis = axis_map.get(self.variable_names[idx])
                showlegend = True
                destunit = unit_map.get(self.variable_names[idx])
            else:
                ax_idx += 1
                axis = ax[ax_idx]
                showlegend = False
                try:
                    destunit = ureg.parse_units(self.variable_units[idx].lower())
                    if destunit == ureg.speed_of_light:
                        destunit = ureg.celsius

                except:
                    destunit = ureg.dimensionless

            for j in range(0, self.data.shape[0]):
                try:
                    u = ureg.parse_units(self.variable_units[idx].lower())
                    if u == ureg.speed_of_light:
                        u = ureg.celsius

                    quan = ureg.Quantity(self.data[j, idx, :], u)
                except:
                    quan = ureg.Quantity(self.data[j, idx, :], ureg.dimensionless)

                axis.plot(quan.to(destunit).magnitude, self.depths[j, idx, :])

            showlegend = showlegend or len(self.observation) > 1
            if not showlegend:
                axis.xaxis.set_label_position("top")
                axis.xaxis.set_ticks_position("top")
                axis.set_xlabel(
                    "%s (%s)"
                    % (
                        self.variable_names[idx],
                        mathtext(self.variable_units[idx]),
                    )
                )
            else:
                l = []
                for j in [
                    (
                        "Observed",
                        self.observation_times,
                    ),  # (gettext("Observed"), self.observation_times),
                    (
                        "Modelled",
                        self.timestamps,
                    ),  # (gettext("Modelled"), self.timestamps),
                ]:
                    for i, name in enumerate(self.names):
                        if len(self.names) == 1:
                            name = ""
                        else:
                            name = name + " "

                        l.append("%s%s (%s)" % (name, j[0], format_datetime(j[1][i])))

                leg = axis.legend(l, loc="best")

                for legobj in leg.legend_handles:
                    legobj.set_linewidth(4.0)

        ax[0].invert_yaxis()
        ax[0].set_ylabel("Depth (m)")  # ax[0].set_ylabel(gettext("Depth (m)"))

        if not self.plotTitle:
            if len(self.variables) > 0:
                plt.suptitle(
                    "\n".join(
                        wrap(
                            "Profile for %s, Observed at %s, Modelled at %s"  # gettext("Profile for %s, Observed at %s, Modelled at %s")
                            % (
                                ", ".join(self.names),
                                format_datetime(self.observation_time),
                                format_datetime(self.timestamp),
                            ),
                            80,
                        )
                    )
                )
            else:
                plt.suptitle(
                    "\n".join(
                        wrap(
                            "Profile for %s (%s)"  # gettext("Profile for %s (%s)")
                            % (
                                ", ".join(self.names),
                                format_datetime(self.observation_time),
                            ),
                            80,
                        )
                    )
                )
        else:
            plt.suptitle(self.plotTitle, fontsize=15)

        fig.tight_layout()
        fig.subplots_adjust(top=0.85)

        return super(ObservationPlotter, self).plot()
