from netCDF4 import Dataset, netcdftime
from data.data import Data
import xarray as xr
from cachetools import TTLCache
import pytz
import warnings
import pyresample
import numpy as np

class NetCDFData(Data):

    def __init__(self, url):
        self._dataset = None
        self._variable_list = None
        self.__timestamp_cache = TTLCache(1, 3600)
        self.interp = "gaussian"
        self.radius = 25000
        self.neighbours = 10
        super(NetCDFData, self).__init__(url)

    def __enter__(self):
        # Don't decode times since we do it anyways.
        self._dataset = xr.open_dataset(self.url, decode_times=False)
        
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._dataset.close()
    
    """
        Interpolates data given input and output definitions
        and the selected interpolation algorithm.
    """
    def _interpolate(self, input_def, output_def, data):
        
        # Ignore pyresample warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            warnings.simplefilter("ignore", UserWarning)
            
            # Interpolation with gaussian weighting
            if self.interp == "gaussian":
                return pyresample.kd_tree.resample_gauss(input_def, data,
                    output_def, radius_of_influence=float(self.radius), sigmas=self.radius / 2, fill_value=None,
                    nprocs=8)

            # Bilinear weighting
            elif self.interp == "bilinear":
                """
                    Weight function used to determine the effect of surrounding points
                    on a given point
                """
                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps,
                                np.finfo(r.dtype).max)
                    return 1. / r

                return pyresample.kd_tree.resample_custom(input_def, data,
                    output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                    weight_funcs=weight, nprocs=8)

            # Inverse-square weighting
            elif self.interp == "inverse":
                """
                    Weight function used to determine the effect of surrounding points
                    on a given point
                """
                def weight(r):
                    r = np.clip(r, np.finfo(r.dtype).eps,
                                np.finfo(r.dtype).max)
                    return 1. / r ** 2

                return pyresample.kd_tree.resample_custom(input_def, data,
                    output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                    weight_funcs=weight, nprocs=8)


            # Nearest-neighbour interpolation (junk)
            elif self.interp == "nearest":

                return pyresample.kd_tree.resample_nearest(input_def, data,
                    output_def, radius_of_influence=float(self.radius), nprocs=8)

    """
        Returns the value of a given variable name from the dataset
    """
    def get_dataset_variable(self, key):
        return self._dataset.variables[key]

    """
        Returns the possible names of the time dimension in the dataset
    """
    @property
    def time_variables(self):
        return ['time', 'time_counter', 'Times']

    """
        Loads, caches, and returns the time dimension from a dataset.
    """
    @property
    def timestamps(self):
        # If the timestamp cache is empty
        if self.__timestamp_cache.get("timestamps") is None:
            var = None
            for v in self.time_variables:
                if v in self._dataset.variables.keys():
                    # Get the xarray.DataArray for time variable
                    var = self._dataset.variables[v]
                    break

            # Convert timestamps to UTC
            t = netcdftime.utime(var.attrs['units']) # Get time units from variable
            time_list = list(map(
                                lambda time: t.num2date(time).replace(tzinfo=pytz.UTC),
                                var.values
                            ))
            timestamps = np.array(time_list)
            timestamps.setflags(write=False) # Make immutable
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")
