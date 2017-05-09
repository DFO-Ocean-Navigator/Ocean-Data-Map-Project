import matplotlib.pyplot as plt
import numpy as np
from oceannavigator.util import get_dataset_url
import seawater
import point
from flask_babel import gettext
from data import open_dataset


class TemperatureSalinityPlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "sound"
        super(TemperatureSalinityPlotter, self).__init__(dataset_name, query,
                                                         format)

    def csv(self):
        header = [
            ["Dataset", self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "Salinity",
            "Temperature",
        ]

        data = []

        # For each point
        for idx, p in enumerate(self.points):
            for idx2, val in enumerate(self.temperature[idx]):
                if np.ma.is_masked(val):
                    break
                data.append([
                    "%0.4f" % p[0],
                    "%0.4f" % p[1],
                    "%0.1f" % self.depths[idx],
                    "%0.1f" % self.salinity[idx][idx2],
                    "%0.1f" % self.temperature[idx][idx2]
                ])

        return super(TemperatureSalinityPlotter, self).csv(
            header, columns, data)

    def plot(self):
        fig = plt.figure(figsize=self.figuresize(), dpi=self.dpi)

        plt.title(gettext("T/S Diagram for %s (%s)") % (
            ", ".join(self.names),
            self.date_formatter(self.timestamp)))

        smin = np.amin(self.salinity) - (np.amin(self.salinity) * 0.01)
        smax = np.amax(self.salinity) + (np.amax(self.salinity) * 0.01)
        tmin = np.amin(self.temperature) - (
            np.abs(np.amax(self.temperature) * 0.1))
        tmax = np.amax(self.temperature) + (
            np.abs(np.amax(self.temperature) * 0.1))

        xdim = int(round((smax - smin) / 0.1 + 1, 0))
        ydim = int(round((tmax - tmin) + 1, 0))

        dens = np.zeros((ydim, xdim))
        ti = np.linspace(0, ydim - 1, ydim) + tmin
        si = np.linspace(0, xdim - 1, xdim) * 0.1 + smin

        for j in range(0, int(ydim)):
            for i in range(0, int(xdim)):
                dens[j, i] = seawater.dens(si[i], ti[j], 0)

        dens = dens - 1000

        CS = plt.contour(si, ti, dens, linestyles='dashed', colors='k')
        plt.clabel(CS, fontsize=16, inline=1, fmt=r"$\sigma_t = %1.1f$")

        for idx, _ in enumerate(self.temperature):
            plt.plot(self.salinity[idx], self.temperature[idx], '-')

        plt.xlabel(gettext("Salinity (PSU)"))
        plt.ylabel(gettext("Temperature (Celsius)"))

        self.plot_legend(fig, self.names)
        if len(self.points) == 1:
            labels = []
            for idx, d in enumerate(self.temperature_depths[0]):
                if np.ma.is_masked(self.temperature[0][idx]):
                    break
                digits = max(np.ceil(np.log10(d)), 3)
                d = np.round(d, -int(digits - 1))
                if d not in labels:
                    labels.append(d)
                    for idx2, _ in enumerate(self.temperature):
                        plt.annotate(
                            '{:.0f}m'.format(d),
                            xy=(self.salinity[idx2][
                                idx], self.temperature[idx2][idx]),
                            xytext=(15, -15),
                            ha='left',
                            textcoords='offset points',
                            arrowprops=dict(arrowstyle='->')  # , shrinkA=0)
                        )

        return super(TemperatureSalinityPlotter, self).plot(fig)

    def load_data(self):
        with open_dataset(get_dataset_url(self.dataset_name)) as dataset:
            if self.time < 0:
                self.time += len(dataset.timestamps)
            time = np.clip(self.time, 0, len(dataset.timestamps) - 1)

            self.timestamp = dataset.timestamps[time]

            self.load_temp_sal(dataset, time)

            self.variable_units[0], self.temperature = \
                super(point.PointPlotter, self).kelvin_to_celsius(
                    self.variable_units[0], self.temperature
            )
