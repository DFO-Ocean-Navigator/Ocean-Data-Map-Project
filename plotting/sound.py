import matplotlib.pyplot as plt
import matplotlib.ticker as tkr
import numpy as np
import seawater
import pint
import ts
from flask.ext.babel import gettext


class SoundSpeedPlotter(ts.TemperatureSalinityPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "sound"
        super(
            ts.TemperatureSalinityPlotter, self).__init__(dataset_name, query,
                                                          format)

    def plot(self):
        fig = plt.figure(figsize=self.figuresize(), dpi=self.dpi)

        ax = plt.gca()
        for i, ss in enumerate(self.sspeed):
            ax.plot(ss, self.temperature_depths[i], '-')

        minspeed = np.amin(self.sspeed)
        maxspeed = np.amax(self.sspeed)

        ax.set_xlim([
            np.amin(self.sspeed) - (maxspeed - minspeed) * 0.1,
            np.amax(self.sspeed) + (maxspeed - minspeed) * 0.1,
        ])
        ax.set_xlabel(gettext("Sound Speed (m/s)"))
        ax.set_ylabel(gettext("Depth (m)"))
        ax.invert_yaxis()
        ax.xaxis.set_ticks_position('top')
        ax.xaxis.set_label_position('top')
        x_format = tkr.FuncFormatter(lambda x, pos: "%d" % x)
        ax.xaxis.set_major_formatter(x_format)
        ax.set_title(gettext("Sound Speed Profile for %s (%s)") % (
            ", ".join(self.names), self.date_formatter(self.timestamp)
        ))
        ax.title.set_position([.5, 1.10])
        plt.subplots_adjust(top=0.85)
        ax.xaxis.grid(True)

        self.plot_legend(fig, self.names)

        ylim = ax.get_ylim()
        ax2 = ax.twinx()
        ureg = pint.UnitRegistry()
        ax2.set_ylim((ylim * ureg.meters).to(ureg.feet).magnitude)
        ax2.set_ylabel(gettext("Depth (ft)"))

        return super(ts.TemperatureSalinityPlotter, self).plot(fig)

    def csv(self):
        header = [
            ["Dataset", self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "Pressure",
            "Salinity",
            "Temperature",
            "Sound Speed"
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
                    "%0.1f" % self.pressure[idx][idx2],
                    "%0.1f" % self.salinity[idx][idx2],
                    "%0.1f" % self.temperature[idx][idx2],
                    "%0.1f" % self.sspeed[idx][idx2]
                ])

        return super(ts.TemperatureSalinityPlotter, self).csv(
            header, columns, data
        )

    def load_data(self):
        super(SoundSpeedPlotter, self).load_data()

        self.pressure = [seawater.pres(self.temperature_depths[idx], ll[0])
                         for idx, ll in enumerate(self.points)]

        self.sspeed = seawater.svel(
            self.salinity, self.temperature, self.pressure
        )
