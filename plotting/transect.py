import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
import numpy as np
from geopy.distance import GeodesicDistance
from matplotlib.ticker import ScalarFormatter, StrMethodFormatter
from mpl_toolkits.axes_grid1 import make_axes_locatable
from netCDF4 import Dataset
from scipy.interpolate import interp1d

import plotting.colormap as colormap
import plotting.utils as utils
from data import geo, open_dataset
from oceannavigator import DatasetConfig
from oceannavigator.settings import get_settings
from plotting.grid import bathymetry
from plotting.line import LinePlotter

settings = get_settings()


class TransectPlotter(LinePlotter):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "transect"
        super(TransectPlotter, self).__init__(dataset_name, query, **kwargs)

        # Holds Velocity Plot Type [magnitude, parallel, perpendicular]
        self.selected_velocity_plots = None

        profile_distance = query.get("profile_distance")
        self.profile_distance = profile_distance

    def parse_query(self, query):
        super(TransectPlotter, self).parse_query(query)

        depth_limit = query.get("depth_limit", None)
        if "selectedPlots" in query:
            self.selected_velocity_plots = list(
                map(int, query.get("selectedPlots").split(","))
            )
        else:
            self.selected_velocity_plots = list(map(int, "0, 1, 1".split(",")))

        if not depth_limit:
            self.depth_limit = None
        else:
            self.depth_limit = int(depth_limit)

    def __fill_invalid_shift(self, z):
        for s in range(1, z.shape[0]):
            if z.mask.any():
                z_shifted = np.roll(z, shift=s, axis=0)
                idx = ~z_shifted.mask * z.mask
                z[idx] = z_shifted[idx]
            else:
                break

    def load_data(self):
        vars_to_load = self.variables
        if self.surface:
            vars_to_load.append(self.surface)

        with open_dataset(
            self.dataset_config, timestamp=self.time, variable=vars_to_load
        ) as dataset:

            for idx, v in enumerate(self.variables):
                var = dataset.variables[v]
                if not (set(var.dimensions) & set(dataset.nc_data.depth_dimensions)):
                    for potential in dataset.variables:
                        if potential in self.variables:
                            continue
                        pot = dataset.variables[potential]
                        if set(pot.dimensions) & set(dataset.nc_data.depth_dimensions):
                            if len(pot.dimensions) > 3:
                                self.variables[idx] = potential.key

            value = parallel = perpendicular = magnitude = None

            variable_names = self.get_variable_names(dataset, self.variables)
            variable_units = self.get_variable_units(dataset, self.variables)

            # Load data sent from primary/Left Map
            if len(self.variables) > 1:
                # Only velocity has 2 variables
                v = []
                for name in self.variables:
                    v.append(dataset.variables[name])

                distances, times, lat, lon, bearings = geo.path_to_points(
                    self.points, 100
                )
                # Calculate vector components
                transect_pts, distance, x, dep = dataset.get_path_profile(
                    self.points, self.variables[0], self.time, numpoints=100
                )
                transect_pts, distance, y, dep = dataset.get_path_profile(
                    self.points, self.variables[1], self.time, numpoints=100
                )

                r = np.radians(np.subtract(90, bearings))
                theta = np.arctan2(y, x) - r
                magnitude = np.sqrt(x**2 + y**2)

                parallel = magnitude * np.cos(theta)
                perpendicular = magnitude * np.sin(theta)

            else:
                # Get data for one variable
                transect_pts, distance, value, dep = dataset.get_path_profile(
                    self.points, self.variables[0], self.time
                )

            if len(self.variables) == 2:
                variable_names = [
                    self.get_vector_variable_name(dataset, self.variables)
                ]
                variable_units = [
                    self.get_vector_variable_unit(dataset, self.variables)
                ]

            # If a colourmap has not been manually specified by the
            # Navigator...
            if self.cmap is None:
                self.cmap = colormap.find_colormap(variable_names[0])

            self.iso_timestamp = dataset.nc_data.timestamp_to_iso_8601(self.time)

            self.depth = dep
            self.depth_unit = "m"

            self.transect_data = {
                "points": transect_pts,
                "distance": distance,
                "data": value,
                "name": variable_names[0],
                "units": variable_units[0],
                "parallel": parallel,
                "perpendicular": perpendicular,
                "magnitude": magnitude,
            }

            if self.surface:
                surface_pts, surface_dist, _, surface_value = dataset.get_path(
                    self.points, 0, self.surface, self.time
                )
                vc = self.dataset_config.variable[dataset.variables[self.surface]]
                surface_unit = vc.unit
                surface_name = vc.name

                self.surface_data = {
                    "config": vc,
                    "points": surface_pts,
                    "distance": surface_dist,
                    "data": surface_value,
                    "name": surface_name,
                    "units": surface_unit,
                }

            if self.profile_distance >= 0:
                dist = 0
                for i in range(1, len(self.points)):
                    dist += GeodesicDistance(self.points[i - 1], self.points[i]).meters
                    if self.profile_distance < dist:
                        start = self.points[i - 1]
                        end = self.points[i]
                        break

                dLon = end[1] - start[1]
                x = np.cos(np.radians(end[0])) * np.sin(np.radians(dLon))
                y = np.cos(np.radians(start[0])) * np.sin(np.radians(end[0])) - np.sin(
                    np.radians(start[0])
                ) * np.cos(np.radians(end[0])) * np.cos(np.radians(dLon))
                brng = np.arctan2(x, y)
                brng = np.degrees(brng)

                destination = GeodesicDistance(
                    meters=self.profile_distance
                ).destination(point=start, bearing=brng)
                self.profile_data = dataset.get_profile(
                    destination.latitude,
                    destination.longitude,
                    self.variables[0],
                    self.time,
                )
                self.destination = destination

        # Load data sent from Right Map (if in compare mode)
        if self.compare:

            def interpolate_depths(data, depth_in, depth_out):
                output = []
                for i in range(0, depth_in.shape[0]):
                    f = interp1d(
                        depth_in[i],
                        data[:, i],
                        bounds_error=False,
                        assume_sorted=True,
                    )
                    output.append(f(depth_out[i].view(np.ma.MaskedArray).filled()))

                return np.ma.masked_invalid(output).transpose()

            self.compare_config = DatasetConfig(self.compare["dataset"])
            self.compare["time"] = int(self.compare["time"])
            with open_dataset(
                self.compare_config,
                timestamp=self.compare["time"],
                variable=self.compare["variables"],
            ) as dataset:
                self.compare["iso_timestamp"] = dataset.nc_data.timestamp_to_iso_8601(
                    self.compare["time"]
                )

                # 1 variable
                if len(self.compare["variables"]) == 1:

                    # Get and store the "nicely formatted" string for the variable name
                    self.compare["name"] = self.get_variable_names(
                        dataset, self.compare["variables"]
                    )[0]

                    # Find correct colourmap
                    if self.compare["colormap"] == "default":
                        self.compare["colormap"] = colormap.find_colormap(
                            self.compare["name"]
                        )
                    else:
                        self.compare["colormap"] = colormap.find_colormap(
                            self.compare["colormap"]
                        )

                    (
                        climate_points,
                        climate_distance,
                        climate_data,
                        cdep,
                    ) = dataset.get_path_profile(
                        self.points, self.compare["variables"][0], self.compare["time"]
                    )

                    self.compare["units"] = dataset.variables[
                        self.compare["variables"][0]
                    ].unit
                    self.__fill_invalid_shift(climate_data)

                    if (self.depth.shape != cdep.shape) or (self.depth != cdep).any():
                        # Need to interpolate the depths
                        climate_data = interpolate_depths(
                            climate_data, cdep, self.depth
                        )

                    if self.transect_data["data"] is None:
                        self.transect_data["magnitude"] -= climate_data
                        self.transect_data["parallel"] -= climate_data
                        self.transect_data["perpendicular"] -= climate_data
                    else:
                        self.transect_data["compare_data"] = climate_data

                # Velocity variables
                else:
                    # Get and store the "nicely formatted" string for the variable name
                    self.compare["name"] = self.get_vector_variable_name(
                        dataset, self.compare["variables"]
                    )

                    (
                        climate_pts,
                        climate_distance,
                        climate_x,
                        cdep,
                    ) = dataset.get_path_profile(
                        self.points,
                        self.compare["variables"][0],
                        self.compare["time"],
                        numpoints=100,
                    )
                    (
                        climate_pts,
                        climate_distance,
                        climate_y,
                        cdep,
                    ) = dataset.get_path_profile(
                        self.points,
                        self.compare["variables"][0],
                        self.compare["time"],
                        numpoints=100,
                    )

                    (
                        climate_distances,
                        ctimes,
                        clat,
                        clon,
                        bearings,
                    ) = geo.path_to_points(self.points, 100)

                    r = np.radians(np.subtract(90, bearings))
                    theta = np.arctan2(climate_y, climate_x) - r
                    mag = np.sqrt(climate_x**2 + climate_y**2)

                    if np.all(self.depth != cdep):
                        theta = interpolate_depths(theta, cdep, self.depth)
                        self.__fill_invalid_shift(theta)
                        mag = interpolate_depths(mag, cdep, self.depth)
                        self.__fill_invalid_shift(mag)

                    self.compare["parallel"] = mag * np.cos(theta)
                    self.compare["perpendicular"] = mag * np.sin(theta)

                    """
                    if self.transect_data['parallel'] is None:
                        self.transect_data['data'] -= mag
                    else:
                        self.transect_data['parallel'] -= climate_parallel
                        self.transect_data['perpendicular'] -= climate_perpendicular
                    """

        # Bathymetry
        with Dataset(settings.bathymetry_file, "r") as dataset:
            bath_x, bath_y = bathymetry(
                dataset.variables["y"],
                dataset.variables["x"],
                dataset.variables["z"],
                self.points,
            )

        self.bathymetry = {"x": bath_x, "y": bath_y}

    def csv(self):
        header = [["Dataset", self.dataset_name], ["Timestamp", self.iso_timestamp]]

        columns = [
            "Latitude",
            "Longitude",
            "Distance (km)",
            "Depth (m)",
        ]

        if self.surface is not None:
            columns.append(
                "%s (%s)" % (self.surface_data["name"], self.surface_data["units"])
            )

        if len(self.variables) > 1:
            columns.append(
                "Parallel %s (%s)"
                % (self.transect_data["name"], self.transect_data["units"])
            )
            columns.append(
                "Perpendicular %s (%s)"
                % (self.transect_data["name"], self.transect_data["units"])
            )
            values = ["parallel", "perpendicular"]
        else:
            columns.append(
                "%s (%s)" % (self.transect_data["name"], self.transect_data["units"])
            )
            values = ["data"]

        data = []
        for idx, dist in enumerate(self.transect_data["distance"]):
            if dist == self.transect_data["distance"][idx - 1]:
                continue

            for j in range(0, len(self.transect_data[values[0]][:, idx])):
                entry = [
                    "%0.4f" % self.transect_data["points"][0, idx],
                    "%0.4f" % self.transect_data["points"][1, idx],
                    "%0.1f" % dist,
                    "%0.1f" % self.depth[idx, j],
                ]
                if self.surface is not None:
                    if j == 0:
                        entry.append("%0.4f" % self.surface_data["data"][idx])
                    else:
                        entry.append("-")

                for t in values:
                    entry.append("%0.4f" % self.transect_data[t][j, idx])

                if entry[-1] == "nan":
                    continue

                data.append(entry)

        return super(TransectPlotter, self).csv(header, columns, data)

    def stats_csv(self):
        header = [["Dataset", self.dataset_name], ["Timestamp", self.iso_timestamp]]

        columns = [
            "Statistic",
        ] + ["%s (%s)" % (self.transect_data["name"], self.transect_data["units"])]

        data = [["Min", "Max", "Mean", "Standard Deviation"]]

        data.append(
            [
                np.nanmin(self.transect_data["data"]),
                np.nanmax(self.transect_data["data"]),
                np.nanmean(self.transect_data["data"]),
                np.nanstd(self.transect_data["data"]),
            ]
        )

        data = np.array(data).T.tolist()

        return super(TransectPlotter, self).csv(header, columns, data)

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.3f" % x)
        numstations = len(self.transect_data["distance"])
        station = list(range(1, 1 + numstations))
        station = ["%03d" % s for s in station]

        latitude = np.repeat(self.transect_data["points"][0, :], len(self.depth))
        longitude = np.repeat(self.transect_data["points"][1, :], len(self.depth))
        time = np.repeat(self.iso_timestamp, len(station))
        depth = self.depth

        if len(self.variables) > 1:
            variable_names = [
                "%s Parallel" % self.transect_data["name"],
                "%s Perpendicular" % self.transect_data["name"],
            ]
            variable_units = [self.transect_data["units"]] * 2
            pa = self.transect_data["parallel"].transpose()
            pe = self.transect_data["perpendicular"].transpose()
            data = np.ma.array([pa, pe])
            data = np.rollaxis(data, 0, 2)
        else:
            variable_names = [self.transect_data["name"]]
            variable_units = [self.transect_data["units"]]
            data = self.transect_data["data"].transpose()

        data = float_to_str(data)

        return super(TransectPlotter, self).odv_ascii(
            self.dataset_name,
            variable_names,
            variable_units,
            station,
            latitude,
            longitude,
            depth,
            time,
            data,
        )

    def __create_plot_grid(self):
        # velocity has 2 variable components (parallel, perpendicular)
        velocity = (
            len(self.variables) == 2
            or self.compare
            and len(self.compare["variables"]) == 2
        )

        Col = 0
        Row = 0
        height_ratios = []
        if self.compare:  # Compare
            Row = 3
            if self.selected_velocity_plots[0]:  # Magnitude
                Col += 1
            if self.selected_velocity_plots[1]:  # Parallel
                Col += 1
            if self.selected_velocity_plots[2]:  # Perpendicular
                Col += 1  # 2 COLUMNS
            if self.showmap:  # Show Map Location
                Col += 1
            else:
                Col = 2

        else:  # No Comparison
            if self.showmap:  # Show Map Location
                Col = 2

                if velocity:
                    Row = 0
                    if self.selected_velocity_plots[0] == 1:  # Magnitude
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[1] == 1:  # Parallel
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[2] == 1:  # Perpendicular
                        Row += 1  # 2 COLUMNS
                        height_ratios.append(1)

                else:
                    Row = 1

            else:  # Not Showing Map Location
                # Summing true values
                if velocity:
                    Row = 0
                    Col = 1
                    if self.selected_velocity_plots[0] == 1:  # Magnitude
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[1] == 1:  # Parallel
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[2] == 1:  # Perpendicular
                        Row += 1  # 2 COLUMNS
                        height_ratios.append(1)
                else:
                    Row = 1
                    Col = 1

        # Setup grid
        if self.showmap:  # Shows Map Location
            width = 2

            # Velocity Plot
            if velocity:
                if self.compare:
                    width = 3
                    width_ratios = [1, 1, 1]
                else:
                    width_ratios = [2, 7]
            else:
                width_ratios = [2, 7]
        else:  # Doesn't Show Map Location
            if velocity:
                width = 2
                width_ratios = [1]
                if self.compare:
                    width_ratios = [1, 1]
            else:
                width = 1  # 1 column
                width_ratios = [1]

        if self.profile_distance >= 0:
            Col = Col + 1
            width_ratios.append(2)

        # Setup grid (rows, columns, column/row ratios) depending on view mode
        figuresize = list(map(float, self.size.split("x")))
        if self.compare:
            # Vertical scaling of figure
            figuresize[1] *= len(self.variables) * 3
            if velocity:
                figuresize[0] *= 1.25  # Horizontal scaling of figure
                gs = gridspec.GridSpec(
                    4,
                    width,
                    width_ratios=width_ratios,
                    height_ratios=[1, 1, 1, 1],
                    hspace=0.2,
                )
            else:
                gs = gridspec.GridSpec(
                    3,
                    width,
                    width_ratios=width_ratios,
                    height_ratios=[1, 1, 1],
                    hspace=0.2,
                )
        else:
            figuresize[1] *= len(self.variables) * 1.5
            if velocity:
                figuresize[0] *= 1.35

                gs = gridspec.GridSpec(
                    Row,
                    Col,
                    width_ratios=width_ratios,
                    height_ratios=height_ratios,
                    hspace=0.2,
                )
            else:
                gs = gridspec.GridSpec(Row, Col, width_ratios=width_ratios, hspace=0.2)

        fig = plt.figure(figsize=figuresize, dpi=self.dpi)

        return gs, fig, velocity

    def plot(self):

        gs, fig, velocity = self.__create_plot_grid()

        # Plot the transect on a map
        if self.showmap:
            utils.path_plot(self.transect_data["points"], gs[0, 0])

        def do_plot(
            subplots, map_subplot, data, name, cmapLabel, vmin, vmax, units, cmap
        ):
            """
            Args:
                subplots: a GridSpec object (gs)
                map_subplot: Row number (Note: don't use consecutive rows to allow for
                             expanding figure height)
                data: Data to be plotted
                name: subplot title
                cmapLabel: label for colourmap legend
                vmin: minimum value for a variable (grabbed from the lowest value of
                      some data)
                vmax: maxmimum value for a variable (grabbed from the highest value
                      of some data)
                units: units for variable (PSU, Celsius, etc)
                cmap: colormap for variable
            """

            plt.subplot(subplots[map_subplot[0], map_subplot[1]])

            divider = self._transect_plot(
                data, self.depth, name, vmin, vmax, cmapLabel, units, cmap
            )

            if self.surface:
                self.__add_surface_plot(divider)

            if self.profile_distance >= 0:
                self.__add_profile_plot(subplots)

        def find_minmax(scale, data):
            """
            Finds and returns the correct min/max values for the variable scale
            Args:
                scale: scale for the left or Right Map (self.scale or
                       self.compare['scale])
                data: transect_data
            Returns:
                (min, max)
            """
            if scale:
                return (scale[0], scale[1])
            else:
                return (np.amin(data), np.amax(data))

        # Creates and places the plots
        def velocity_plot():

            Row = 0
            if self.showmap:
                Col = 1
            else:
                Col = 0

            if self.selected_velocity_plots[0] == 1:
                do_plot(
                    gs,
                    [Row, Col],
                    self.transect_data["magnitude"],
                    "Magnitude"  # gettext("Magnitude")
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    "Magnitude",  # gettext("Magnitude"),
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )
                Row += 1
            if self.selected_velocity_plots[1] == 1:
                do_plot(
                    gs,
                    [Row, Col],
                    self.transect_data["parallel"],
                    self.transect_data["name"]
                    + " ("
                    + "Parallel"  # + gettext("Parallel")
                    + ")"
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    "Parallel",  # gettext("Parallel"),
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )
                Row += 1
            if self.selected_velocity_plots[2] == 1:

                do_plot(
                    gs,
                    [Row, Col],
                    self.transect_data["perpendicular"],
                    self.transect_data["name"]
                    + " ("
                    + "Perpendicular"  # + gettext("Perpendicular")
                    + ")"
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    "Perpendicular",  # gettext("Perpendicular"),
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )

        # Plot Transects
        # If in compare mode

        if self.compare:
            # Velocity has 2 components
            if velocity:
                if self.scale:
                    vmin = self.scale[0]
                    vmax = self.scale[1]
                else:
                    vmin = min(
                        np.amin(self.transect_data["parallel"]),
                        np.amin(self.transect_data["perpendicular"]),
                    )
                    vmax = max(
                        np.amax(self.transect_data["parallel"]),
                        np.amin(self.transect_data["perpendicular"]),
                    )
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)

                # Get colormap for variable
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(
                    gs,
                    [0, Col],
                    self.transect_data["parallel"],
                    self.transect_data["name"]
                    + " ("
                    + "Parallel"  # + gettext("Parallel")
                    + ")"
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    "Parallel",  # gettext("Parallel"),
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )
                Col += 1
                do_plot(
                    gs,
                    [0, Col],
                    self.transect_data["perpendicular"],
                    self.transect_data["name"]
                    + " ("
                    + "Perpendicular"  # + gettext("Perpendicular")
                    + ")"
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    "Perpendicular",  # gettext("Perpendicular"),
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )

                if len(self.compare["variables"]) == 2:
                    if self.compare["scale"]:
                        vmin = self.compare["scale"][0]
                        vmax = self.compare["scale"][1]
                    else:
                        vmin = min(
                            np.amin(self.compare["parallel"]),
                            np.amin(self.compare["perpendicular"]),
                        )
                        vmax = max(
                            np.amax(self.compare["parallel"]),
                            np.amin(self.compare["perpendicular"]),
                        )
                        vmin = min(vmin, -vmax)
                        vmax = max(vmax, -vmin)

                    # Get colormap for variable
                    cmap = colormap.find_colormap(self.compare["colormap"])
                    if self.showmap:
                        Col = 1
                    else:
                        Col = 0
                    do_plot(
                        gs,
                        [1, Col],
                        self.compare["parallel"],
                        self.transect_data["name"]
                        + " ("
                        + "Parallel"  # + gettext("Parallel")
                        + ")"
                        + " for "  # + gettext(" for ")
                        + self.date_formatter(self.compare["iso_timestamp"]),
                        "Parallel",  # gettext("Parallel"),
                        vmin,
                        vmax,
                        self.transect_data["units"],
                        cmap,
                    )
                    Col += 1
                    do_plot(
                        gs,
                        [1, Col],
                        self.compare["perpendicular"],
                        self.transect_data["name"]
                        + " ("
                        + "Perpendicular"  # + gettext("Perpendicular")
                        + ")"
                        + " for "  # + gettext(" for ")
                        + self.date_formatter(self.compare["iso_timestamp"]),
                        "Perpendicular",  # gettext("Perpendicular"),
                        vmin,
                        vmax,
                        self.transect_data["units"],
                        cmap,
                    )

            else:
                vmin, vmax = utils.normalize_scale(
                    self.transect_data["data"],
                    self.dataset_config.variable[self.variables[0]],
                )

                # Render primary/Left Map
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(
                    gs,
                    [0, Col],
                    self.transect_data["data"],
                    self.transect_data["name"]
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.iso_timestamp),
                    self.transect_data["name"],
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )

                # Render Right Map
                vmin, vmax = utils.normalize_scale(
                    self.transect_data["compare_data"],
                    self.compare_config.variable[",".join(self.compare["variables"])],
                )
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(
                    gs,
                    [1, Col],
                    self.transect_data["compare_data"],
                    self.compare["name"]
                    + " for "  # + gettext(" for ")
                    + self.date_formatter(self.compare["iso_timestamp"]),
                    self.compare["name"],
                    vmin,
                    vmax,
                    self.compare["units"],
                    self.compare["colormap"],
                )

                # Show a difference plot if both variables and datasets are the same
                if self.variables[0] == self.compare["variables"][0]:
                    self.transect_data["difference"] = (
                        self.transect_data["data"] - self.transect_data["compare_data"]
                    )
                    # Calculate variable range
                    if self.compare["scale_diff"] is not None:
                        vmin = self.compare["scale_diff"][0]
                        vmax = self.compare["scale_diff"][1]
                    else:
                        vmin, vmax = find_minmax(
                            self.compare["scale_diff"], self.transect_data["difference"]
                        )
                        vmin = min(vmin, -vmax)
                        vmax = max(vmax, -vmin)
                    if self.showmap:
                        Col = 1
                    else:
                        Col = 0
                    do_plot(
                        gs,
                        [2, Col],
                        self.transect_data["difference"],
                        self.transect_data["name"]
                        + " Difference",  # self.transect_data["name"] + gettext(" Difference"),
                        self.transect_data["name"],
                        vmin,
                        vmax,
                        # Since both variables are the same doesn't matter which
                        # view we reference
                        self.transect_data["units"],
                        # Colormap for difference graphs
                        colormap.find_colormap(self.compare["colormap_diff"]),
                    )

        # Not comparing
        else:
            # Velocity has 3 possible components
            if velocity:
                if self.scale:
                    vmin = self.scale[0]
                    vmax = self.scale[1]
                else:
                    vmin = min(
                        np.amin(self.transect_data["magnitude"]),
                        np.amin(self.transect_data["parallel"]),
                        np.amin(self.transect_data["perpendicular"]),
                    )
                    vmax = max(
                        np.amax(self.transect_data["magnitude"]),
                        np.amax(self.transect_data["parallel"]),
                        np.amin(self.transect_data["perpendicular"]),
                    )
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)

                velocity_plot()

            # All other variables have 1 component
            else:
                if self.showmap:
                    Col = 1
                else:
                    Col = 0
                if self.scale:
                    vmin = self.scale[0]
                    vmax = self.scale[1]
                else:
                    vmin, vmax = utils.normalize_scale(
                        self.transect_data["data"],
                        self.dataset_config.variable[self.variables[0]],
                    )

                do_plot(
                    gs,
                    [0, Col],
                    self.transect_data["data"],
                    self.transect_data["name"]
                    + " for "
                    + self.date_formatter(self.iso_timestamp),
                    self.transect_data["name"],
                    vmin,
                    vmax,
                    self.transect_data["units"],
                    self.cmap,
                )

        # Figure title
        if self.plotTitle is None or self.plotTitle == "":
            fig.suptitle("Transect Data for:\n%s" % (self.name), fontsize=15)
        else:
            fig.suptitle(self.plotTitle, fontsize=15)

        # Subplot padding
        fig.tight_layout(pad=2, w_pad=2, h_pad=2)
        fig.subplots_adjust(top=0.90 if self.compare else 0.85)

        return super(TransectPlotter, self).plot(fig)

    def __add_surface_plot(self, axis_divider):
        ax = axis_divider.append_axes("top", size="35%", pad=0.35)
        ax.plot(self.surface_data["distance"], self.surface_data["data"], color="r")
        ax.locator_params(nbins=3)
        ax.yaxis.tick_right()
        ax.yaxis.set_label_position("right")
        label = plt.ylabel(utils.mathtext(self.surface_data["units"]))
        title = plt.title(self.surface_data["name"], y=1.1)
        plt.setp(title, size="smaller")
        plt.setp(label, size="smaller")
        plt.setp(ax.get_yticklabels(), size="x-small")
        plt.xlim([0, self.surface_data["distance"][-1]])
        plt.ylim(
            utils.normalize_scale(
                self.surface_data["data"], self.surface_data["config"]
            )
        )
        ax.yaxis.grid(True)
        ax.axes.get_xaxis().set_visible(False)

    def __add_profile_plot(self, gs):
        ax = plt.subplot(gs[0, gs.ncols - 1])
        ax.plot(self.profile_data[0], self.profile_data[1], color="r")
        ax.invert_yaxis()
        ax.set_yticks([])
        ax.set_xlabel(self.variables[0])
        if self.depth_limit:
            ax.set_ylim(self.depth_limit, 0)
        else:
            deep = np.amax(self.bathymetry["y"] * -1)
            lim = 10 ** np.floor(np.log10(deep))
            ax.set_ylim(np.ceil(deep / lim) * lim, 0)
        self.plotTitle = (
            "Transect Data for:\n%s" % (self.name)
            + "\nProfile: "
            + str(self.destination.latitude)
            + " "
            + str(self.destination.longitude)
        )

    def _transect_plot(
        self, values, depths, plotTitle, vmin, vmax, cmapLabel, unit, cmap
    ):
        self.__fill_invalid_shift(values)

        dist = np.tile(self.transect_data["distance"], (values.shape[0], 1))

        # Plot the data
        c = plt.pcolormesh(
            dist,
            depths.transpose(),
            values,
            cmap=cmap,
            shading="gouraud",  # Smooth shading
            vmin=vmin,
            vmax=vmax,
        )
        ax = plt.gca()
        ax.set_title(plotTitle, fontsize=14)  # Set title of subplot
        ax.invert_yaxis()

        if self.linearthresh == 0:
            plt.yscale("linear")
        elif self.depth_limit is None or (
            self.depth_limit is not None and self.linearthresh < self.depth_limit
        ):
            plt.yscale("symlog", linthresh=self.linearthresh)

        ax.yaxis.set_major_formatter(ScalarFormatter())

        var_unit = utils.mathtext(unit)
        y_offset = -0.08
        if self.compare:
            y_offset = -0.1

        ax.text(
            0,
            y_offset,
            self.get_stats_str(values, var_unit),
            fontsize=14,
            transform=ax.transAxes,
        )

        # Mask out the bottom
        plt.fill_between(
            self.bathymetry["x"],
            self.bathymetry["y"] * -1,
            plt.ylim()[0],
            facecolor="dimgray",
            hatch="xx",
        )
        ax.set_facecolor("dimgray")

        plt.xlabel("Distance (km)")  # plt.xlabel(gettext("Distance (km)"))
        plt.ylabel("Depth (m)")  # plt.ylabel(gettext("Depth (m)"))
        plt.xlim(
            [self.transect_data["distance"][0], self.transect_data["distance"][-1]]
        )

        # Tighten the y-limits
        if self.depth_limit:
            plt.ylim(self.depth_limit, 0)
        else:
            deep = np.amax(self.bathymetry["y"] * -1)
            lim = 10 ** np.floor(np.log10(deep))
            plt.ylim(np.ceil(deep / lim) * lim, 0)

        ticks = sorted(set(list(plt.yticks()[0]) + [self.linearthresh, plt.ylim()[0]]))
        if self.depth_limit is not None:
            ticks = [y for y in ticks if y <= self.depth_limit]

        plt.yticks(ticks)

        # Show the linear threshold
        plt.plot(
            [self.transect_data["distance"][0], self.transect_data["distance"][-1]],
            [self.linearthresh, self.linearthresh],
            "k:",
            alpha=1.0,
        )

        if self.profile_distance >= 0:
            plt.axvline(x=self.profile_distance / 1000, color="r", linestyle="--")

        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)

        # Append variable units to color scale label
        bar.set_label(f"{cmapLabel} ({var_unit})")

        if len(self.points) > 2:
            station_distances = []
            current_dist = 0
            d = GeodesicDistance()
            for idx, p in enumerate(self.points):
                if idx == 0:
                    station_distances.append(0)
                else:
                    current_dist += d.measure(p, self.points[idx - 1])
                    station_distances.append(current_dist)

            ax2 = ax.twiny()
            ax2.set_xticks(station_distances)
            ax2.set_xlim(
                [self.transect_data["distance"][0], self.transect_data["distance"][-1]]
            )
            ax2.tick_params(
                "x", length=0, width=0, pad=-3, labelsize="xx-small", which="major"
            )
            ax2.xaxis.set_major_formatter(StrMethodFormatter("$\u25bc$"))
            cax = make_axes_locatable(ax2).append_axes("right", size="5%", pad=0.05)
            bar2 = plt.colorbar(c, cax=cax)
            bar2.remove()
        return divider
