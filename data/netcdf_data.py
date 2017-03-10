from netCDF4 import Dataset, netcdftime
from data import Data
from cachetools import TTLCache
import pytz
import numpy as np


class NetCDFData(Data):

    def __init__(self, url):
        self._dataset = None
        self.__timestamp_cache = TTLCache(1, 3600)
        super(NetCDFData, self).__init__(url)

    def __enter__(self):
        self._dataset = Dataset(self.url, 'r')

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._dataset.close()

    @property
    def timestamps(self):
        if self.__timestamp_cache.get("timestamps") is None:
            var = None
            for v in ['time', 'time_counter']:
                if v in self._dataset.variables:
                    var = self._dataset.variables[v]
                    break

            t = netcdftime.utime(var.units)
            timestamps = np.array(
                map(
                    lambda ts: t.num2date(ts).replace(tzinfo=pytz.UTC),
                    var[:]
                )
            )
            timestamps.flags.writeable = False
            self.__timestamp_cache["timestamps"] = timestamps

        return self.__timestamp_cache.get("timestamps")
