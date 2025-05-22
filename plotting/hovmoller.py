import re

import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np

# from flask_babel import gettext
from mpl_toolkits.axes_grid1 import make_axes_locatable

# Silence a FutureWarning
from pandas.plotting import register_matplotlib_converters

import plotting.colormap as colormap
import plotting.utils as utils
from data import open_dataset
from oceannavigator import DatasetConfig
from plotting.line import LinePlotter

register_matplotlib_converters()


class HovmollerPlotter(LinePlotter):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "hovmoller"
        super(HovmollerPlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):
        def find_depth(depth, clip_length, dataset):
            """
            Calculates and returns the depth, depth-value, and depth unit from a given
            dataset
            Args:
                * depth: Stored depth information (self.depth or self.compare['depth'])
                * clip_length: How many depth values to clip (usually
                  len(dataset.depths) - 1)
                * dataset: Opened dataset
            Returns:
                (depth, depth_value, depth_unit)
            """
            depth_value = 0
            depth_unit = "m"

            if depth:
                if depth == "bottom":
                    depth_value = "Bottom"
                    depth_unit = ""
                    return (depth, depth_value, depth_unit)
                else:
                    depth = np.clip(int(depth), 0, clip_length)
                    depth_value = np.round(dataset.depths[depth])
                    depth_unit = "m"
                    return (depth, depth_value, depth_unit)

            return (depth, depth_value, depth_unit)

        # Load left/Main Map
        with open_dataset(
            self.dataset_config,
            timestamp=self.starttime,
            endtime=self.endtime,
            variable=self.variables,
        ) as dataset:

            self.depth, self.depth_value, self.depth_unit = find_depth(
                self.depth, len(dataset.depths) - 1, dataset
            )

            self.path_points, self.distance, times, data = dataset.get_path(
                self.points,
                self.depth,
                self.variables[0],
                self.starttime,
                self.endtime,
                tile_time=False,
            )
            self.variable_name = self.get_variable_names(dataset, self.variables)[0]

            variable_units = self.get_variable_units(dataset, self.variables)

            self.variable_unit = variable_units[0]
            self.data = data.T
            self.iso_timestamps = times

            # Get colourmap
            if self.cmap is None:
                self.cmap = colormap.find_colormap(self.variable_name)

        # Load data sent from Right Map (if in compare mode)
        if self.compare:
            compare_config = DatasetConfig(self.compare["dataset"])
            with open_dataset(
                compare_config,
                timestamp=self.compare["starttime"],
                endtime=self.compare["endtime"],
                variable=self.compare["variables"],
            ) as dataset:
                (
                    self.compare["depth"],
                    self.compare["depth_value"],
                    self.compare["depth_unit"],
                ) = find_depth(self.compare["depth"], len(dataset.depths) - 1, dataset)

                path, distance, times, data = dataset.get_path(
                    self.points,
                    self.compare["depth"],
                    self.compare["variables"][0],
                    self.compare["starttime"],
                    self.compare["endtime"],
                    tile_time=False,
                )
                self.compare["variable_name"] = self.get_variable_names(
                    dataset, self.compare["variables"]
                )[0]

                # Colourmap
                if self.compare["colormap"] == "default":
                    self.compare["colormap"] = colormap.find_colormap(
                        self.compare["variable_name"]
                    )
                else:
                    self.compare["colormap"] = colormap.find_colormap(
                        self.compare["colormap"]
                    )

                variable_units = self.get_variable_units(
                    dataset, self.compare["variables"]
                )

                self.compare["variable_unit"] = variable_units[0]
                self.compare["data"] = data.T
                self.compare["times"] = times

    # Render Hovmoller graph(s)
    def plot(self):
        def get_depth_label(depthValue, depthUnit):
            if depthValue == "bottom":
                return " at Bottom"
            return " at %s %s" % (depthValue, depthUnit)

        # Figure size
        figuresize = list(map(float, self.size.split("x")))
        # Vertical scaling of figure
        figuresize[1] *= 1.5 if self.compare else 1

        fig = plt.figure(figsize=figuresize, dpi=self.dpi)

        if self.showmap:
            width = 2  # 2 columns
            width_ratios = [2, 7]
        else:
            width = 1  # 1 column
            width_ratios = [1]

        # Setup grid (rows, columns, column/row ratios) depending on view mode
        if self.compare:
            # Don't show a difference plot if variables are different
            if self.compare["variables"][0] == self.variables[0]:
                gs = gridspec.GridSpec(
                    3,
                    width,
                    width_ratios=width_ratios,
                    height_ratios=[1, 1, 1],
                    hspace=0.35,
                )
            else:
                gs = gridspec.GridSpec(
                    2,
                    width,
                    width_ratios=width_ratios,
                    height_ratios=[1, 1],
                    hspace=0.35,
                )
        else:
            gs = gridspec.GridSpec(1, width, width_ratios=width_ratios, hspace=0.35)

        if self.showmap:
            # Plot the path on a map
            utils.path_plot(self.path_points, gs[:, 0])

        # Calculate variable range
        if self.scale:
            vmin = self.scale[0]
            vmax = self.scale[1]
        else:
            vmin, vmax = utils.normalize_scale(
                self.data, self.dataset_config.variable[self.variables[0]]
            )

            if len(self.variables) > 1:
                vmin = 0

        # Render
        self._hovmoller_plot(
            gs,
            [0, 1],
            [0, 0],
            self.variable_name,  # gettext(self.variable_name),
            vmin,
            vmax,
            self.data,
            self.iso_timestamps,
            self.cmap,
            self.variable_unit,
            self.variable_name  # gettext(self.variable_name)
            + get_depth_label(
                self.depth_value, self.depth_unit
            ),  # gettext(get_depth_label(self.depth_value, self.depth_unit)),
        )

        # If in compare mode
        if self.compare:
            # Calculate variable range
            if self.compare["scale"]:
                vmin = self.compare["scale"][0]
                vmax = self.compare["scale"][1]
            else:
                vmin = np.amin(self.compare["data"])
                vmax = np.amax(self.compare["data"])
            if np.any(
                [
                    re.search(x, self.compare["variable_name"], re.IGNORECASE)
                    for x in ["velocity", "surface height", "wind"]
                ]
            ):
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)

            if len(self.compare["variables"]) > 1:
                vmin = 0

            self._hovmoller_plot(
                gs,
                [1, 1],
                [1, 0],
                self.compare[
                    "variable_name"
                ],  # gettext(self.compare["variable_name"]),
                vmin,
                vmax,
                self.compare["data"],
                self.compare["times"],
                self.compare["colormap"],
                self.compare["variable_unit"],
                self.compare["variable_name"]  # gettext(self.compare["variable_name"])
                + get_depth_label(self.compare["depth"], self.compare["depth_unit"]),
                #  gettext(
                #     get_depth_label(self.compare["depth"], self.compare["depth_unit"])
                # ),
            )

            # Difference plot
            if self.compare["variables"][0] == self.variables[0]:

                data_difference = self.data - self.compare["data"]
                vmin = np.amin(data_difference)
                vmax = np.amax(data_difference)

                self._hovmoller_plot(
                    gs,
                    [2, 1],
                    [2, 0],
                    self.compare[
                        "variable_name"
                    ],  # gettext(self.compare["variable_name"]),
                    vmin,
                    vmax,
                    data_difference,
                    self.compare["times"],
                    colormap.find_colormap("anomaly"),
                    self.compare["variable_unit"],
                    self.compare[
                        "variable_name"
                    ]  # gettext(self.compare["variable_name"])
                    + " Difference"  # + gettext(" Difference")
                    + get_depth_label(
                        self.compare["depth"], self.compare["depth_unit"]
                    ),
                    # + gettext(
                    #     get_depth_label(
                    #         self.compare["depth"], self.compare["depth_unit"]
                    #     )
                    # ),
                )

        # Image title
        if self.plotTitle:
            fig.suptitle(
                "Hovm\xf6ller Diagram(s) for:\n%s" % (self.name),
                fontsize=15,  # gettext("Hovm\xf6ller Diagram(s) for:\n%s") % (self.name), fontsize=15
            )
        else:
            fig.suptitle(self.plotTitle, fontsize=15)
        # Subplot padding
        fig.tight_layout(pad=0, w_pad=4, h_pad=2)
        fig.subplots_adjust(top=0.9 if self.compare else 0.85)

        return super(HovmollerPlotter, self).plot(fig)

    """
    Args:
        subplot: a GridSpec object (gs)
        map_subplot: Row number (Note: don't use consecutive rows to allow
                     for expanding figure height)
        nomap_subplot: Row index of subplot location when "Show Location" is
                       toggled off (consecutive works here)
        name: Nice name for variable of subplot
        vmin: minimum value for a variable (grabbed from the lowest value of some data)
        vmax: maxmimum value for a variable (grabbed from the highest value of some
              data)
        data: Data to be plotted
        times: Date range
        cmap: colormap for variable
        unit: variable unit
        title: Plot title
    """

    def _hovmoller_plot(
        self,
        subplot,
        map_subplot,
        nomap_subplot,
        name,
        vmin,
        vmax,
        data,
        times,
        cmap,
        unit,
        title,
    ):
        if self.showmap:
            plt.subplot(subplot[map_subplot[0], map_subplot[1]])
        else:
            plt.subplot(subplot[nomap_subplot[0], nomap_subplot[1]])

        c = plt.pcolormesh(
            self.distance,
            times,
            data,
            cmap=cmap,
            shading="gouraud",  # Smooth shading
            vmin=vmin,
            vmax=vmax,
        )

        ax = plt.gca()
        ax.set_title(title, fontsize=14)  # Set title of subplot
        ax.yaxis_date()
        ax.yaxis.grid(True)
        ax.set_facecolor("dimgray")

        math_unit = utils.mathtext(unit)
        y_offset = -0.1
        if self.compare:
            y_offset = -0.22

        ax.text(
            0,
            y_offset,
            self.get_stats_str(data, math_unit),
            fontsize=14,
            transform=ax.transAxes,
        )

        plt.xlabel("Distance (km)")  # plt.xlabel(gettext("Distance (km)"))
        plt.xlim([self.distance[0], self.distance[-1]])

        divider = make_axes_locatable(plt.gca())
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)
        bar.set_label(f"{name} ({math_unit})")
