import datetime
import re
from textwrap import wrap

import numpy as np

from data import open_dataset
from plotting.point import PointPlotter

LINEAR = 200


class TimeseriesPlotter(PointPlotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "timeseries"
        super(TimeseriesPlotter, self).__init__(dataset_name, query, **kwargs)
        self.size: str = '11x5'

    def parse_query(self, query):
        super(TimeseriesPlotter, self).parse_query(query)

        qdepth = query.get('depth')
        if isinstance(qdepth, list):
            qdepth = qdepth[0]
        depth = qdepth

        if qdepth and hasattr(qdepth, "__len__") and len(qdepth) > 0:
            if qdepth == 'all':
                depth = 'all'
            elif qdepth == 'bottom':
                depth = 'bottom'
            else:
                depth = int(qdepth)

        self.depth = depth

    def load_data(self):
        
        with open_dataset(self.dataset_config, variable=self.variables, timestamp=self.starttime, endtime=self.endtime) as dataset:
            self.load_misc(dataset, self.variables)

            variable = self.variables[0]

            self.variable_unit = self.dataset_config.variable[
                dataset.variables[variable]
            ].unit
            self.variable_name = self.dataset_config.variable[
                dataset.variables[variable]
            ].name
            
            if self.depth != 'all' and self.depth != 'bottom' and \
                (set(dataset.variables[variable].dimensions) &
                    set(dataset.nc_data.depth_dimensions)):
                self.depth_label = " at %d m" % (
                    np.round(dataset.depths[self.depth])
                )

            elif self.depth == 'bottom':
                self.depth_label = ' at Bottom'
            else:
                self.depth_label = ''

            # Override depth request if requested variable has no depth (i.e. surface only)
            if not (set(dataset.variables[variable].dimensions) &
                    set(dataset.nc_data.depth_dimensions)):
                self.depth = 0

            point_data = []
            depths = []
            for p in self.points:
                data = []
                if self.depth == 'all':
                    d, depths = dataset.get_timeseries_profile(
                        float(p[0]),
                        float(p[1]),
                        self.starttime,
                        self.endtime,
                        variable
                    )
                else:
                    d, depths = dataset.get_timeseries_point(
                        float(p[0]),
                        float(p[1]),
                        self.depth,
                        self.starttime,
                        self.endtime,
                        variable,
                        return_depth=True
                    )
                data.append(d)
                point_data.append(np.ma.array(data))

            point_data = np.ma.array(point_data)

            starttime_idx = dataset.nc_data.timestamp_to_time_index(self.starttime)
            endtime_idx = dataset.nc_data.timestamp_to_time_index(self.endtime)
            times = dataset.nc_data.timestamps[starttime_idx: endtime_idx + 1]
            if self.query.get('dataset_quantum') == 'month':
                times = [datetime.date(x.year, x.month, 1) for x in times]
            
            if 'mag' in variable and self.depth != 'all':
                # Under the current API this indicates that velocity data is being
                # loaded. Save each velocity vectorcomponent (X and Y) for possible 
                # CSV export later. Currently, we only provide velocity components 
                # for a single depth. 

                vector_variables = [
                    self.dataset_config.vector_variables[variable]['east_vector_component'],
                    self.dataset_config.vector_variables[variable]['north_vector_component']
                ]

                self.vector_variable_names = self.get_variable_names(dataset, vector_variables)
                self.vector_variable_units = self.get_variable_units(dataset, vector_variables)
                                
                d = []
                vector_point_data = []
                for vv in vector_variables:
                    for p in self.points:
                        vector_data = []
                        
                        d, _ = dataset.get_timeseries_point(
                            float(p[0]),
                            float(p[1]),
                            self.depth,
                            self.starttime,
                            self.endtime,
                            vv,
                            return_depth=True
                        )
                    
                    vector_data.append(d)
                    vector_point_data.append(np.ma.array(vector_data))
                
                self.quiver_data = vector_point_data

            self.times = times
            self.data = np.ma.compressed(point_data)
            self.depths = depths
            self.depth_unit = "m"

    def csv(self):
        header = [
            ['Dataset', self.dataset_config.name],
            ['Attribution', self.dataset_config.attribution]
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Time",
        ]
        
        # Check to see if the quiver attribute is present. If so the CSV export will 
        # also include X and Y velocity components (pulled from the quiver_data attribute) 
        # and bearing information (to be calculated below).
        has_quiver = hasattr(self, 'quiver_data')

        if self.depth != 'all':
            if isinstance(self.depth, str):
                header.append(["Depth", self.depth])
            else:
                header.append(
                    ["Depth", "%.4f%s" % (self.depth,
                                        self.depth_unit)]
                )

            columns.append("%s (%s)" % (self.variable_name,
                                        self.variable_unit))
            if has_quiver:
                columns.extend([
                    "%s (%s)" % (self.vector_variable_names[0],
                                 self.vector_variable_units[0]),
                    "%s (%s)" % (self.vector_variable_names[1],
                                 self.vector_variable_units[1]),
                    "Bearing (degrees clockwise positive from North)"
                ])
        else:
            max_dep_idx = np.where(~self.data[:, 0, 0, :].mask)[1].max()
            if not has_quiver:
                header.append(["Variable", "%s (%s)" % (self.variable_name,
                                                        self.variable_unit)])
                for dep in self.depths[:max_dep_idx + 1]:
                    columns.append("%d%s" % (np.round(dep), self.depth_unit))
            else:
                header_text = "%s (%s) %s (%s) %s (%s) %s" % (
                    self.variable_name, self.variable_unit,
                    self.vector_variable_names[0], self.vector_variable_units[0],
                    self.vector_variable_names[1], self.vector_variable_units[1],
                    "Bearing (degrees clockwise positive from North)"
                )
                header.append(["Variables", header_text])
                for var_name in [self.variable_name, 
                                 *self.vector_variable_names, 
                                 "Bearing"]:
                    for dep in self.depths[:max_dep_idx + 1]:
                        columns.append(
                            "%s at %d%s" % (
                                var_name, np.round(dep), self.depth_unit
                            )
                        )

        if has_quiver:
            # Calculate bearings.
            bearing = np.arctan2(self.quiver_data[1][:],
                                 self.quiver_data[0][:])
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi
            # Deal with undefined angles (where velocity is 0 or very close)
            inds = np.where(
                np.logical_and(
                    np.abs(self.quiver_data[1]) < 10e-6,
                    np.abs(self.quiver_data[0]) < 10e-6
                )
            )
            bearing[inds] = np.nan

        data = []

        # For each point
        for p in range(0, self.data.shape[0]):
            # For each time
            for t in range(0, self.data.shape[2]):
                entry = [
                    "%0.4f" % self.points[p][0],
                    "%0.4f" % self.points[p][1],
                    self.times[t].isoformat(),
                ]
                if self.depth == 'all':
                    entry.extend(
                        ["%0.3f" % f for f in self.data[p, 0, t, :max_dep_idx + 1]])
                    if has_quiver:
                        entry.extend(
                            ["%0.3f" % f for f in self.quiver_data[0][p, t, :max_dep_idx + 1]])
                        entry.extend(
                            ["%0.3f" % f for f in self.quiver_data[1][p, t, :max_dep_idx + 1]])
                        entry.extend(
                            ["%0.3f" % f for f in bearing[p, t, :max_dep_idx + 1]])
                else:
                    entry.append("%0.3f" % self.data[p, 0, t])
                    if has_quiver:
                        entry.extend([
                            "%0.3f" % self.quiver_data[0][p, t],
                            "%0.3f" % self.quiver_data[1][p, t],
                            "%0.3f" % bearing[p, t]
                        ])
                data.append(entry)

        d = np.array(data)
        d[np.where(d == 'nan')] = ''
        data = d.tolist()

        return super(TimeseriesPlotter, self).csv(header, columns, data)
