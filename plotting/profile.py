import matplotlib.pyplot as plt
import numpy as np
import plotting.utils
import plotting.point as plPoint
from textwrap import wrap
from oceannavigator.util import get_dataset_url
from flask_babel import gettext
from data import open_dataset


class ProfilePlotter(plPoint.PointPlotter):

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
        ] + ["%s (%s)" % x for x in zip(self.variable_names, self.variable_units)]
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
                ] + ["%0.1f" % x for x in self.data[p, :, d]]
                data.append(entry)

        return super(ProfilePlotter, self).csv(header, columns, data)

    def plot(self):
        fig, ax = self.setup_subplots(len(self.variables))

        for idx in range(0, len(self.variables)):
            ax[idx].plot(
                self.data[:, idx, :].transpose(),
                self.depths[:, idx, :].transpose()
            )
            ax[idx].xaxis.set_label_position('top')
            ax[idx].xaxis.set_ticks_position('top')
            ax[idx].set_xlabel("%s (%s)" %
                               (self.variable_names[idx],
                                utils.mathtext(self.variable_units[idx])), fontsize=14)
            if self.compare:
                xlim = np.abs(ax[idx].get_xlim()).max()
                ax[idx].set_xlim([-xlim, xlim])

        ax[0].invert_yaxis()
        ax[0].set_ylabel(gettext("Depth (m)"), fontsize=14)

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
