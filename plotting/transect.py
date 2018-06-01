from plotting.grid import bathymetry
from netCDF4 import Dataset
from mpl_toolkits.axes_grid1 import make_axes_locatable
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter, StrMethodFormatter
import numpy as np
import re
import plotting.colormap as colormap
import plotting.utils as utils
from oceannavigator import app
from geopy.distance import VincentyDistance
from oceannavigator.dataset_config import get_variable_name, get_variable_unit, \
    get_dataset_url, get_variable_scale_factor
import plotting.line as pl
from flask_babel import gettext
from scipy.interpolate import interp1d
from data import open_dataset, geo

class TransectPlotter(pl.LinePlotter):

    def __init__(self, dataset_name, query, format):
        self.plottype = "transect"
        super(TransectPlotter, self).__init__(dataset_name, query, format)
        self.size = '11x5'
        self.selected_velocity_plots = None  #Holds Velocity Plot Type [magnitude, parallel, perpendicular]

    def parse_query(self, query):
        super(TransectPlotter, self).parse_query(query)
        depth_limit = query.get("depth_limit")
        self.selected_velocity_plots = list(map(int, query.get("selectedPlots").split(',')))
        
        if depth_limit is None or depth_limit == '' or depth_limit is False:
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
        with open_dataset(get_dataset_url(self.dataset_name)) as dataset:
            if self.time < 0:
                self.time += len(dataset.timestamps)
            time = np.clip(self.time, 0, len(dataset.timestamps) - 1)

            for idx, v in enumerate(self.variables):
                var = dataset.variables[v]
                if not (set(var.dimensions) & set(dataset.depth_dimensions)):
                    for potential in dataset.variables:
                        if potential in self.variables:
                            continue
                        pot = dataset.variables[potential]
                        if (set(pot.dimensions) &
                                set(dataset.depth_dimensions)):
                            if len(pot.dimensions) > 3:
                                self.variables[idx] = potential.key

            value = parallel = perpendicular = magnitude = None

            variable_names = self.get_variable_names(dataset, self.variables)
            variable_units = self.get_variable_units(dataset, self.variables)
            scale_factors = self.get_variable_scale_factors(dataset, self.variables)

            # Load data sent from primary/Left Map
            if len(self.variables) > 1:
                # Only velocity has 2 variables
                v = []
                for name in self.variables:
                    v.append(dataset.variables[name])

                distances, times, lat, lon, bearings = geo.path_to_points(
                    self.points, 100
                )
                transect_pts, distance, x, dep = dataset.get_path_profile(
                    self.points, time, self.variables[0], 100)
                transect_pts, distance, y, dep = dataset.get_path_profile(
                    self.points, time, self.variables[1], 100)

                # Calculate vector components
                x = np.multiply(x, scale_factors[0])
                y = np.multiply(y, scale_factors[1])

                r = np.radians(np.subtract(90, bearings))
                theta = np.arctan2(y, x) - r
                magnitude = np.sqrt(x ** 2 + y ** 2)

                parallel = magnitude * np.cos(theta)
                perpendicular = magnitude * np.sin(theta)

            else:
                # Get data for one variable
                transect_pts, distance, value, dep = dataset.get_path_profile(
                    self.points, time, self.variables[0])

                value = np.multiply(value, scale_factors[0])

            # Get variable units and convert to Celsius if needed
            variable_units[0], value = self.kelvin_to_celsius(
                variable_units[0],
                value
            )

            if len(self.variables) == 2:
                variable_names[0] = self.vector_name(variable_names[0])

            # If a colourmap has not been manually specified by the
            # Navigator...
            if self.cmap is None:
                self.cmap = colormap.find_colormap(variable_names[0])

            self.timestamp = dataset.timestamps[int(time)]

            self.depth = dep
            self.depth_unit = "m"

            self.transect_data = {
                "points": transect_pts,
                "distance": distance,
                "data": value,
                "name": variable_names[0],
                "unit": variable_units[0],
                "parallel": parallel,
                "perpendicular": perpendicular,
                "magnitude": magnitude,
            }

            if self.surface is not None:
                surface_pts, surface_dist, t, surface_value = \
                    dataset.get_path(
                        self.points,
                        0,
                        time,
                        self.surface,
                    )
                surface_unit = get_variable_unit(
                    self.dataset_name,
                    dataset.variables[self.surface]
                )
                surface_name = get_variable_name(
                    self.dataset_name,
                    dataset.variables[self.surface]
                )
                surface_factor = get_variable_scale_factor(
                    self.dataset_name,
                    dataset.variables[self.surface]
                )
                surface_value = np.multiply(surface_value, surface_factor)
                surface_unit, surface_value = self.kelvin_to_celsius(
                    surface_unit,
                    surface_value
                )

                self.surface_data = {
                    "points": surface_pts,
                    "distance": surface_dist,
                    "data": surface_value,
                    "name": surface_name,
                    "unit": surface_unit
                }

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
                    output.append(
                        f(depth_out[i].view(np.ma.MaskedArray).filled())
                    )

                return np.ma.masked_invalid(output).transpose()

            with open_dataset(get_dataset_url(self.compare['dataset'])) as dataset:
                # Get and format date
                print(type(self.compare['time']))
                self.compare['date'] = np.clip(np.int64(self.compare['time']), 0, len(dataset.timestamps) - 1)
                self.compare['date'] = dataset.timestamps[int(self.compare['date'])]

                # 1 variable
                if len(self.compare['variables']) == 1:
                    
                    # Get and store the "nicely formatted" string for the variable name
                    self.compare['name'] = self.get_variable_names(dataset, self.compare['variables'])[0]
                    
                    # Find correct colourmap
                    if (self.compare['colormap'] == 'default'):
                        self.compare['colormap'] = colormap.find_colormap(self.compare['name'])
                    else:
                        self.compare['colormap'] = colormap.find_colormap(self.compare['colormap'])

                    climate_points, climate_distance, climate_data, cdep = \
                        dataset.get_path_profile(self.points,
                                                 self.compare['time'],
                                                 self.compare['variables'][0])
                    
                    # Get variable units and convert to Celsius if needed
                    self.compare['unit'], climate_data = self.kelvin_to_celsius(
                        dataset.variables[self.compare['variables'][0]].unit,
                        climate_data
                    )
                    self.__fill_invalid_shift(climate_data)

                    if (self.depth.shape != cdep.shape) or \
                       (self.depth != cdep).any():
                        # Need to interpolate the depths
                        climate_data = interpolate_depths(
                            climate_data,
                            cdep,
                            self.depth
                        )

                    if self.transect_data['data'] is None:
                        self.transect_data['magnitude'] -= climate_data
                        self.transect_data['parallel'] -= climate_data
                        self.transect_data['perpendicular'] -= climate_data
                    else:
                        self.transect_data['compare_data'] = climate_data
                
                # Velocity variables
                else:
                    # Get and store the "nicely formatted" string for the variable name
                    self.compare['name'] = self.get_variable_names(dataset, self.compare['variables'])[0]
                    
                    
                    climate_pts, climate_distance, climate_x, cdep = \
                        dataset.get_path_profile(
                            self.points,
                            self.compare['time'],
                            self.compare['variables'][0],
                            100
                        )
                    climate_pts, climate_distance, climate_y, cdep = \
                        dataset.get_path_profile(
                            self.points,
                            self.compare['time'],
                            self.compare['variables'][0],
                            100
                        )

                    climate_distances, ctimes, clat, clon, bearings = \
                        geo.path_to_points(self.points, 100)

                    r = np.radians(np.subtract(90, bearings))
                    theta = np.arctan2(climate_y, climate_x) - r
                    mag = np.sqrt(climate_x ** 2 + climate_y ** 2)

                    if np.all(self.depth != cdep):
                        theta = interpolate_depths(
                            theta,
                            cdep,
                            self.depth
                        )
                        self.__fill_invalid_shift(theta)
                        mag = interpolate_depths(
                            mag,
                            cdep,
                            self.depth
                        )
                        self.__fill_invalid_shift(mag)

                    self.compare['parallel'] = mag * np.cos(theta)
                    self.compare['perpendicular'] = mag * np.sin(theta)

                    """
                    if self.transect_data['parallel'] is None:
                        self.transect_data['data'] -= mag
                    else:
                        self.transect_data['parallel'] -= climate_parallel
                        self.transect_data['perpendicular'] -= climate_perpendicular
                    """

        # Bathymetry
        with Dataset(app.config['BATHYMETRY_FILE'], 'r') as dataset:
            bath_x, bath_y = bathymetry(
                dataset.variables['y'],
                dataset.variables['x'],
                dataset.variables['z'],
                self.points)

        self.bathymetry = {
            'x': bath_x,
            'y': bath_y
        }

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Distance (km)",
            "Depth (m)",
        ]

        if self.surface is not None:
            columns.append("%s (%s)" % (
                self.surface_data['name'],
                self.surface_data['unit']
            ))

        if len(self.variables) > 1:
            columns.append("Parallel %s (%s)" % (self.transect_data['name'],
                                                 self.transect_data['unit']))
            columns.append(
                "Perpendicular %s (%s)" % (self.transect_data['name'],
                                           self.transect_data['unit']))
            values = ['parallel', 'perpendicular']
        else:
            columns.append("%s (%s)" % (self.transect_data['name'],
                                        self.transect_data['unit']))
            values = ['data']

        data = []
        for idx, dist in enumerate(self.transect_data['distance']):
            if dist == self.transect_data['distance'][idx - 1]:
                continue

            for j in range(0, len(self.transect_data[values[0]][:, idx])):
                entry = [
                    "%0.4f" % self.transect_data['points'][0, idx],
                    "%0.4f" % self.transect_data['points'][1, idx],
                    "%0.1f" % dist,
                    "%0.1f" % self.depth[idx, j]
                ]
                if self.surface is not None:
                    if j == 0:
                        entry.append("%0.4f" % self.surface_data['data'][idx])
                    else:
                        entry.append("-")

                for t in values:
                    entry.append("%0.4f" % self.transect_data[t][j, idx])

                if entry[-1] == "nan":
                    continue

                data.append(entry)

        return super(TransectPlotter, self).csv(header, columns, data)

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.3f" % x)
        numstations = len(self.transect_data['distance'])
        station = list(range(1, 1 + numstations))
        station = ["%03d" % s for s in station]

        latitude = np.repeat(self.transect_data['points'][0, :],
                             len(self.depth))
        longitude = np.repeat(self.transect_data['points'][1, :],
                              len(self.depth))
        time = np.repeat(self.timestamp, len(station))
        depth = self.depth

        if len(self.variables) > 1:
            variable_names = [
                "%s Parallel" % self.transect_data['name'],
                "%s Perpendicular" % self.transect_data['name']
            ]
            variable_units = [self.transect_data['unit']] * 2
            pa = self.transect_data['parallel'].transpose()
            pe = self.transect_data['perpendicular'].transpose()
            data = np.ma.array([pa, pe])
            data = np.rollaxis(data, 0, 2)
        else:
            variable_names = [self.transect_data['name']]
            variable_units = [self.transect_data['unit']]
            data = self.transect_data['data'].transpose()

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
            data
        )

    def gridSetup(self):
        # velocity has 2 variable components (parallel, perpendicular)
        velocity = len(self.variables) == 2 or \
                    self.compare and len(self.compare['variables']) == 2

       
        
        Col = 0
        Row = 0
        height_ratios = []
        if self.compare:    #Compare
            Row = 3
            if self.selected_velocity_plots[0]: #Magnitude
                Col += 1
            if self.selected_velocity_plots[1]: #Parallel
                Col += 1
            if self.selected_velocity_plots[2]: #Perpendicular
                Col += 1    # 2 COLUMNS
            if self.showmap: #Show Map Location
                Col += 1   
            else :
                Col = 2

        else :  #No Comparison
            if self.showmap:  #Show Map Location
                Col = 2
                
                if velocity:
                    Row = 0
                    if self.selected_velocity_plots[0] == 1: #Magnitude
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[1] == 1: #Parallel
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[2] == 1: #Perpendicular
                        Row += 1    # 2 COLUMNS
                        height_ratios.append(1)

                else :
                    Row = 1

            else : #Not Showing Map Location
                #Summing true values
                if velocity:
                    Row = 0
                    Col = 1
                    if self.selected_velocity_plots[0] == 1: #Magnitude
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[1] == 1: #Parallel
                        Row += 1
                        height_ratios.append(1)
                    if self.selected_velocity_plots[2] == 1: #Perpendicular
                        Row += 1    # 2 COLUMNS
                        height_ratios.append(1)
                else:
                    Row = 1
                    Col = 1

        # Setup grid
        if self.showmap:    #Shows Map Location
            width = 2

            #Velocity Plot
            if velocity:
                if self.compare:
                    width = 3
                    width_ratios = [1, 1, 1]
                else:
                    width_ratios = [2, 7]
            else:
                width_ratios = [2, 7]
        else:               #Doesn't Show Map Location
            if velocity:
                width = 2
                width_ratios = [1]
                if self.compare:
                    width_ratios = [1, 1]
            else:
                width = 1 # 1 column
                width_ratios = [1]

        # Setup grid (rows, columns, column/row ratios) depending on view mode
        figuresize = list(map(float, self.size.split("x")))
        if self.compare:
            figuresize[1] *= len(self.variables) * 3 # Vertical scaling of figure
            if velocity:
                figuresize[0] *= 1.25 # Horizontal scaling of figure
                gs = gridspec.GridSpec(4, width, width_ratios=width_ratios, height_ratios=[1, 1, 1, 1, 1])
            else:
                gs = gridspec.GridSpec(3, width, width_ratios=width_ratios, height_ratios=[1, 1, 1])
        else:
            figuresize[1] *= len(self.variables) * 1.5
            if velocity:
                figuresize[0] *= 1.35
            
                gs = gridspec.GridSpec(Row, Col, width_ratios=width_ratios, height_ratios= height_ratios)
            else:
                gs = gridspec.GridSpec(Row, Col, width_ratios=width_ratios)

        fig = plt.figure(figsize=figuresize, dpi=self.dpi)


        return gs, fig, velocity

    def plot(self):
        

        gs, fig, velocity = self.gridSetup()


        # Plot the transect on a map
        if self.showmap:
            plt.subplot(gs[0,0])
            utils.path_plot(self.transect_data['points'])

        
        # Args:
        #    subplots: a GridSpec object (gs)
        #    map_subplot: Row number (Note: don't use consecutive rows to allow
        #                 for expanding figure height)
        #    data: Data to be plotted
        #    name: subplot title
        #    cmapLabel: label for colourmap legend
        #    vmin: minimum value for a variable (grabbed from the lowest value of some data)
        #    vmax: maxmimum value for a variable (grabbed from the highest value of some data)onstrate a networked Ope
        #    units: units for variable (PSU, Celsius, etc)
        #    cmap: colormap for variable
        #
        def do_plot(subplots, map_subplot, data, name, cmapLabel, vmin, vmax, units, cmap):

            
            plt.subplot(subplots[map_subplot[0], map_subplot[1]])

            divider = self._transect_plot(data, self.depth, name, vmin, vmax, cmapLabel, units, cmap)

            if self.surface:
                self._surface_plot(divider)

        """
        Finds and returns the correct min/max values for the variable scale
        Args:
            scale: scale for the left or Right Map (self.scale or self.compare['scale])
            data: transect_data
        Returns:
            (min, max)
        """
        def find_minmax(scale, data):
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
                    gs, [Row, Col],
                    self.transect_data['magnitude'],
                    gettext("Magnitude") + gettext(" for ") + self.date_formatter(self.timestamp),
                    gettext("Magnitude"),
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )
                Row += 1
            if self.selected_velocity_plots[1] == 1:
                do_plot(
                    gs, [Row, Col],
                    self.transect_data['parallel'],
                    gettext("Parallel Velocity") + gettext(" for ") + self.date_formatter(self.timestamp),
                    gettext("Parallel"),
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )
                Row += 1
            if self.selected_velocity_plots[2] == 1:

                do_plot(
                    gs, [Row, Col],
                    self.transect_data['perpendicular'],
                    gettext("Perpendicular Velocity") + gettext(" for ") + self.date_formatter(self.timestamp),
                    gettext("Perpendicular"),
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )



        # Plot Transects
        # If in compare mode
        
        Type = ['magnitude', 'parallel', 'perpendicular']
        
        if self.compare:
            # Velocity has 2 components
            if velocity:
                if self.scale:
                    vmin = self.scale[0]
                    vmax = self.scale[1]
                else:
                    vmin = min(np.amin(self.transect_data['parallel']),
                               np.amin(self.transect_data['perpendicular']))
                    vmax = max(np.amax(self.transect_data['parallel']),
                               np.amin(self.transect_data['perpendicular']))
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)
            
                # Get colormap for variable
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(
                    gs, [0, Col],
                    self.transect_data['parallel'],
                    gettext("Parallel Velocity") + gettext(" for ") + self.date_formatter(self.timestamp),
                    gettext("Parallel"),
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )
                Col += 1
                do_plot(
                    gs, [0, Col],
                    self.transect_data['perpendicular'],
                    gettext("Perpendicular Velocity") + gettext(" for ") + self.date_formatter(self.timestamp),
                    gettext("Perpendicular"),
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )

                if len(self.compare['variables']) == 2:
                    if self.compare['scale']:
                        vmin = self.compare['scale'][0]
                        vmax = self.compare['scale'][1]
                    else:
                        vmin = min(np.amin(self.compare['parallel']),
                               np.amin(self.compare['perpendicular']))
                        vmax = max(np.amax(self.compare['parallel']),
                               np.amin(self.compare['perpendicular']))
                        vmin = min(vmin, -vmax)
                        vmax = max(vmax, -vmin)
                        
                    # Get colormap for variable
                    cmap = colormap.find_colormap(self.compare['colormap'])
                    if self.showmap:
                        Col = 1
                    else:
                        Col = 0
                    do_plot(
                        gs, [1, Col],
                        self.compare['parallel'],
                        gettext("Parallel Velocity") + gettext(" for ") + self.date_formatter(self.compare['date']),
                        gettext("Parallel"),
                        vmin,
                        vmax,
                        self.transect_data['unit'],
                        cmap
                    )
                    Col += 1
                    do_plot(
                        gs, [1, Col],
                        self.compare['perpendicular'],
                        gettext("Perpendicular Velocity") + gettext(" for ") + self.date_formatter(self.compare['date']),
                        gettext("Perpendicular"),
                        vmin,
                        vmax,
                        self.transect_data['unit'],
                        cmap
                    )

            else:
                # Get range min/max
                vmin, vmax = find_minmax(self.scale, self.transect_data['data'])
                if re.search(
                    "velocity",
                    self.transect_data['name'],
                    re.IGNORECASE
                ):   
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)

                # Render primary/Left Map
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(                    
                    gs, [0, Col],
                    self.transect_data['data'],
                    self.transect_data['name'] + gettext(" for ") + self.date_formatter(self.timestamp),
                    self.transect_data['name'],
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )

                # Render Right Map
                vmin, vmax = find_minmax(self.compare['scale'], self.transect_data['compare_data'])
                if self.showmap:
                    Col = 1
                else:
                    Col = 0

                do_plot(
                    gs, [1, Col],
                    self.transect_data['compare_data'],
                    self.compare['name'] + gettext(" for ") + self.date_formatter(self.compare['date']),
                    self.compare['name'],
                    vmin,
                    vmax,
                    self.compare['unit'],
                    self.compare['colormap']
                )
            
                # Show a difference plot if both variables and datasets are the same
                if self.variables[0] == self.compare['variables'][0]:
                    self.transect_data['difference'] = self.transect_data['data'] - \
                                                       self.transect_data['compare_data']
                    # Calculate variable range
                    if self.compare['scale_diff'] is not None:
                        vmin = self.compare['scale_diff'][0]
                        vmax = self.compare['scale_diff'][1]
                    else:
                        vmin, vmax = find_minmax(self.compare['scale_diff'], self.transect_data['difference'])
                        vmin = min(vmin, -vmax)
                        vmax = max(vmax, -vmin)
                    if self.showmap:
                        Col = 1
                    else:
                        Col = 0
                    do_plot(
                        gs, [2, Col],
                        self.transect_data['difference'],
                        self.transect_data['name'] + gettext(" Difference"),
                        self.transect_data['name'],
                        vmin,
                        vmax,
                        self.transect_data['unit'],  # Since both variables are the same doesn't matter which view we reference
                        colormap.find_colormap(self.compare['colormap_diff']) # Colormap for difference graphs
                    )
        


        # Not comparing
        else:
            # Velocity has 3 possible components
            if velocity:
                if self.scale:
                    vmin = self.scale[0]
                    vmax = self.scale[1]
                else:
                    vmin = min(np.amin(self.transect_data['magnitude']),
                               np.amin(self.transect_data['parallel']),
                               np.amin(self.transect_data['perpendicular']))
                    vmax = max(np.amax(self.transect_data['magnitude']),
                               np.amax(self.transect_data['parallel']),
                               np.amin(self.transect_data['perpendicular']))
                    vmin = min(vmin, -vmax)
                    vmax = max(vmax, -vmin)
            
                Row = 0
                
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
                    vmin = np.amin(self.transect_data['data'])
                    vmax = np.amax(self.transect_data['data'])
                    if re.search(
                        "velocity",
                        self.transect_data['name'],
                        re.IGNORECASE
                    ):
                        vmin = min(vmin, -vmax)
                        vmax = max(vmax, -vmin)

                do_plot(
                    gs, [0, Col],
                    self.transect_data['data'],
                    self.transect_data['name'] + " for " +
                    self.date_formatter(self.timestamp),
                    self.transect_data['name'],
                    vmin,
                    vmax,
                    self.transect_data['unit'],
                    self.cmap
                )
            
        # Figure title
        if self.plotTitle is None or self.plotTitle == "": 
            fig.suptitle("Transect Data for:\n%s" % (
                self.name
            ), fontsize=15)
        else:
            fig.suptitle(self.plotTitle,fontsize=15)

        # Subplot padding
        fig.tight_layout(pad=2, w_pad=2, h_pad=2)
        fig.subplots_adjust(top = 0.90 if self.compare else 0.85)

        return super(TransectPlotter, self).plot(fig)

    def _surface_plot(self, axis_divider):
        ax = axis_divider.append_axes("top", size="35%", pad=0.35)
        ax.plot(self.surface_data['distance'],
                self.surface_data['data'], color='r')
        ax.locator_params(nbins=3)
        ax.yaxis.tick_right()
        ax.yaxis.set_label_position("right")
        label = plt.ylabel(utils.mathtext(self.surface_data['unit']))
        title = plt.title(self.surface_data['name'], y=1.1)
        plt.setp(title, size='smaller')
        plt.setp(label, size='smaller')
        plt.setp(ax.get_yticklabels(), size='x-small')
        plt.xlim([0, self.surface_data['distance'][-1]])
        if np.any([re.search(x, self.surface_data['name'], re.IGNORECASE) for x in [
                "free surface",
                "surface height"
            ]]):
            ylim = plt.ylim()
            plt.ylim([min(ylim[0], -ylim[1]), max([-ylim[0], ylim[1]])])
            ax.yaxis.grid(True)
        ax.axes.get_xaxis().set_visible(False)

    def _transect_plot(self, values, depths, plotTitle, vmin, vmax, cmapLabel, unit, cmap):
        self.__fill_invalid_shift(values)

        dist = np.tile(self.transect_data['distance'], (values.shape[0], 1))
        
        # Plot the data
        c = plt.pcolormesh(dist, depths.transpose(), values,
                           cmap=cmap,
                           shading='gouraud', # Smooth shading
                           vmin=vmin,
                           vmax=vmax)
        ax = plt.gca()
        ax.set_title(plotTitle, fontsize=14) # Set title of subplot
        ax.invert_yaxis()
        if self.depth_limit is None or (
            self.depth_limit is not None and
            self.linearthresh < self.depth_limit
        ):
            plt.yscale('symlog', linthreshy=self.linearthresh)
        
        ax.yaxis.set_major_formatter(ScalarFormatter())

        # Mask out the bottom
        plt.fill_between(
            self.bathymetry['x'],
            self.bathymetry['y'] * -1,
            plt.ylim()[0],
            facecolor='dimgray',
            hatch='xx'
        )
        ax.set_facecolor('dimgray')

        plt.xlabel(gettext("Distance (km)"))
        plt.ylabel(gettext("Depth (m)"))
        plt.xlim([self.transect_data['distance'][0],
                  self.transect_data['distance'][-1]])

        # Tighten the y-limits
        if self.depth_limit:
            plt.ylim(self.depth_limit, 0)
        else:
            deep = np.amax(self.bathymetry['y'] * -1)
            l = 10 ** np.floor(np.log10(deep))
            plt.ylim(np.ceil(deep / l) * l, 0)

        ticks = sorted(set(list(plt.yticks()[0]) + [self.linearthresh,
                                                    plt.ylim()[0]]))
        if self.depth_limit is not None:
            ticks = [y for y in ticks if y <= self.depth_limit]

        plt.yticks(ticks)

        # Show the linear threshold
        plt.plot([self.transect_data['distance'][0],
                  self.transect_data['distance'][-1]],
                 [self.linearthresh, self.linearthresh],
                 'k:', alpha=1.0)

        divider = make_axes_locatable(ax)
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)

        # Append variable units to color scale label
        bar.set_label(cmapLabel + " (" + utils.mathtext(unit) + ")")

        if len(self.points) > 2:
            station_distances = []
            current_dist = 0
            d = VincentyDistance()
            for idx, p in enumerate(self.points):
                if idx == 0:
                    station_distances.append(0)
                else:
                    current_dist += d.measure(
                        p, self.points[idx - 1])
                    station_distances.append(current_dist)

            ax2 = ax.twiny()
            ax2.set_xticks(station_distances)
            ax2.set_xlim([self.transect_data['distance'][0],
                          self.transect_data['distance'][-1]])
            ax2.tick_params(
                'x',
                length=0,
                width=0,
                pad=-3,
                labelsize='xx-small',
                which='major')
            ax2.xaxis.set_major_formatter(StrMethodFormatter("$\u25bc$"))
            cax = make_axes_locatable(ax2).append_axes(
                "right", size="5%", pad=0.05)
            bar2 = plt.colorbar(c, cax=cax)
            bar2.remove()
        return divider
