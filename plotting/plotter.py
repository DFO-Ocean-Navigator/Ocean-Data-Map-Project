import contextlib
import datetime
import re
from abc import ABCMeta, abstractmethod
from io import BytesIO, StringIO
from typing import List

import matplotlib.pyplot as plt
import numpy as np
import pint
from flask_babel import format_date, format_datetime

import plotting.colormap as colormap
import plotting.utils as utils
from oceannavigator import DatasetConfig


# Base class for all plotting objects
class Plotter(metaclass=ABCMeta):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.dataset_name: str = dataset_name
        self.dataset_config: DatasetConfig = DatasetConfig(dataset_name)
        self.query: dict = query
        self.format: str = kwargs['format']
        self.dpi: int = int(kwargs['dpi'])
        self.size: str = kwargs['size']
        self.plotTitle: str = None
        self.compare: bool = False
        self.data = None
        self.time: int = None
        self.variables = None
        self.variable_names = None
        self.variable_units = None
        self.scale = None
        self.date_formatter = None
        # Init interpolation stuff
        self.interp: str = "gaussian"
        self.radius: int = 25000  # radius in meters
        self.neighbours: int = 10
        self.filetype, self.mime = utils.get_mimetype(kwargs['format'])
        self.filename: str = utils.get_filename(
            self.plottype,
            dataset_name,
            self.filetype
        )

    def prepare_plot(self):
        # Extract requested data
        self.parse_query(self.query)
        self.load_data()

        return self.data

    # Called by routes_impl.py to parse query, load data, and return the generated file
    # to be displayed by Javascript.
    def run(self):
        _ = self.prepare_plot()

        if self.filetype == 'csv':
            return self.csv()
        elif self.filetype == 'txt':
            if self.format == 'odv':
                return self.odv_ascii()
            elif self.format == 'igoss':
                return self.igoss_ascii()
        else:
            return self.plot()

    # Receives query sent from javascript and parses it.
    @abstractmethod
    def parse_query(self, query: dict):

        self.date_formatter = self.__get_date_formatter(query.get('quantum'))

        self.time = self.__get_time(query.get('time'))
        self.starttime = self.__get_time(query.get('starttime'))
        self.endtime = self.__get_time(query.get('endtime'))

        if query.get('interp') is not None:
            self.interp = query.get('interp')
        if query.get('radius') is not None:
            self.radius = query.get('radius') * 1000  # Convert to meters
        if query.get('neighbours') is not None:
            self.neighbours = query.get('neighbours')

        self.plotTitle = query.get('plotTitle')

        self.scale = self.__get_scale(query.get('scale'))

        self.variables = self.__get_variables(query.get('variable'))

        # Parse right-view if in compare mode
        if query.get("compare_to") is not None:
            self.compare = query.get("compare_to")
            self.compare['variables'] = self.compare['variable'].split(',')

            if self.compare.get('colormap_diff') == 'default':
                self.compare['colormap_diff'] = 'anomaly'

            try:
                # Variable scale
                self.compare['scale'] = self.__get_scale(self.compare['scale'])
            except KeyError:
                print("Ignoring scale attribute.")
            try:
                # Difference plot scale
                self.compare['scale_diff'] = self.__get_scale(
                    self.compare['scale_diff'])
            except KeyError:
                print("Ignoring scale_diff attribute.")

        self.cmap = self.__get_colormap(query.get('colormap'))

        self.linearthresh = self.__get_linear_threshold(
            query.get('linearthresh'))

        self.depth = self.__get_depth(query.get('depth'))

        self.showmap = self.__get_showmap(query.get('showmap'))

    def __get_date_formatter(self, quantum: str):
        """
        Returns the correct lambda to format a date given a quantum.

        Arguments:
            quantum {str} -- Dataset quantum ("hour", "month", "day")

        Returns:
            [lambda] -- Lambda that formats a given date string
        """

        if quantum == 'month':
            return lambda x: format_date(x, "MMMM yyyy")
        elif quantum == 'hour':
            return lambda x: format_datetime(x)
        else:
            return lambda x: format_date(x, "long")

    def __get_scale(self, query_scale: str):
        """
        Splits a given query scale into a list.

        Arguments:
            query_scale {str} -- Comma-separated min/max values for variable data range.

        Returns:
            [list] -- List of min/max values of query_scale
        """

        if query_scale is None or 'auto' in query_scale:
            return None

        return [float(x) for x in query_scale.split(',')]

    def __get_variables(self, variables: str):
        """
        Splits a given variable string into a list.

        Arguments:
            variables {str} -- Comma-separated variable keys

        Returns:
            [list] -- List of varaible keys from variables
        """

        if variables is None:
            variables = ['votemper']

        if isinstance(variables, str) or isinstance(variables, str):
            variables = variables.split(',')

        return [v for v in variables if v != '']

    def __get_time(self, param: str):
        if param is None or len(str(param)) == 0:
            return -1
        else:
            try:
                return int(param)
            except ValueError:
                return param

    def __get_colormap(self, cmap: str):
        if cmap is not None:
            cmap = colormap.colormaps.get(cmap)

        return cmap

    def __get_linear_threshold(self, linearthresh: str):

        if linearthresh is None or linearthresh == '':
            linearthresh = 200
        linearthresh = float(linearthresh)
        if not linearthresh > 0:
            linearthresh = 1

        return linearthresh

    def __get_depth(self, depth: str):

        if depth is None or len(str(depth)) == 0:
            depth = 0

        if isinstance(depth, str) and depth.isdigit():
            depth = int(depth)

        if isinstance(depth, list):
            for i in range(0, len(depth)):
                if isinstance(depth[i], str) and depth[i].isdigit():
                    depth[i] = int(depth[i])

        return depth

    def __get_showmap(self, showmap: str):
        return showmap is None or bool(showmap)

    @abstractmethod
    def load_data(self):
        pass

    def load_misc(self, dataset, variables):
        self.variable_names = self.get_variable_names(dataset, variables)
        self.variable_units = self.get_variable_units(dataset, variables)

    def plot(self, fig=None):

        if fig is None:
            fig = plt.gcf()

        fig.text(1.0, 0.015, self.dataset_config.attribution,
                 ha='right', size='small', va='top')
        if self.compare:
            fig.text(1.0, 0.0, DatasetConfig(self.compare['dataset']).attribution,
                     ha='right', size='small', va='top')

        with contextlib.closing(BytesIO()) as buf:
            plt.savefig(
                buf,
                format=self.filetype,
                dpi='figure',
                bbox_inches='tight',
                pad_inches=0.5
            )
            plt.close(fig)

            buf.seek(0)
            return (buf.getvalue(), self.mime, self.filename)

    def csv(self, header=[], columns=[], data=[]):
        with contextlib.closing(StringIO()) as buf:
            buf.write("\n".join(
                ["// %s: %s" % (h[0], h[1]) for h in header]
            ))
            buf.write("\n")
            buf.write(", ".join(columns))
            buf.write("\n")

            for l in data:
                buf.write(", ".join(map(str, l)))
                buf.write("\n")

            return (buf.getvalue(), self.mime, self.filename)

    def odv_ascii(self, cruise="", variables=[], variable_units=[],
                  station=[], latitude=[], longitude=[], depth=[], time=[],
                  data=[]):
        with contextlib.closing(StringIO()) as buf:
            buf.write("//<CreateTime>%s</CreateTime>\n" % (
                datetime.datetime.now().isoformat()
            ))
            buf.write("//<Software>Ocean Navigator</Software>\n")
            buf.write("\t".join([
                "Cruise",
                "Station",
                "Type",
                "yyyy-mm-ddThh:mm:ss.sss",
                "Longitude [degrees_east]",
                "Latitude [degrees_north]",
                "Depth [m]",
            ] + ["%s [%s]" % x for x in zip(variables, variable_units)]))
            buf.write("\n")

            if len(depth.shape) == 1:
                depth = np.reshape(depth, (depth.shape[0], 1))

            for idx in range(0, len(station)):
                for idx2 in range(0, depth.shape[1]):
                    if idx > 0 or idx2 > 0:
                        cruise = ""

                    if isinstance(data[idx], np.ma.MaskedArray):
                        if len(data.shape) == 3 and \
                           data[idx, :, idx2].mask.all():
                            continue
                        if len(data.shape) == 2 and \
                           np.ma.is_masked(data[idx, idx2]):
                            continue

                    line = [
                        cruise,
                        station[idx],
                        "C",
                        time[idx].isoformat(),
                        "%0.4f" % longitude[idx],
                        "%0.4f" % latitude[idx],
                        "%0.1f" % depth[idx, idx2],
                    ]
                    if len(data.shape) == 1:
                        line.append(str(data[idx]))
                    elif len(data.shape) == 2:
                        line.append(str(data[idx, idx2]))
                    else:
                        line.extend(list(map(str, data[idx, :, idx2])))

                    if idx > 0 and station[idx] == station[idx - 1] or \
                       idx2 > 0:
                        line[1] = ""
                        line[2] = ""
                        line[3] = ""
                        line[4] = ""
                        line[5] = ""

                    buf.write("\t".join(line))
                    buf.write("\n")

            return (buf.getvalue(), self.mime, self.filename)
        
        # Defining igoss_ascii Helper Functions:
    def igoss_ascii_header(self, points, time):       
        latitude  = points[0]
        longitude = points[1]
        time      = time
        if latitude > 0. and longitude > 0. :
            quad_id = 1
        elif latitude < 0. and longitude > 0. :
            quad_id = 3
        elif latitude < 0. and longitude < 0. :
            quad_id = 5
        elif latitude > 0. and longitude < 0. :
            quad_id = 7
        # convert decimal lat lon to deg & min
        lat = int(np.floor(latitude))       
        lat_min = int((latitude-lat)*60)
        lat_string = f'{lat:02.0f}'
        lat_min_string = f'{lat_min:02.0f}'
        lon = int(np.floor(abs(longitude)))
        lon_min = int((abs(longitude)-lon)*60)
        lon_string = f'{lon:03.0f}'
        lon_min_string = f'{lon_min:02.0f}'
        dmy = time.strftime('%d%m%y')[0 : -2 ] + time.strftime('%d%m%y')[-1]
        hm = time.strftime('%H%M/')
        igoss_header = np.asarray(["JJYJ", dmy, hm,
                                (str(quad_id)+str(lat_string) +str (lat_min_string)),
                                (lon_string + str (lon_min_string)), 
                                "88888", "04105" ])
        return igoss_header
    def igoss_ascii_data(self, data, depths):
        data  = data[0]
        depth = depths[0]
        data  = data[~data.mask].data.flatten()       # get temperature data
        depth = depth[~depth.mask].data.flatten()    # get depth data
        # select data for igoss based on rules provided by James Herbert
        # (points should be < 50 m apart with temp change > 2 degrees)
        ig_temp  = np.where(data <= -10, -9.9, data)
        ig_depth = depth[0:(len(ig_temp))]
        igoss_data = []
        depth_div = 100
        for i in range(len(ig_temp)):
            # add divider for 100 m's of depth
            depth_str = f'{ig_depth[i]:03.0f}'.replace('.','')[-2:]
            temp_str  = f'{ig_temp[i]:04.1f}'.replace('.','')[-3:].replace('-','5')[-3:]
            new_div = np.floor(ig_depth[i]/100)
            hundred_separator = lambda x : igoss_data.append('999'+f'{new_div:02.0f}') if(x > depth_div)else None
            hundred_separator(ig_depth[i])
            igoss_data.append(depth_str+temp_str)        
            depth_div = 100*(new_div + 1)
        # add end of data signifiers
        igoss_data.append('00000') 
        igoss_data.append('SHIP')
        igoss_data = np.asarray(igoss_data)
        return igoss_data
    
    def igoss_ascii(self, time, depths, data, points): 

        igoss_data_vector   = []
        for i in range(len(points)):
            igoss_header_helper = self.igoss_ascii_header(points[i], time) ## Calling Igoss Helper Function for header           
            igoss_data_helper   = self.igoss_ascii_data(data[i], depths[i]) ## Calling Igoss Helper Function for data
            igoss_data_block    = np.block([igoss_header_helper, igoss_data_helper])
            n_row = int(np.ceil(len(igoss_data_block)/7))
            if len(igoss_data_block) % 7 == 0 :
                igoss_data_block = np.array(igoss_data_block)
            else:
                igoss_data_block = np.append(np.array(igoss_data_block), np.repeat('',7-(len(igoss_data_block)%7)))
            igoss_data_block = np.reshape(igoss_data_block,(n_row ,7))
            igoss_data_vector.append(igoss_data_block)           
              
        igoss_data_vector = np.asarray(igoss_data_vector)
        print(igoss_data_vector)


        with contextlib.closing(StringIO()) as buf:
            for j in range(len(igoss_data_vector)):
                igoss_data = igoss_data_vector[j]
                num_rows, num_cols= igoss_data.shape
                for i in range(num_rows):
                    buf.write(f'{igoss_data[i][0]} ' + \
                            f'{igoss_data[i][1]} ' + \
                            f'{igoss_data[i][2]} ' + \
                            f'{igoss_data[i][3]} ' + \
                            f'{igoss_data[i][4]} ' + \
                            f'{igoss_data[i][5]} ' + \
                            f'{igoss_data[i][6]}\n')

            return (buf.getvalue(), self.mime, self.filename)

    def get_variable_names(self, dataset, variables: List[str]) -> List[str]:
        """Returns a list of names for the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        names = []

        for _, v in enumerate(variables):
            names.append(
                self.dataset_config.variable[dataset.variables[v]].name)

        return names

    def get_vector_variable_name(self, dataset, variables):
        """Returns a name for the vector version of the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        v = ",".join(variables)
        return self.dataset_config.variable[v].name

    def get_variable_units(self, dataset, variables):
        """Returns a list of units for the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        units = []

        for idx, v in enumerate(variables):
            units.append(
                self.dataset_config.variable[dataset.variables[v]].unit)

        return units

    def get_vector_variable_unit(self, dataset, variables):
        """Returns a unit for the vector version of the variables.

        Parameters:
        dataset -- the dataset
        variables -- a list of strings, each of which is the key for a
                     variable
        """
        v = ",".join(variables)
        return self.dataset_config.variable[v].unit

    def clip_value(self, input_value, variable):
        output = input_value

        if output >= variable.shape[0]:
            output = variable.shape[0] - 1

        if output < 0:
            output = 0

        return output

    def fix_startend_times(self, dataset, starttime, endtime):
        starttime = np.clip(starttime, 0, len(dataset.nc_data.timestamps) - 1)
        endtime = np.clip(endtime, 0, len(dataset.nc_data.timestamps) - 1)

        if starttime > endtime:
            starttime = endtime - 1
            if starttime < 0:
                starttime = 0
                endtime = 2

    def plot_legend(self, figure, labels):
        if len(labels) > 10:
            legend = plt.legend(labels, loc='upper right',
                                bbox_to_anchor=(1, 0, 0.25, 1),
                                borderaxespad=0.,
                                bbox_transform=figure.transFigure,
                                ncol=np.ceil(self.data.shape[0] /
                                             30.0).astype(int))
        elif len(labels) > 1:
            legend = plt.legend(labels, loc='best')
        else:
            legend = None

        if legend:
            for legobj in legend.legendHandles:
                legobj.set_linewidth(4.0)
