import matplotlib.pyplot as plt
import numpy as np
import plotter
from netCDF4 import Dataset
from oceannavigator.util import get_dataset_url
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
        point_depths = []

        for p in self.points:
            data = []
            depths = []
            for v in variables:
                prof, d = dataset.get_profile(
                    float(p[0]),
                    float(p[1]),
                    time,
                    v
                )
                data.append(prof)
                depths.append(d)
            point_data.append(np.ma.array(data))
            point_depths.append(np.ma.array(depths))

        return np.ma.array(point_data), np.ma.array(point_depths)

    def subtract_other(self, data):
        if self.compare:
            with Dataset(
                get_dataset_url(self.compare['dataset']), 'r'
            ) as dataset:
                cli = self.get_data(
                    dataset, self.compare['variables'], self.compare['time']
                )

            for idx, v in enumerate(self.variables):
                data[:, idx, :] = \
                    data[:, idx, :] - cli[:, idx, :]

        return data

    def load_temp_sal(self, dataset, time):
        temp_var = None
        if "votemper" in dataset.variables:
            temp_var = "votemper"
        elif "temp" in dataset.variables:
            temp_var = "temp"

        sal_var = None
        if "vosaline" in dataset.variables:
            sal_var = "vosaline"
        elif "salinity" in dataset.variables:
            sal_var = "salinity"

        self.variables = [temp_var, sal_var]

        data, depths = self.get_data(dataset, [temp_var, sal_var], time)
        self.temperature = data[:, 0, :].view(np.ma.MaskedArray)
        self.salinity = data[:, 1, :].view(np.ma.MaskedArray)
        self.temperature_depths = depths[:, 0, :].view(np.ma.MaskedArray)
        self.salinity_depths = depths[:, 1, :].view(np.ma.MaskedArray)
        self.load_misc(dataset, [temp_var, sal_var])

        for idx, factor in enumerate(self.scale_factors):
            if factor != 1.0:
                data[:, idx, :] = np.multiply(data[:, idx, :], factor)

    def kelvin_to_celsius(self, units, data):
        ureg = pint.UnitRegistry()
        for idx, unit in enumerate(units):
            try:
                u = ureg.parse_units(unit.lower())
            except:
                u = ureg.dimensionless

            if u == ureg.kelvin:
                units[idx] = "Celsius"
                data[:, idx, :] = ureg.Quantity(
                    data[:, idx, :],
                    u
                ).to(ureg.celsius).magnitude

        return (units, data)

    def apply_scale_factors(self, data):
        for idx, factor in enumerate(self.scale_factors):
            if factor != 1.0:
                data[idx] = np.multiply(data[idx], factor)

        return data

    def figuresize(self):
        figuresize = map(float, self.size.split("x"))
        if len(self.points) > 10:
            figuresize[0] *= 1.0 / 1.25

        return figuresize
