import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
from flask_babel import gettext

import plotting.utils as utils
from data import open_dataset
from data.sqlite_database import SQLiteDatabase
from plotting.point import PointPlotter
from utils.errors import ClientError
from oceannavigator.dataset_config import DatasetConfig


class ProfilePlotter(PointPlotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "profile"
        super(ProfilePlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):

        with open_dataset(self.dataset_config, timestamp=self.time, variable=self.variables) as ds:

            try:
                self.load_misc(ds, self.variables)
            except IndexError as e:
                raise ClientError(gettext("The selected variable(s) were not found in the dataset. \
                Most likely, this variable is a derived product from existing dataset variables. \
                Please select another variable. ") + str(e))

            point_data, point_depths = self.get_data(
                ds, self.variables, self.time)
            point_data = self.apply_scale_factors(point_data)

            self.iso_timestamp = ds.timestamp_to_iso_8601(self.time)

        self.data = self.subtract_other(point_data)
        self.depths = point_depths

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.1f" % x)
        data = float_to_str(self.data)

        station = np.repeat(self.names, len(self.depths))
        points = np.array(self.points)
        latitude = np.repeat(points[:, 0], len(self.depths))
        longitude = np.repeat(points[:, 1], len(self.depths))
        time = np.repeat(self.iso_timestamp, data.shape[0])
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
            ["Timestamp", self.iso_timestamp.isoformat()]
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
        # Create base figure
        fig = plt.figure(figsize=self.figuresize, dpi=self.dpi)

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
            utils.point_plot(np.array([[x[0] for x in self.points],  # Latitudes
                                       [x[1] for x in self.points]]))  # Longitudes

        is_y_label_plotted = False
        
        

        # Create a subplot for each variable selected
        # Each subplot has all points plotted
        for idx, _ in enumerate(self.variables):
            plt.subplot(gs[:, subplot])
            

            plt.plot(
                self.data[:, idx, :].transpose(),
                self.depths[:, idx, :].transpose()
            )
            
            current_axis = plt.gca()
            current_axis.xaxis.set_label_position('top')
            current_axis.xaxis.set_ticks_position('top')
            current_axis.invert_yaxis()
            current_axis.grid(True)
            current_axis.set_xlabel("%s (%s)" %
                                    (self.variable_names[idx],
                                     utils.mathtext(self.variable_units[idx])), fontsize=14)

            # Put y-axis label on left-most graph (but after the point location)
            #if 'ylabel' in self.
            
            if 'ylabel' in self.query:
                current_axis.set_ylabel(self.query['ylabel'], fontsize=14)

            elif not is_y_label_plotted and (subplot == 0 or subplot == 1):
                current_axis.set_ylabel(gettext("Depth (m)"), fontsize=14)
                is_y_label_plotted = True

            if self.compare:
                xlim = np.abs(plt.gca().get_xlim()).max()
                plt.gca().set_xlim([-xlim, xlim])

               

            subplot += 1

        

        self.plot_legend(fig, self.names)
        
        if 'xscale' in self.query:
            min = float(self.query['xscale'][0])
            max = float(self.query['xscale'][1])
            plt.xlim(min, max)
        
        if 'yscale' in self.query:
            min = float(self.query['yscale'][0])
            max = float(self.query['yscale'][1])
            plt.ylim(min, max)

        if not self.plotTitle:
            plt.suptitle("%s(%s)\n%s\n%s" % (gettext("Profile for "),
                                             ", ".join(self.names),
                                             ", ".join(self.variable_names),
                                             self.date_formatter(self.iso_timestamp)),
                         fontsize=15)
        else:
            plt.suptitle(self.plotTitle, fontsize=15)

        fig.tight_layout()
        fig.subplots_adjust(top=(0.8))

        return super(ProfilePlotter, self).plot(fig)
