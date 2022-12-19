#!/usr/bin/env python

import matplotlib.pyplot as plt
import numpy as np
import pint
from netCDF4 import Dataset

from oceannavigator import DatasetConfig
from plotting.plotter import Plotter


class PointPlotter(Plotter):
    def parse_query(self, query):
        super(PointPlotter, self).parse_query(query)

        self.points: list = []
        self.parse_names_points(query.get("names"), query.get("station"))

    def setup_subplots(self, numplots):
        fig, ax = plt.subplots(
            1, numplots, sharey=True, figsize=self.figuresize, dpi=self.dpi
        )

        if not isinstance(ax, np.ndarray):
            ax = [ax]

        return fig, ax

    def parse_names_points(self, names, points):
        if points is None or len(points) < 1:
            points = [[47.546667, -52.586667]]

        if (
            names is None
            or len(names) == 0
            or len(names) != len(points)
            or names[0] is None
        ):
            names = [
                "(%1.4f, %1.4f)" % (float(point[0]), float(point[1]))
                for point in points
            ]

        t = sorted(zip(names, points))
        self.names = [n for (n, p) in t]
        self.points = [p for (n, p) in t]

    def get_data_old(self, dataset, variables, time):
        point_data = []
        point_depths = []

        for p in self.points:
            data = []
            depths = []
            for v in variables:
                prof, d = dataset.get_profile(float(p[0]), float(p[1]), v, time)
                data.append(prof)
                depths.append(d)

            point_data.append(np.ma.array(data))
            point_depths.append(np.ma.array(depths))

        return np.ma.array(point_data), np.ma.array(point_depths)

    def get_data(self, dataset, variables, time):
        if not isinstance(time, list):
            time = [time]

        time_data = []
        time_depths = []
        for t in time:
            point_data = []
            point_depths = []
            for p in self.points:
                data = []
                depths = []
                for v in variables:
                    prof, d = dataset.get_profile(float(p[0]), float(p[1]), v, t)
                    data.append(prof)
                    depths.append(d)

                point_data.append(np.ma.array(data))
                point_depths.append(np.ma.array(depths))

            time_data.append(np.ma.array(point_data))
            time_depths.append(np.ma.array(point_depths))

        return np.ma.array(time_data), np.ma.array(time_depths)

    def subtract_other(self, data):
        if self.compare:
            compare_config = DatasetConfig(self.compare["dataset"])
            with Dataset(compare_config.url, "r") as dataset:
                cli = self.get_data(
                    dataset, self.compare["variables"], self.compare["time"]
                )

            for idx, _ in enumerate(self.variables):
                data[:, idx, :] = data[:, idx, :] - cli[:, idx, :]

        return data

    @property
    def figuresize(self):
        if self.size:
            figuresize = list(map(float, self.size.split("x")))
            if len(self.points) > 10:
                figuresize[0] *= 1.0 / 1.25

            return figuresize
