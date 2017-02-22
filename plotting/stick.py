from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
import numpy as np
import utils
from oceannavigator.util import get_dataset_url
import point
from flask.ext.babel import gettext
from data import load_timeseries
from matplotlib.dates import date2num


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
            "Depth (%s)" % self.depth_unit,
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
                    depth = "%d" % self.depths[int(self.depth[d])]

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
                        depth = "%d%s" % (
                            self.depths[int(self.depth[idx2])],
                            self.depth_unit
                        )

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

        with Dataset(get_dataset_url(self.dataset_name), 'r') as dataset:
            time_var = utils.get_time_var(dataset)
            start = self.clip_value(self.starttime, time_var)
            end = self.clip_value(self.endtime, time_var)

            t = netcdftime.utime(time_var.units)
            timestamp = t.num2date(time_var[start:end + 1])

            self.load_misc(dataset, self.variables)

            point_data = []
            for p in self.points:
                data = []
                for v in self.variables:
                    dd = []
                    for d in self.depth:
                        da, t = load_timeseries(
                            dataset,
                            v,
                            range(start, end + 1),
                            d,
                            float(p[0]),
                            float(p[1])
                        )
                        dd.append(da)
                    data.append(np.ma.array(dd))
                point_data.append(np.ma.array(data))

            point_data = np.ma.array(point_data)

            self.variable_units, point_data = self.kelvin_to_celsius(
                self.variable_units,
                point_data
            )

        self.data = self.subtract_climatology(point_data, timestamp)
        self.timestamp = timestamp
