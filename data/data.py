import abc
import numpy as np
import geo

__author__ = 'Geoff Holden'


class Data(object):

    """Abstract base class for data access"""
    __metaclass__ = abc.ABCMeta

    def __init__(self, url):
        self.url = url

    @abc.abstractmethod
    def __enter__(self):
        pass

    @abc.abstractmethod
    def __exit__(self, exc_type, exc_value, traceback):
        pass

    @abc.abstractmethod
    def get_point(self, latitude, longitude, depth, time, variable):
        pass

    @abc.abstractmethod
    def get_profile(self, latitude, longitude, time, variable):
        pass

    @abc.abstractproperty
    def timestamps(self):
        pass

    def get_path(self, path, depth, time, variable, numpoints=100):
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints)

        result = self.get_point(lat, lon, depth, time, variable)

        return result

    def get_path_profile(self, path, time, variable, numpoints=100):
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints)

        result = self.get_profile(lat, lon, time, variable)

        return result

    def get_area(self, area, depth, time, variable):
        latitude = area[0, :].ravel()
        longitude = area[1, :].ravel()

        a = self.get_point(latitude, longitude, depth, time, variable)
        return np.reshape(a, area.shape[1:])

    def get_timeseries_point(self, latitude, longitude, depth, starttime,
                             endtime, variable):
        return self.get_point(latitude, longitude, depth,
                              range(starttime, endtime + 1),
                              variable)

    def get_timeseries_profile(self, latitude, longitude, starttime,
                               endtime, variable):
        return self.get_profile(latitude, longitude,
                                range(starttime, endtime + 1),
                                variable)
