import abc
from typing import List

from data.variable_list import VariableList


class Data(metaclass=abc.ABCMeta):
    """ Abstract base class for data access.
    """

    def __init__(self, url: str) -> None:
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

    @property
    @abc.abstractmethod
    def dimensions(self) -> List[str]:
        pass

    @abc.abstractmethod
    def timestamp_to_iso_8601(self, timestamp):
        pass

    @property
    @abc.abstractmethod
    def timestamps(self):
        pass

    @property
    @abc.abstractmethod
    def variables(self) -> VariableList:
        pass

    @property
    @abc.abstractmethod
    def depth_dimensions(self) -> List[str]:
        pass
