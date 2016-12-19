from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
import utils
from textwrap import wrap
import pint
from oceannavigator.util import get_dataset_url
import re
import dateutil.parser
import pytz
import point


class ObservationPlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "observation"
        super(ObservationPlotter, self).__init__(dataset_name, query, format)

    def load_data(self):
        with Dataset(get_dataset_url(self.dataset_name), 'r') as dataset:
            time_var = utils.get_time_var(dataset)

            t = netcdftime.utime(time_var.units)
            ts = t.num2date(time_var[:])

            observation_times = []
            timestamps = []
            for o in self.observation:
                observation_time = dateutil.parser.parse(o['time'])
                observation_times.append(observation_time)

                deltas = [
                    (x.replace(tzinfo=pytz.UTC) -
                     observation_time).total_seconds()
                    for x in ts]

                time = np.abs(deltas).argmin()
                timestamp = t.num2date(time_var[time])
                timestamps.append(timestamp)

            self.load_misc(dataset, self.variables)

            point_data = self.get_data(dataset, self.variables, time)
            point_data = np.ma.array(point_data)

            self.variable_units, point_data = self.kelvin_to_celsius(
                self.variable_units,
                point_data
            )

        self.data = self.subtract_climatology(point_data, timestamp)
        self.observation_time = observation_time
        self.observation_times = observation_times
        self.timestamps = timestamps
        self.timestamp = timestamp

    def parse_query(self, query):
        super(ObservationPlotter, self).parse_query(query)

        observation_variable = map(int, query.get("observation_variable"))
        observation = query.get("observation")

        observation_variable_names = map(lambda x: re.sub(r" \[.*\]", "", x),
                                         observation[0]['datatypes'])
        observation_variable_units = map(
            lambda x: re.match(r".*\[(.*)\]", x).group(1),
            observation[0]['datatypes'])

        self.parse_names_points(
            [str(o.get('station')) for o in observation],
            [[o.get('latitude'), o.get('longitude')] for o in observation]
        )

        self.observation_variable = observation_variable
        self.observation = observation
        self.observation_variable_names = observation_variable_names
        self.observation_variable_units = observation_variable_units

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
            d = np.ma.MaskedArray(o['data'])
            d[np.where(d == '')] = np.ma.masked
            d = np.ma.masked_invalid(d.filled(np.nan).astype(np.float32))
            data.append(d)

        ureg = pint.UnitRegistry()
        ax_idx = -1
        udepth = ureg.parse_expression(self.observation[0]['depthunit'])
        axis_map = {}
        unit_map = {}
        for idx in self.observation_variable:
            ax_idx += 1
            for d in data:
                ax[ax_idx].plot(
                    d[:, idx],
                    self.observation[0]['depth'] * udepth.to(ureg.meter)
                )
            ax[ax_idx].xaxis.set_label_position('top')
            ax[ax_idx].xaxis.set_ticks_position('top')
            ax[ax_idx].set_xlabel("%s (%s)" % (
                self.observation_variable_names[idx],
                self.observation_variable_units[idx],
            ))
            axis_map[self.observation_variable_names[idx]] = ax[ax_idx]

            try:
                unit_map[self.observation_variable_names[idx]] = \
                    ureg.parse_units(
                        self.observation_variable_units[idx].lower())
            except pint.UndefinedUnitError:
                unit_map[
                    self.observation_variable_names[idx]] = ureg.dimensionless

        for k, v in unit_map.iteritems():
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
                    destunit = ureg.parse_units(
                        self.variable_units[idx].lower())
                    if destunit == ureg.speed_of_light:
                        destunit = ureg.celsius

                except pint.UndefinedUnitError:
                    destunit = ureg.dimensionless

            for j in range(0, self.data.shape[0]):
                try:
                    u = ureg.parse_units(self.variable_units[idx].lower())
                    if u == ureg.speed_of_light:
                        u = ureg.celsius

                    quan = ureg.Quantity(self.data[j, idx, :], u)
                except pint.UndefinedUnitError:
                    quan = ureg.Quantity(
                        self.data[j, idx, :], ureg.dimensionless)

                axis.plot(quan.to(destunit).magnitude, self.depths)

            showlegend = showlegend or len(self.observation) > 1
            if not showlegend:
                axis.xaxis.set_label_position('top')
                axis.xaxis.set_ticks_position('top')
                axis.set_xlabel("%s (%s)" % (
                    self.variable_names[idx],
                    self.variable_units[idx],
                ))
            else:
                l = []
                for j in [
                    ("Observed", self.observation_times),
                    ("Modelled", self.timestamps)
                ]:
                    for i, name in enumerate(self.names):
                        if len(self.names) == 1:
                            name = ""
                        else:
                            name = name + " "

                        l.append("%s%s (%s)" % (
                            name,
                            j[0],
                            j[1][i].strftime(self.dformat)
                        ))

                leg = axis.legend(l, loc='best')

                for legobj in leg.legendHandles:
                    legobj.set_linewidth(4.0)

        ax[0].invert_yaxis()
        ax[0].set_ylabel("Depth (%s)" % utils.mathtext(self.depth_unit))

        if len(self.variables) > 0:
            plt.suptitle("\n".join(
                wrap(
                    "Profile for %s, Observed at %s, Modelled at %s" % (
                        ", ".join(self.names),
                        self.observation_time.strftime(self.dformat),
                        self.timestamp.strftime(self.dformat)
                    ), 80)
            ))
        else:
            plt.suptitle("\n".join(
                wrap(
                    "Profile for %s (%s)" % (
                        ", ".join(self.names),
                        self.observation_time.strftime(self.dformat)
                    ), 80)
            ))

        fig.tight_layout()
        fig.subplots_adjust(top=0.88)

        return super(ObservationPlotter, self).plot()
