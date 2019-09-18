import matplotlib.pyplot as plt
import numpy as np
from flask_babel import gettext
from matplotlib.dates import date2num

from plotting.point import PointPlotter
import plotting.utils as utils
from data import open_dataset


class StickPlotter(PointPlotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "profile"

        super(StickPlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):
        if not isinstance(self.depth, list):
            self.depth = [self.depth]

        self.depth = sorted(self.depth)

        with open_dataset(self.dataset_config, timestamp=self.starttime, endtime=self.endtime, variable=self.variables) as dataset:

            self.load_misc(dataset, self.variables)
            self.variable_name = self.get_vector_variable_name(dataset,
                                                               self.variables)

            point_data = []
            point_depth = []
            for p in self.points:
                data = []
                depth = []
                for v in self.variables:
                    dd = []
                    jj = []
                    for d in self.depth:
                        da, dp = dataset.get_timeseries_point(
                            float(p[0]),
                            float(p[1]),
                            d,
                            self.starttime,
                            self.endtime,
                            v,
                            return_depth=True
                        )
                        dd.append(da)
                        jj.append(dp)
                    data.append(np.ma.array(dd))
                    depth.append(np.ma.array(jj))
                point_data.append(np.ma.array(data))
                point_depth.append(np.ma.array(depth))

            point_data = np.ma.array(point_data)
            point_depth = np.ma.array(point_depth)

            for idx, factor in enumerate(self.scale_factors):
                if factor != 1.0:
                    point_data[:, idx] = np.multiply(
                        point_data[:, idx], factor)

        self.data = self.subtract_other(point_data)
        self.data_depth = point_depth
        self.timestamp = timestamp

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "Time",
        ]
        columns.extend([
            "%s (%s)" % (self.variable_name, self.variable_units[0]),
            "%s (%s)" % (self.variable_names[0], self.variable_units[0]),
            "%s (%s)" % (self.variable_names[1], self.variable_units[1]),
            "Bearing (degrees clockwise positive from North)"
        ])
        data = []

        magnitude = np.sqrt(self.data[:, 0, :, :] ** 2 +
                            self.data[:, 1, :, :] ** 2)
        bearing = np.arctan2(self.data[:, 1, :, :], self.data[:, 0, :, :])
        bearing = np.pi / 2.0 - bearing
        bearing[bearing < 0] += 2 * np.pi
        bearing *= 180.0 / np.pi
        # Deal with undefined angles (where velocity is 0 or very very close)
        # np.arctan2 doesn't return nan if x,y are both zero...
        inds = np.where(
            np.logical_and(
                np.abs(self.data[:, 0, :, :]) < 10e-6,
                np.abs(self.data[:, 1, :, :]) < 10e-6
            )
        )
        bearing[inds] = np.nan

        # For each point
        for p in range(0, self.data.shape[0]):
            # For each depth
            for d in range(0, self.data.shape[2]):
                if self.depth[d] == 'bottom':
                    depth = 'Bottom'
                else:
                    depth = "%d" % np.round(self.data_depth[p, 0, d, 0])

                # For each time
                for t in range(0, self.data.shape[3]):
                    entry = [
                        "%0.4f" % self.points[p][0],
                        "%0.4f" % self.points[p][1],
                        "%s" % depth,
                        self.timestamp[t].isoformat(),
                    ]
                    entry.extend([
                        "%0.4f" % magnitude[p, d, t],
                        "%0.4f" % self.data[p, 0, d, t],
                        "%0.4f" % self.data[p, 1, d, t],
                        "%0.4f" % bearing[p, d, t]
                    ])

                    data.append(entry)

        d = np.array(data)
        d[np.where(d == 'nan')] = ''
        data = d.tolist()

        return super(StickPlotter, self).csv(header, columns, data)

    def plot(self):
        figuresize = list(map(float, self.size.split("x")))
        figuresize[1] *= len(self.points) * len(self.depth)
        fig, ax = plt.subplots(
            len(self.points) * len(self.depth),
            1,
            sharex=True,
            figsize=figuresize,
            dpi=self.dpi
        )
        if len(self.points) * len(self.depth) == 1:
            ax = [ax]

        if self.data.shape[1] == 2:
            for idx, p in enumerate(self.points):
                magnitude = np.sqrt(self.data[idx, 0, :, :] ** 2 +
                                    self.data[idx, 1, :, :] ** 2)
                scale = np.mean(magnitude)
                if scale != 0:
                    scale = np.round(
                        scale,
                        int(-np.floor(np.log10(scale)))
                    )

                for idx2, d in enumerate(self.depth):
                    datenums = date2num(self.timestamp)
                    a = ax[idx * len(self.points) + idx2]
                    q = a.quiver(
                        datenums,
                        [0] * len(self.timestamp),
                        self.data[idx, 0, idx2, :],
                        self.data[idx, 1, idx2, :],
                        angles='uv',
                        width=0.002,
                        headwidth=0,
                        headlength=0,
                        headaxislength=0,
                    )

                    a.axes.get_yaxis().set_visible(False)
                    a.axes.get_xaxis().tick_bottom()
                    a.xaxis_date()
                    a.quiverkey(
                        q, 0.1, 0.75, scale, "%.1g %s" % (
                            scale,
                            utils.mathtext(self.variable_units[0])
                        )
                    )
                    dx = datenums[1] - datenums[0]
                    a.set_xlim(
                        [datenums[0] - dx / 2.0, datenums[-1] + dx / 2.0])
                    a.set_frame_on(False)
                    a.axhline(0, color='grey', ls=':')
                    if self.depth[idx2] == "bottom":
                        depth = "Bottom"
                    else:
                        depth = "%d m" % np.round(self.data_depth[
                            idx, 0, idx2, 0
                        ])
                    if self.plotTitle is None or self.plotTitle == "":
                        a.set_title(gettext("%s at (%s)\n%s") % (
                            self.variable_name,
                            self.names[idx],
                            depth
                        ), fontsize=15)
                    else:
                        a.set_title(self.plotTitle, fontsize=15)

        plt.setp(plt.gca().get_xticklabels(), rotation=30)
        fig.tight_layout()

        return super(StickPlotter, self).plot(fig)
