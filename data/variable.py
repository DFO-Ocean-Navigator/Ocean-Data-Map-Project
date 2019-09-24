#!/usr/bin/env python


class Variable(object):
    """
    Wrapper around a netCDF variable.
    Provides a common interface between dataset types (xarray vs netCDF4).
    """

    __depth_dims = {'depth', 'deptht', 'z'}

    def __init__(self, key, name, unit, dimensions, valid_min=None,
                 valid_max=None):
        self._key: str = key
        self._name: str = name
        self._unit: str = unit
        self._dimensions: tuple = dimensions
        self._valid_min: [int, float] = valid_min
        self._valid_max: [int, float] = valid_max

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

    @property
    def valid_min(self):
        return self._valid_min

    @property
    def valid_max(self):
        return self._valid_max

    def has_depth(self):
        """Checks if this variable has depth (i.e. is 3D).

        Returns:
            [bool] -- If variable has depth.
        """
        return self.__depth_dims & set(self.dimensions)

    def is_surface_only(self):
        return not self.has_depth()

    def __str__(self):
        return self._key

    def __repr__(self):
        return "Variable(%s, %s, %s, %s, %s, %s)" % (
            self._key,
            self._name,
            self._unit,
            self._dimensions,
            self._valid_min,
            self._valid_max,
        )
