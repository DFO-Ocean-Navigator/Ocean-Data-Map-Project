import abc

import numpy as np
from scipy.interpolate import interp1d

import data.geo as geo

__author__ = 'Geoff Holden'

"""
    Abstract base class for data access
"""


class Data(object, metaclass=abc.ABCMeta):

    def __init__(self, url: str):
        self.url: str = url
        self.interp: str = "gaussian"
        self.radius: int = 25000  # radius in meters
        self.neighbours: int = 10

    @abc.abstractmethod
    def __enter__(self):
        pass

    @abc.abstractmethod
    def __exit__(self, exc_type, exc_value, traceback):
        pass

    @abc.abstractmethod
    def get_point(self, latitude, longitude, depth, time, variable,
                  return_depth=False):
        pass

    @abc.abstractmethod
    def get_profile(self, latitude, longitude, time, variable):
        pass

    @abc.abstractmethod
    def timestamp_to_iso_8601(self, timestamp):
        pass

    @abc.abstractproperty
    def timestamps(self):
        pass

    @abc.abstractproperty
    def depths(self):
        pass

    @abc.abstractproperty
    def variables(self):
        pass

    @abc.abstractproperty
    def depth_dimensions(self):
        pass

    @abc.abstractmethod
    def get_raw_point(self, latitude, longitude, depth, time, variable):
        pass

    def get_profile_depths(self, latitude, longitude, time, variable, depths):
        profile, orig_dep = self.get_profile(
            latitude, longitude, time, variable
        )

        if not hasattr(latitude, "__len__"):
            latitude = [latitude]
            longitude = [longitude]
            profile = [profile]
            orig_dep = [orig_dep]

        depths = np.array(depths)
        if len(depths.shape) == 1:
            depths = np.tile(depths, (len(latitude), 1))

        output = []
        for i in range(0, len(latitude)):
            f = interp1d(
                orig_dep[i],
                profile[i],
                assume_sorted=True,
                bounds_error=False,
            )
            output.append(f(depths[i]))

        return np.ma.masked_invalid(np.squeeze(output))

    def get_path(self, path, depth, time, variable, numpoints=100, times=None,
                 return_depth=False):
        if times is None:
            if hasattr(time, "__len__"):
                times = self.timestamp_to_iso_8601(time)
            else:
                times = None
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints, times=times)

        if return_depth:
            result, dep = self.get_point(lat, lon, depth, time, variable,
                                         return_depth=return_depth)
            return np.array([lat, lon]), distances, times, result, dep
        else:
            result = self.get_point(lat, lon, depth, time, variable,
                                    return_depth=return_depth)
            return np.array([lat, lon]), distances, times, result

    def get_path_profile(self, path, time, variable, numpoints=100):
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints)

        result, depth = self.get_profile(lat, lon, time, variable)

        return np.array([lat, lon]), distances, result.transpose(), depth

    def get_area(self, area, depth, time, variable, interp, radius, neighbours, return_depth=False):
        latitude = area[0, :].ravel()
        longitude = area[1, :].ravel()

        self.interp = interp
        self.radius = radius
        self.neighbours = neighbours

        if return_depth:
            a, d = self.get_point(latitude, longitude, depth, time, variable,
                                  return_depth=return_depth)
            return np.reshape(a, area.shape[1:]), np.reshape(d, area.shape[1:])
        else:
            a = self.get_point(latitude, longitude, depth, time, variable,
                               return_depth=return_depth)
                               
            return np.reshape(a, area.shape[1:])

    def get_timeseries_point(self, latitude, longitude, depth, starttime,
                             endtime, variable, return_depth=False):
        return self.get_point(latitude, longitude, depth,
                              list(range(starttime, endtime + 1)),
                              variable, return_depth=return_depth)

    def get_timeseries_profile(self, latitude, longitude, starttime,
                               endtime, variable):
        return self.get_profile(latitude, longitude,
                                list(range(starttime, endtime + 1)),
                                variable)
