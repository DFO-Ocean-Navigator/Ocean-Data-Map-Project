import matplotlib.pyplot as plt
import numpy as np
import utils
from textwrap import wrap
from oceannavigator.util import get_dataset_url
import point
import matplotlib.gridspec as gridspec
from flask_babel import gettext
from data import open_dataset

class ProfilePlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "profile"
        super(ProfilePlotter, self).__init__(dataset_name, query, format)

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.1f" % x)
        data = float_to_str(self.data)

        station = np.repeat(self.names, len(self.depths))
        points = np.array(self.points)
        latitude = np.repeat(points[:, 0], len(self.depths))
        longitude = np.repeat(points[:, 1], len(self.depths))
        time = np.repeat(self.timestamp, data.shape[0])
        depth = self.depths[:, 0, :]

        return super(ProfilePlotter, self).odv_ascii(
            self.dataset_name,
            self.variable_names,
            self.variable_units,
            station,
            latitude,
            longitude,
            depth,
            time,
            data
        )

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth",
        ] + map(lambda x: "%s (%s)" % x,
                zip(self.variable_names, self.variable_units))
        data = []

        # For each point
        for p in range(0, self.data.shape[0]):
            # For each depth
            for d in range(0, self.data.shape[2]):
                if self.data[p, :, d].mask.all():
                    continue
                entry = [
                    "%0.4f" % self.points[p][0],
                    "%0.4f" % self.points[p][1],
                    "%0.1f" % self.depths[p, 0, d],
                ] + map(lambda x: "%0.1f" % x, self.data[p, :, d])
                data.append(entry)

        return super(ProfilePlotter, self).csv(header, columns, data)

    def plot(self):
        # Create base figure
        fig = plt.figure(figsize = self.figuresize(), dpi = self.dpi)

        # Setup figure layout
        width = len(self.variables)
        if self.showmap:
            width += 1
            # Horizontally scale the actual plots by 2x the size of
            # the location map
            width_ratios = [1]
            [width_ratios.append(2) for w in range(0, width - 1)]
        else:
            width_ratios = None

        # Create layout helper
        gs = gridspec.GridSpec(1, width, width_ratios=width_ratios)
        subplot = 0

        # Render point location
        if self.showmap:
            plt.subplot(gs[0, subplot])
            subplot += 1
            utils.point_plot(np.array([ [x[0] for x in self.points], # Latitudes
                                        [x[1] for x in self.points]])) # Longitudes

        # Create a subplot for each variable selected
        # Each subplot has all points plotted
        for idx, v in enumerate(self.variables):
            plt.subplot(gs[:, subplot])
            subplot += 1

            plt.plot(
                self.data[:, idx, :].transpose(),
                self.depths[:, idx, :].transpose()
            )
            plt.gca().xaxis.set_label_position('top')
            plt.gca().xaxis.set_ticks_position('top')
            plt.gca().invert_yaxis()
            plt.gca().grid(True)
            plt.gca().set_xlabel("%s (%s)" %
                               (self.variable_names[idx],
                                utils.mathtext(self.variable_units[idx])), fontsize=14)
            
            if self.compare:
                xlim = np.abs(plt.gca().get_xlim()).max()
                plt.gca().set_xlim([-xlim, xlim])

        # Put y-axis label on left-most graph
        if self.showmap:
            plt.subplot(gs[:, 1])
        else:
            plt.subplot(gs[:, 0])
        plt.gca().set_ylabel(gettext("Depth (m)"), fontsize=14)

        self.plot_legend(fig, self.names)
        
        plt.suptitle("%s(%s)\n%s\n%s" % (gettext("Profile for "), \
                                        ", ".join(self.names), \
                                        ", ".join(self.variable_names), \
                                        self.date_formatter(self.timestamp)), \
                    fontsize=15)
        fig.tight_layout()
        fig.subplots_adjust(top=(0.8))

        return super(ProfilePlotter, self).plot(fig)

    def load_data(self):
        with open_dataset(get_dataset_url(self.dataset_name)) as d:
            if self.time < 0:
                self.time += len(d.timestamps)
            time = np.clip(self.time, 0, len(d.timestamps) - 1)
            timestamp = d.timestamps[time]

            self.load_misc(d, self.variables)
            point_data, point_depths = self.get_data(d, self.variables, time)
            point_data = self.apply_scale_factors(point_data)

            self.variable_units, point_data = self.kelvin_to_celsius(
                self.variable_units,
                point_data
            )

        self.data = self.subtract_other(point_data)
        self.depths = point_depths
        self.timestamp = timestamp
