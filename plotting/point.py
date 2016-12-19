import matplotlib.pyplot as plt
import numpy as np
import plotter
from netCDF4 import Dataset
from data import load_timeseries
from oceannavigator.util import get_dataset_climatology
import pint


class PointPlotter(plotter.Plotter):

    def parse_query(self, query):
        super(PointPlotter, self).parse_query(query)

        self.parse_names_points(query.get('names'), query.get('station'))

    def setup_subplots(self, numplots):
        fig, ax = plt.subplots(
            1, numplots, sharey=True,
            figsize=self.figuresize(),
            dpi=self.dpi
        )

        if not isinstance(ax, np.ndarray):
            ax = [ax]

        return fig, ax

    def parse_names_points(self, names, points):
        if points is None or len(points) < 1:
            points = [[47.546667, -52.586667]]

        if names is None or \
           len(names) == 0 or \
           len(names) != len(points) or \
           names[0] is None:
            names = [
                "(%1.4f, %1.4f)" % (float(l[0]), float(l[1])) for l in points
            ]

        t = sorted(zip(names, points))
        self.names = [n for (n, p) in t]
        self.points = [p for (n, p) in t]

    def get_data(self, dataset, variables, time):
        point_data = []
        for p in self.points:
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
                data.append(d)
            point_data.append(np.ma.array(data))

        return np.ma.array(point_data)

    def subtract_climatology(self, data, timestamp):
        if self.variables != self.variables_anom:
            with Dataset(
                get_dataset_climatology(self.dataset_name), 'r'
            ) as dataset:
                cli = self.get_data(
                    dataset, self.variables, timestamp.month - 1
                )

            for idx, v in enumerate(self.variables):
                if v != self.variables_anom[idx]:
                    data[:, idx, :] = \
                        data[:, idx, :] - cli[:, idx, :]

        return data

    def load_temp_sal(self, dataset, time):
        data = self.get_data(dataset, ["votemper", "vosaline"], time)
        self.temperature = data[:, 0, :].view(np.ma.MaskedArray)
        self.salinity = data[:, 1, :].view(np.ma.MaskedArray)

    def kelvin_to_celsius(self, units, data):
        ureg = pint.UnitRegistry()
        for idx, unit in enumerate(units):
            try:
                u = ureg.parse_units(unit.lower())
            except pint.UndefinedUnitError:
                u = ureg.dimensionless

            if u == ureg.kelvin:
                units[idx] = "Celsius"
                data[:, idx, :] = ureg.Quantity(
                    data[:, idx, :],
                    u
                ).to(ureg.celsius).magnitude

        return (units, data)

    def figuresize(self):
        figuresize = map(float, self.size.split("x"))
        if len(self.points) > 10:
            figuresize[0] *= 1.0 / 1.25

        return figuresize
