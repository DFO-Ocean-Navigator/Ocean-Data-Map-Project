import abc

import numpy
from scipy.interpolate import interp1d
import pyresample

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

    def get_path(
        self,
        path,
        depth,
        variable,
        starttime,
        endtime=None,
        numpoints=100,
        times=None,
        return_depth=False,
        tile_time=True
    ):
        if times is None and endtime is not None:
            time_slice = self.nc_data.make_time_slice(starttime, endtime)
            times = self.nc_data.timestamps[time_slice]
        
        distances, t, lat, lon, bearings = \
            geo.path_to_points(path, numpoints, times=times)
        if tile_time:
            times = t

        if return_depth:
            result, dep = self.get_point(lat, lon, depth, variable, starttime, endtime,
                                         return_depth=return_depth)
            return numpy.array([lat, lon]), distances, times, result, dep
        else:
            result = self.get_point(lat, lon, depth, variable, starttime, endtime,
                                    return_depth=return_depth)
            return numpy.array([lat, lon]), distances, times, result

    @abc.abstractmethod
    def get_point(self, latitude, longitude, depth, variable, starttime, endtime=None, return_depth=False):
        pass

    @abc.abstractmethod
    def get_profile(self, latitude, longitude, variable, starttime, endtime=None):
        pass

    @abc.abstractmethod
    def get_raw_point(self, latitude, longitude, depth, time, variable):
        pass

    def _make_resample_data(self, lat_in, lon_in, lat_out, lon_out, data):
        """
        Note: `data` must be of shape (time, lat, lon) OR (time, depth, lat, lon).
        """

        if len(data.shape) == 4:
            origshape = data.shape
            # collapse time and depth axes (positions 0 and 1)
            data = data.reshape((
                origshape[0] * origshape[1],# combine time + depth
                origshape[2],               # lat
                origshape[3],               # lon
            ))
        if len(data.shape) == 3:
            # move lat and lon axes (normally the last two axes)
            # into the first and second axis positions.
            # Before: (..., lat, lon)
            # After: (lat, lon, ...)
            data = numpy.rollaxis(data, 0, 3)

        data = numpy.ma.masked_invalid(data[:])

        lon_in, lat_in = pyresample.utils.check_and_wrap(lon_in, lat_in)

        masked_lon_in = numpy.ma.array(lon_in)
        masked_lat_in = numpy.ma.array(lat_in)

        output_def = pyresample.geometry.SwathDefinition(
            lons=numpy.ma.array(lon_out),
            lats=numpy.ma.array(lat_out)
        )

        return data, masked_lat_in, masked_lon_in, output_def

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
                latitude, longitude, depth, variable, time, return_depth=return_depth
            )
            return numpy.reshape(a, area.shape[1:]), numpy.reshape(d, area.shape[1:])
        a = self.get_point(
            latitude, longitude, depth, variable, time, return_depth=return_depth
        )
        return numpy.reshape(a, area.shape[1:])

    def get_path_profile(self, path, variable, starttime, endtime=None, numpoints=100):
        distances, times, lat, lon, bearings = geo.path_to_points(path, numpoints)

        result, depth = self.get_profile(lat, lon, variable, starttime,
                                         endtime=endtime)

        return numpy.array([lat, lon]), distances, result.transpose(), depth

    def get_profile_depths(self, latitude, longitude, time, variable, depths):
        profile, orig_dep = self.get_profile(latitude, longitude, variable, time)

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
            variable,
            starttime,
            endtime,
            return_depth=return_depth,
        )

    def get_timeseries_profile(self, latitude, longitude, starttime, endtime, variable):
        return self.get_profile(latitude, longitude, variable, starttime, endtime)
