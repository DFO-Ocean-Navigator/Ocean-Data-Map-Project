import matplotlib.pyplot as plt
import numpy as np
import utils
from oceannavigator.util import get_dataset_url
import point
from flask_babel import gettext
from matplotlib.dates import date2num
from data import open_dataset


class StickPlotter(point.PointPlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "profile"
        super(StickPlotter, self).__init__(dataset_name, query, format)
        self.size = '11x5'

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)"
            "Time",
        ] + map(lambda x: "%s (%s)" % x,
                zip(self.variable_names, self.variable_units))
        data = []

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
                    ] + map(lambda x: "%0.4f" % x, self.data[p, :, d, t])

                    data.append(entry)

        d = np.array(data)
        d[np.where(d == 'nan')] = ''
        data = d.tolist()

        return super(StickPlotter, self).csv(header, columns, data)

    def plot(self):
        figuresize = map(float, self.size.split("x"))
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

                    a.set_title(gettext("%s at %s (%s)") % (
                        self.vector_name(self.variable_names[0]),
                        self.names[idx],
                        depth
                    ))

        plt.setp(plt.gca().get_xticklabels(), rotation=30)
        fig.tight_layout()

        return super(StickPlotter, self).plot(fig)

    def load_data(self):
        if not isinstance(self.depth, list):
            self.depth = [self.depth]

        self.depth = sorted(self.depth)

        with open_dataset(get_dataset_url(self.dataset_name)) as dataset:
            if self.starttime < 0:
                self.starttime += len(dataset.timestamps)
            if self.endtime < 0:
                self.endtime += len(dataset.timestamps)
            start = np.clip(self.starttime, 0, len(dataset.timestamps) - 1)
            end = np.clip(self.endtime, 0, len(dataset.timestamps) - 1)

            timestamp = dataset.timestamps[start:end + 1]

            self.load_misc(dataset, self.variables)

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
                            start,
                            end,
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
                    point_data[idx] = np.multiply(point_data[idx], factor)

            self.variable_units, point_data = self.kelvin_to_celsius(
                self.variable_units,
                point_data
            )

        self.data = self.subtract_other(point_data)
        self.data_depth = point_depth
        self.timestamp = timestamp
