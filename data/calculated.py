import xarray as xr
import numpy as np

from data.netcdf_data import NetCDFData
from data.data import Variable, VariableList
import data.calculated_parser.parser


class CalculatedData(NetCDFData):

    def __init__(self, url: str, **kwargs):
        super(CalculatedData, self).__init__(url)
        if 'calculated' in kwargs:
            self._calculated = kwargs['calculated']
        else:
            self._calculated = {}

        self._calculated_variable_list = None

    """
        Returns the value of a given variable name from the dataset
    """
    def get_dataset_variable(self, key: str):
        if key in self._calculated:
            attrs = {}
            if key in super(CalculatedData, self).variables:
                attrs = super(CalculatedData,
                        self).get_dataset_variable(key).attrs

            attrs = {**attrs, **self._calculated[key]}
            return CalculatedArray(self._dataset,
                    self._calculated[key]['equation'], attrs)
        else:
            return self._dataset.variables[key]

    """
        Returns a list of all data variables and their 
        attributes in the dataset.
    """
    @property
    def variables(self):
        if self._calculated_variable_list is None:
            variable_list = super(CalculatedData, self).variables
            temp_list = list(variable_list)

            for name, data in self._calculated.items():
                if name not in variable_list:
                    # New Variable
                    dims = CalculatedArray(self._dataset, data['equation']).dims
                    temp_list.append(
                            Variable(
                                name,
                                get_with_default(data, 'long_name', name),
                                get_with_default(data,'units','1'),
                                dims,
                                get_with_default(data,'valid_min',
                                    np.finfo(np.float64).min),
                                get_with_default(data,'valid_max',
                                    np.finfo(np.float64).max),
                                )
                            )
                else:
                    pass

            self._calculated_variable_list = VariableList(temp_list)

        return self._calculated_variable_list

class CalculatedArray():
    def __init__(self, parent, expression, attrs={}):
        self._parent = parent
        self._expression = expression
        self._parser = data.calculated_parser.parser.Parser()
        self._parser.lexer.lexer.input(expression)
        self._attrs = attrs
        for _ in self._parser.lexer.lexer:
            pass

    def __getitem__(self, key):
        key_dims = ()
        for v in self._parser.lexer.variables:
            if v not in self._parent.variables:
                continue

            if hasattr(self._parent.variables[v], "dims"):
                # xarray calls it dims
                d = self._parent.variables[v].dims
            else:
                d = self._parent.variables[v].dimensions

            if len(d) > len(key_dims):
                key_dims = d
            elif len(d) == len(key_dims):
                if d != key_dims:
                    return np.nan

        data = self._parser.parse(self._expression, self._parent, key, key_dims)
        return xr.DataArray(data)

    @property
    def attrs(self):
        class AttrDict(dict):
            def __init__(self, *args, **kwargs):
                super(AttrDict, self).__init__(*args, **kwargs)
                self.__dict__ = self

        return AttrDict(self._attrs)

    @property
    def shape(self):
        return max(
                map(
                    lambda v: self._parent.variables[v].shape,
                    filter(
                        lambda x: x in self._parent.variables,
                        self._parser.lexer.variables
                        )
                    ),
                key=len
                )

    @property
    def dims(self):
        result = ()

        for v in self._parser.lexer.variables:
            if v not in self._parent.variables:
                continue

            if hasattr(self._parent.variables[v], "dims"):
                # xarray calls it dims
                d = self._parent.variables[v].dims
            else:
                d = self._parent.variables[v].dimensions

            if len(d) > len(result):
                result = d

        return result

def get_with_default(d, key, default):
    try:
        return d[key]
    except KeyError:
        return default

