from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
import utils
from textwrap import wrap
from oceannavigator.util import get_dataset_url
import point


class ProfilePlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "profile"
        super(ProfilePlotter, self).__init__(dataset_name, query, format)

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.1f" % x)
        data = np.reshape(
            np.rollaxis(self.data, 1, 3),
            (-1, len(self.variables))
        )
        data = float_to_str(data)

        station = np.repeat(self.names, len(self.depths))
        points = np.array(self.points)
        latitude = np.repeat(points[:, 0], len(self.depths))
        longitude = np.repeat(points[:, 1], len(self.depths))
        time = np.repeat(self.timestamp, data.shape[0])
        depth = np.tile(self.depths, len(self.points))

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
                    "%0.1f" % self.depths[d],
                ] + map(lambda x: "%0.1f" % x, self.data[p, :, d])
                data.append(entry)

        return super(ProfilePlotter, self).csv(header, columns, data)

    def plot(self):
        fig, ax = self.setup_subplots(len(self.variables))

        for idx in range(0, len(self.variables)):
            ax[idx].plot(self.data[:, idx, :].transpose(), self.depths)
            ax[idx].xaxis.set_label_position('top')
            ax[idx].xaxis.set_ticks_position('top')
            ax[idx].set_xlabel("%s (%s)" %
                               (self.variable_names[idx],
                                utils.mathtext(self.variable_units[idx])))
            if self.variables[idx] != self.variables_anom[idx]:
                xlim = np.abs(ax[idx].get_xlim()).max()
                ax[idx].set_xlim([-xlim, xlim])

        ax[0].invert_yaxis()
        ax[0].set_ylabel("Depth (%s)" % utils.mathtext(self.depth_unit))

        self.plot_legend(fig, self.names)

        wrapped_title = wrap(
            "%s Profile for %s (%s)" % (
                ", ".join(self.variable_names),
                ", ".join(self.names),
                self.timestamp.strftime(self.dformat)
            ), 80)
        plt.suptitle("\n".join(wrapped_title))
        fig.tight_layout()
        fig.subplots_adjust(
            top=(0.905 - len(wrapped_title) * 0.025)
        )

        return super(ProfilePlotter, self).plot(fig)

    def load_data(self):
        with Dataset(get_dataset_url(self.dataset_name), 'r') as dataset:
            time_var = utils.get_time_var(dataset)
            time = self.clip_value(self.time, time_var)

            t = netcdftime.utime(time_var.units)
            timestamp = t.num2date(time_var[time])

            self.load_misc(dataset, self.variables)
            point_data = self.get_data(dataset, self.variables, time)

            self.variable_units, point_data = self.kelvin_to_celsius(
                self.variable_units,
                point_data
            )

        self.data = self.subtract_climatology(point_data, timestamp)
        self.timestamp = timestamp
