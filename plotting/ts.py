import matplotlib.pyplot as plt
import numpy as np
import seawater
import plotting.point as plPoint
import matplotlib.gridspec as gridspec
import plotting.utils as utils
from flask_babel import gettext
from data import open_dataset

# Temperature/Salinity Diagram for a Point
class TemperatureSalinityPlotter(plPoint.PointPlotter):

    def __init__(self, dataset_name: str, query: str, format: str):
        self.plottype: str = "ts"
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
                    "%0.1f" % self.temperature_depths[idx][idx2],
                    "%0.1f" % self.salinity[idx][idx2],
                    "%0.1f" % self.temperature[idx][idx2]
                ])

        return super(TemperatureSalinityPlotter, self).csv(
            header, columns, data)

    def plot(self):
        # Create base figure
        fig = plt.figure(figsize=self.figuresize(), dpi=self.dpi)

        # Setup figure layout
        width = 2 if self.showmap else 1
        # Scale TS Diagram to be double the size of location map
        width_ratios = [1, 3] if self.showmap else None

        # Create layout helper
        gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)

        # Render point location
        if self.showmap:
            plt.subplot(gs[0, 0])
            utils.point_plot(np.array([ [x[0] for x in self.points], # Latitudes
                                        [x[1] for x in self.points]])) # Longitudes

        
        # Plot TS Diagram
        plt.subplot(gs[:, 1 if self.showmap else 0])

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

        dens -= 1000

        CS = plt.contour(si, ti, dens, linestyles='dashed', colors='k')
        plt.clabel(CS, fontsize=15, inline=1, fmt=r"$\sigma_t = %1.1f$")

        for idx, _ in enumerate(self.temperature):
            plt.plot(self.salinity[idx], self.temperature[idx], '-')

        plt.xlabel(gettext("Salinity (PSU)"), fontsize=14)
        plt.ylabel(gettext("Temperature (Celsius)"), fontsize=14)
        
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


        self.plot_legend(fig, self.names)

        if self.plotTitle is None or self.plotTitle == "":  
            plt.title(gettext("T/S Diagram for (%s)\n%s") % (
                ", ".join(self.names),
                self.date_formatter(self.timestamp)),
                fontsize=15
                )
        else :
            plt.title(self.plotTitle,fontsize=15)

        return super(TemperatureSalinityPlotter, self).plot(fig)

    def load_data(self):
        with open_dataset(self.dataset_config) as dataset:
            if self.time < 0:
                self.time += len(dataset.timestamps)
            time = np.clip(self.time, 0, len(dataset.timestamps) - 1)

            self.timestamp = dataset.timestamps[time]

            self.load_temp_sal(dataset, time)
