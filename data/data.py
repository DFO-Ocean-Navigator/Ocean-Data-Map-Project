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

    @abc.abstractproperty
    def depths(self):
        pass

    @abc.abstractproperty
    def variables(self):
        pass

    @abc.abstractmethod
    def get_raw_point(self, latitude, longitude, depth, time, variable):
        pass

    def get_path(self, path, depth, time, variable, numpoints=100, times=None):
        if times is None:
            if hasattr(time, "__len__"):
                times = self.timestamps[time]
            else:
                times = None
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints, times=times)

        result = self.get_point(lat, lon, depth, time, variable)

        return np.array([lat, lon]), distances, times, result

    def get_path_profile(self, path, time, variable, numpoints=100):
        distances, times, lat, lon, bearings = \
            geo.path_to_points(path, numpoints)

        result = self.get_profile(lat, lon, time, variable)

        return np.array([lat, lon]), distances, result.transpose()

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


class Variable(object):

    def __init__(self, key, name, unit, dimensions):
        self._key = key
        self._name = name
        self._unit = unit
        self._dimensions = dimensions

    @property
    def key(self):
        return self._key

    @property
    def name(self):
        return self._name

    @property
    def unit(self):
        return self._unit

    @property
    def dimensions(self):
        return self._dimensions

    def __str__(self):
        return self._key


class VariableList(list):

    def __getitem__(self, pos):
        if isinstance(pos, basestring):
            for v in self:
                if v.key == pos:
                    return v
            raise IndexError("%s not found in variable list" % pos)
        else:
            return super(VariableList, self).__getitem__(pos)

    def __contains__(self, key):
        if isinstance(key, basestring):
            for v in self:
                if v.key == key:
                    return True
            return False
        else:
            return super(VariableList, self).__contains__(key)
