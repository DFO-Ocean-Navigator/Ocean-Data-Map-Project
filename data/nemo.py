from pykdtree.kdtree import KDTree
import pyresample
import numpy as np
import warnings
from data.netcdf_data import NetCDFData
from pint import UnitRegistry
from data.data import Variable, VariableList
from oceannavigator.nearest_grid_point import find_nearest_grid_point
import re

class Nemo(NetCDFData):
    __depths = None

    def __init__(self, url):
        super(Nemo, self).__init__(url)

    def __enter__(self):
        super(Nemo, self).__enter__()

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        super(Nemo, self).__exit__(exc_type, exc_value, traceback)

    """
        Returns the possible names of the depth dimension in the dataset
    """
    @property
    def depth_dimensions(self):
        return ['depth', 'deptht']

    """
        Finds, caches, and returns the valid depths for the dataset.
    """
    @property
    def depths(self):
        if self.__depths is None:
            var = None
            # Look through possible dimension names
            for v in self.depth_dimensions:
                # Depth is usually a "coordinate" variable
                if v in list(self._dataset.coords.keys()):
                    # Get DataArray for depth
                    var = self._dataset.variables[v]
                    break

            ureg = UnitRegistry()
            unit = ureg.parse_units(var.attrs['units'].lower())
            self.__depths = ureg.Quantity(
                var.values, unit
            ).to(ureg.meters).magnitude
            self.__depths.setflags(write=False) # Make immutable

        return self.__depths

    """
        Returns a list of all data variables and their 
        attributes in the dataset.
    """
    @property
    def variables(self):
        l = []
        # Get "data variables" from dataset
        variables = list(self._dataset.data_vars.keys())

        for name in variables:
            # Get variable DataArray
            # http://xarray.pydata.org/en/stable/api.html#dataarray
            var = self._dataset.variables[name]

            # Get variable attributes
            attrs = list(var.attrs.keys())
            
            if 'long_name' in attrs:
                long_name = var.attrs['long_name']
            else:
                long_name = name

            if 'units' in attrs:
                units = var.attrs['units']
            else:
                units = None

            if 'valid_min' in attrs:
                valid_min = float(re.sub(r"[^0-9\.\+,eE]", "",
                                         str(var.attrs['valid_min'])))
                valid_max = float(re.sub(r"[^0-9\,\+,eE]", "",
                                         str(var.attrs['valid_max'])))
            else:
                valid_min = None
                valid_max = None

            # Add to our "Variable" wrapper
            l.append(Variable(name, long_name, units, var.dims,
                              valid_min, valid_max))

        return VariableList(l)

    """
        Computes and returns points bounding lat, lon.
    """
    def __bounding_box(self, lat, lon, latvar, lonvar, n=10):

        y, x, d = find_nearest_grid_point(lat, lon, self._dataset, latvar, lonvar, n)

        def fix_limits(data, limit):
            mx = np.amax(data)
            mn = np.amin(data)
            d = mx - mn

            if d < 2:
                mn -= 2
                mx += 2

            mn = int(mn - d / 4.0)
            mx = int(mx + d / 4.0)

            mn = np.clip(mn, 0, limit)
            mx = np.clip(mx, 0, limit)

            return mn, mx

        miny, maxy = fix_limits(y, latvar.shape[0])
        minx, maxx = fix_limits(x, latvar.shape[1])

        return miny, maxy, minx, maxx, np.clip(np.amax(d), 5000, 50000)
    
    def __resample(self, lat_in, lon_in, lat_out, lon_out, var):
        if len(var.shape) == 3:
            var = np.rollaxis(var, 0, 3)
        elif len(var.shape) == 4:
            var = np.rollaxis(var, 0, 4)
            var = np.rollaxis(var, 0, 4)

        origshape = var.shape
        var = var.reshape([var.shape[0], var.shape[1], -1])

        data = var[:]

        masked_lon_in = np.ma.array(lon_in)
        masked_lat_in = np.ma.array(lat_in)

        output_def = pyresample.geometry.SwathDefinition(
            lons=np.ma.array(lon_out),
            lats=np.ma.array(lat_out)
        )

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)

            if len(data.shape) == 3:
                output = []
                # multiple depths
                for d in range(0, data.shape[2]):
                    masked_lon_in.mask = masked_lat_in.mask = \
                        data[:, :, d].view(np.ma.MaskedArray).mask

                    input_def = pyresample.geometry.SwathDefinition(
                        lons=masked_lon_in,
                        lats=masked_lat_in,
                        nprocs = 4
                    )
                  
                    # Interpolation with gaussian weighting
                    if self.interp == "gaussian":
                        
                        test = pyresample.kd_tree.resample_gauss(input_def, data[:, :, d],
                            output_def, radius_of_influence=float(self.radius), sigmas=self.radius / 2, fill_value=None,
                            nprocs=8)

                        output.append(test)

                    # Bilinear weighting
                    elif self.interp == "bilinear":
                        """
                            Weight function used to determine the effect of surrounding points
                            on a given point
                        """
                        def weight(r):
                            r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                            return 1. / r
                        
                        output.append(pyresample.kd_tree.resample_custom(input_def, data[:, :, d],
                            output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                            weight_funcs=weight, nprocs=8))

                    # Inverse-square weighting
                    elif self.interp == "inverse":
                        """
                            Weight function used to determine the effect of surrounding points
                            on a given point
                        """
                        def weight(r):
                            r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                            return 1. / r ** 2
                        
                        output.append(pyresample.kd_tree.resample_custom(input_def, data[:, :, d],
                            output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                            weight_funcs=weight, nprocs=8))
                    
                    # Nearest-neighbour interpolation (junk)
                    elif self.interp == "nearest":
                        
                        output.append(pyresample.kd_tree.resample_nearest(input_def, data[:, :, d],
                            output_def, radius_of_influence=float(self.radius), nprocs=8))

                output = np.ma.array(output).transpose()
            else:
                masked_lon_in.mask = masked_lat_in.mask = \
                    var[:].view(np.ma.MaskedArray).mask
                input_def = pyresample.geometry.SwathDefinition(
                    lons=masked_lon_in,
                    lats=masked_lat_in
                )

                # Interpolation with gaussian weighting
                if self.interp == "gaussian":
                    
                    output = pyresample.kd_tree.resample_gauss(input_def, data[:, :, d],
                        output_def, radius_of_influence=float(self.radius), sigmas=self.radius / 2, fill_value=None,
                        nprocs=8)
                
                # Bilineaer weighting
                elif self.interp == "bilinear":
                    """
                        Weight function used to determine the effect of surrounding points
                        on a given point
                    """
                    def weight(r):
                        r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                        return 1. / r
                    
                    output = pyresample.kd_tree.resample_custom(input_def, data[:, :, d],
                                output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                                weight_funcs=weight, nprocs=8)

                # Inverse-square weighting
                elif self.interp == "inverse":
                    """
                        Weight function used to determine the effect of surrounding points
                        on a given point
                    """
                    def weight(r):
                        r = np.clip(r, np.finfo(r.dtype).eps, np.finfo(r.dtype).max)
                        return 1. / r ** 2

                    output = pyresample.kd_tree.resample_custom(input_def, data[:, :, d],
                            output_def, radius_of_influence=float(self.radius), neighbours=self.neighbours, fill_value=None,
                            weight_funcs=weight, nprocs=8)
                
                # Nearest-neighbour interpolation (junk)
                elif self.interp == "nearest":
                    
                    output = pyresample.kd_tree.resample_nearest(input_def, data[:, :, d], 
                                output_def, radius_of_influence=float(self.radius), nprocs=8)

        if len(origshape) == 4:
            output = output.reshape(origshape[2:])

        return np.squeeze(output)

    """
        Returns the xarray.DataArray for latitude and longitude variables in the dataset.
    """
    def __latlon_vars(self, variable):
        # Get DataArray
        var = self._dataset.variables[variable]

        # Get variable attributes
        attrs = list(var.attrs.keys())

        pairs = [
            ['nav_lat_u', 'nav_lon_u'],
            ['nav_lat_v', 'nav_lon_v'],
            ['nav_lat', 'nav_lon'],
            ['latitude_u', 'longitude_u'],
            ['latitude_v', 'longitude_v'],
            ['latitude', 'longitude'],
        ]

        if 'coordinates' in attrs:
            coordinates = var.attrs['coordinates'].split()
            for p in pairs:
                if p[0] in coordinates:
                    return (
                        self._dataset.variables[p[0]],
                        self._dataset.variables[p[1]] # Check this
                    )
        else:
            for p in pairs:
                if p[0] in self._dataset.variables:
                    return (
                        self._dataset.variables[p[0]],
                        self._dataset.variables[p[1]]
                    )

        raise LookupError("Cannot find latitude & longitude variables")

    def get_raw_point(self, latitude, longitude, depth, time, variable):
        latvar, lonvar = self.__latlon_vars(variable)
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]

        if depth == 'bottom':
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = d.reshape([d.shape[0], -1])

            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            if hasattr(time, "__len__"):
                data_in = var[time, :, miny:maxy, minx:maxx]
                data_in = data_in.reshape(
                    [data_in.shape[0], data_in.shape[1], -1])
                data = []
                for i, t in enumerate(time):
                    data.append(data_in[i, depths, indices])
                data = np.ma.array(data).reshape([len(time), d.shape[-2],
                                                  d.shape[-1]])
            else:
                data = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                         mask=True,
                                         dtype=d.dtype)
                data[np.unravel_index(indices, data.shape)] = \
                    reshaped[depths, indices]
        else:
            if len(var.shape) == 4:
                data = var[time, depth, miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]

        return (
            latvar[miny:maxy, minx:maxx],
            lonvar[miny:maxy, minx:maxx],
            data
        )

    def get_point(self, latitude, longitude, depth, time, variable,
                  return_depth=False):
        latvar, lonvar = self.__latlon_vars(variable)

        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        # Get xarray.Variable
        var = self._dataset.variables[variable]

        if depth == 'bottom':
            
            if hasattr(time, "__len__"):
                d = var[time[0], :, miny:maxy, minx:maxx]
            else:
                d = var[time, :, miny:maxy, minx:maxx]

            reshaped = d.values.reshape([d.shape[0], -1])

            edges = np.array(np.ma.notmasked_edges(reshaped, axis=0))
            depths = edges[1, 0, :]
            indices = edges[1, 1, :]

            if hasattr(time, "__len__"):
                data_in = var[time, :, miny:maxy, minx:maxx]
                data_in = data_in.values.reshape(
                    [data_in.shape[0], data_in.shape[1], -1])
                data = []
                for i, t in enumerate(time):
                    di = np.ma.MaskedArray(np.zeros(data_in.shape[-1]),
                                           mask=True,
                                           dtype=data_in.dtype)
                    di[indices] = data_in[i, depths, indices]
                    data.append(di)
                data = np.ma.array(data).reshape([len(time), d.shape[-2],
                                                  d.shape[-1]])
            else:
                data = np.ma.MaskedArray(np.zeros(d.shape[1:]),
                                         mask=True,
                                         dtype=d.dtype)
                data[np.unravel_index(indices, data.shape)] = \
                    reshaped[depths, indices]

            res = self.__resample(
                latvar[miny:maxy, minx:maxx],
                lonvar[miny:maxy, minx:maxx],
                latitude, longitude,
                data,
            )

            if return_depth:
                d = self.depths[depths]
                d = np.zeros(data.shape)
                d[np.unravel_index(indices, d.shape)] = self.depths[depths]

                dep = self.__resample(
                    latvar[miny:maxy, minx:maxx],
                    lonvar[miny:maxy, minx:maxx],
                    latitude, longitude,
                    np.reshape(d, data.shape),
                )

        else:
            if len(var.shape) == 4:
                data = var[time, int(depth), miny:maxy, minx:maxx]
            else:
                data = var[time, miny:maxy, minx:maxx]
            
            res = self.__resample(
                latvar[miny:maxy, minx:maxx],
                lonvar[miny:maxy, minx:maxx],
                latitude, longitude,
                data.values,
            )

            if return_depth:
                dep = self.depths[depth]
                dep = np.tile(dep, len(latitude))
                if hasattr(time, "__len__"):
                    dep = np.array([dep] * len(time))

        if return_depth:
            return res, dep
        else:
            return res

    def get_profile(self, latitude, longitude, time, variable):
        latvar, lonvar = self.__latlon_vars(variable)
        
        miny, maxy, minx, maxx, radius = self.__bounding_box(
            latitude, longitude, latvar, lonvar, 10)

        if not hasattr(latitude, "__len__"):
            latitude = np.array([latitude])
            longitude = np.array([longitude])

        var = self._dataset.variables[variable]
        res = self.__resample(
            latvar[miny:maxy, minx:maxx],
            lonvar[miny:maxy, minx:maxx],
            [latitude], [longitude],
            var[time, :, miny:maxy, minx:maxx],
        )

        return res, np.squeeze([self.depths] * len(latitude))
