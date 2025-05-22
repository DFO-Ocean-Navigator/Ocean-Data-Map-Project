import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import matplotlib.ticker as tkr
import numpy as np
import pint
import gsw

import plotting.utils as utils
from plotting.ts import TemperatureSalinityPlotter


class SoundSpeedPlotter(TemperatureSalinityPlotter):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "sound"

        super(SoundSpeedPlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):
        super(SoundSpeedPlotter, self).load_data()

        self.pressure = [
            gsw.conversions.p_from_z(-self.temperature_depths[idx], ll[0])
            for idx, ll in enumerate(self.points)
        ]

        ureg = pint.UnitRegistry()
        try:
            u = ureg.parse_units(self.variable_units[0].lower())
        except:
            u = ureg.dimensionless

        if u == ureg.boltzmann_constant:
            u = ureg.kelvin

        if u == ureg.kelvin:
            temperature_c = (
                ureg.Quantity(self.temperature, u).to(ureg.celsius).magnitude
            )
        else:
            temperature_c = self.temperature

        self.sspeed = gsw.sound_speed(self.salinity, temperature_c, self.pressure)

    def plot(self):
        # Create base figure
        fig = plt.figure(figsize=self.figuresize, dpi=self.dpi)

        # Setup figure layout
        width = 2 if self.showmap else 1
        # Scale TS Diagram to be double the size of location map
        width_ratios = [1, 3] if self.showmap else None

        # Create layout helper
        gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)

        # Render point location
        if self.showmap:
            utils.point_plot(
                np.array(
                    [
                        [x[0] for x in self.points],  # Latitudes
                        [x[1] for x in self.points],
                    ]
                ),
                gs[0, 0],
            )  # Longitudes

        # Plot Sound Speed profile
        plt.subplot(gs[:, 1 if self.showmap else 0])
        ax = plt.gca()
        for i, ss in enumerate(self.sspeed):
            ax.plot(ss, self.temperature_depths[i], "-")

        minspeed = np.amin(self.sspeed)
        maxspeed = np.amax(self.sspeed)

        ax.set_xlim(
            [
                np.amin(self.sspeed) - (maxspeed - minspeed) * 0.1,
                np.amax(self.sspeed) + (maxspeed - minspeed) * 0.1,
            ]
        )
        ax.set_xlabel(
            "Sound Speed (m/s)", fontsize=14
        )  # ax.set_xlabel(gettext("Sound Speed (m/s)"), fontsize=14)
        ax.set_ylabel(
            "Depth (m)", fontsize=14
        )  # ax.set_ylabel(gettext("Depth (m)"), fontsize=14)
        ax.invert_yaxis()
        ax.xaxis.set_ticks_position("top")
        ax.xaxis.set_label_position("top")
        x_format = tkr.FuncFormatter(lambda x, pos: "%d" % x)
        ax.xaxis.set_major_formatter(x_format)

        if not self.plotTitle:
            ax.set_title(
                "Sound Speed Profile for (%s)\n%s"  # gettext("Sound Speed Profile for (%s)\n%s")
                % (", ".join(self.names), self.date_formatter(self.iso_timestamp)),
                fontsize=15,
            )
        else:
            ax.set_title(self.plotTitle, fontsize=15)

        ax.title.set_position([0.5, 1.10])
        plt.subplots_adjust(top=0.85)
        ax.xaxis.grid(True)

        self.plot_legend(fig, self.names)

        ylim = ax.get_ylim()
        ax.set_xlim([1410, 1560])
        ax2 = ax.twinx()
        ureg = pint.UnitRegistry()
        ax2.set_ylim((ylim * ureg.meters).to(ureg.feet).magnitude)
        ax2.set_ylabel(
            "Depth (ft)", fontsize=14
        )  # ax2.set_ylabel(gettext("Depth (ft)"), fontsize=14)

        ax.text(
            0,
            -0.05,
            self.get_stats_str(self.sspeed, "m/s"),
            fontsize=14,
            transform=ax.transAxes,
        )

        # This is a little strange where we want to skip calling the TSP.plot and go
        # straight to Point.plot
        return super(TemperatureSalinityPlotter, self).plot(fig)

    def csv(self):
        header = [["Dataset", self.dataset_name], ["Timestamp", self.iso_timestamp]]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "Pressure",
            "Salinity",
            "Temperature",
            "Sound Speed",
        ]

        data = []

        # For each point
        for idx, p in enumerate(self.points):
            for idx2, val in enumerate(self.temperature[idx]):
                if np.ma.is_masked(val):
                    break
                data.append(
                    [
                        "%0.4f" % p[0],
                        "%0.4f" % p[1],
                        "%0.1f" % self.temperature_depths[idx][idx2],
                        "%0.1f" % self.pressure[idx][idx2],
                        "%0.1f" % self.salinity[idx][idx2],
                        "%0.1f" % self.temperature[idx][idx2],
                        "%0.1f" % self.sspeed[idx][idx2],
                    ]
                )

        return super(TemperatureSalinityPlotter, self).csv(header, columns, data)

    def stats_csv(self):
        header = [["Dataset", self.dataset_name], ["Timestamp", self.iso_timestamp]]

        columns = ["Statistic", "Pressure", "Salinity", "Temperature", "Sound Speed"]

        data = [["Min", "Max", "Mean", "Standard Deviation"]]

        variables = [self.pressure, self.salinity, self.temperature, self.sspeed]

        for var in variables:
            data.append(
                [
                    np.nanmin(var),
                    np.nanmax(var),
                    np.nanmean(var),
                    np.nanstd(var),
                ]
            )

        data = np.array(data).T.tolist()

        return super(TemperatureSalinityPlotter, self).csv(header, columns, data)
