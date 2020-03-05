import abc

import numpy
from scipy.interpolate import interp1d

import data.geo as geo


class Model(metaclass=abc.ABCMeta):
    """Abstract base class for models.
    """

    def __init__(self, nc_data):
        self.nc_data = nc_data

    @property
    @abc.abstractmethod
    def depths(self) -> numpy.ndarray:
        pass

    @abc.abstractmethod
    def get_path(
        self, path, depth, time, variable, numpoints=100, times=None, return_depth=False
    ):
        pass

    @abc.abstractmethod
    def get_point(self, latitude, longitude, depth, time, variable, return_depth=False):
        pass

    @abc.abstractmethod
    def get_profile(self, latitude, longitude, time, variable):
        pass

    @abc.abstractmethod
    def get_raw_point(self, latitude, longitude, depth, time, variable):
        pass

    def get_area(
        self,
        area,
        depth,
        time,
        variable,
        interp,
        radius,
        neighbours,
        return_depth=False,
    ):
        latitude = area[0, :].ravel()
        longitude = area[1, :].ravel()

        self.nc_data.interp = interp
        self.nc_data.radius = radius
        self.nc_data.neighbours = neighbours

        if return_depth:
            a, d = self.get_point(
                latitude, longitude, depth, time, variable, return_depth=return_depth
            )
            return numpy.reshape(a, area.shape[1:]), numpy.reshape(d, area.shape[1:])
        a = self.get_point(
            latitude, longitude, depth, time, variable, return_depth=return_depth
        )
        return numpy.reshape(a, area.shape[1:])

    def get_path_profile(self, path, time, variable, numpoints=100):
        distances, times, lat, lon, bearings = geo.path_to_points(path, numpoints)

        result, depth = self.get_profile(lat, lon, time, variable)

        return numpy.array([lat, lon]), distances, result.transpose(), depth

    def get_profile_depths(self, latitude, longitude, time, variable, depths):
        profile, orig_dep = self.get_profile(latitude, longitude, time, variable)

        if not hasattr(latitude, "__len__"):
            latitude = [latitude]
            profile = [profile]
            orig_dep = [orig_dep]

        depths = numpy.array(depths)
        if len(depths.shape) == 1:
            depths = numpy.tile(depths, (len(latitude), 1))

        output = []
        for i in range(0, len(latitude)):
            f = interp1d(
                orig_dep[i], profile[i], assume_sorted=True, bounds_error=False,
            )
            output.append(f(depths[i]))

        return numpy.ma.masked_invalid(numpy.squeeze(output))

    def get_timeseries_point(
        self,
        latitude,
        longitude,
        depth,
        starttime,
        endtime,
        variable,
        return_depth=False,
    ):
        return self.get_point(
            latitude,
            longitude,
            depth,
            [starttime, endtime],
            variable,
            return_depth=return_depth,
        )

    def get_timeseries_profile(self, latitude, longitude, starttime, endtime, variable):
        return self.get_profile(latitude, longitude, [starttime, endtime], variable)
