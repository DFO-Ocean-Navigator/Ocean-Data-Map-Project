from netCDF4 import Dataset, netcdftime
from data.data import Data
import xarray as xr
from cachetools import TTLCache
import pytz
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
