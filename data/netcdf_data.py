from netCDF4 import Dataset
from data import Data


class NetCDFData(Data):
    _dataset = None

    def __enter__(self):
        self._dataset = Dataset(self.url, 'r')

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self._dataset.close()
