#!env python
"""
Extracts the bottom layer from a netCDF file and saves it in a new file.

The extracted variables are:
    votemper - Temperature
    vosaline - Salinity
    vozocrtx - Current (x)
    vomecrty - Current (y)
"""
import numpy as np
from netCDF4 import Dataset
import sys

if len(sys.argv) < 3:
    print "Usage: " + sys.argv[0] + " inputfile outputfile"
    exit(1)

infile = sys.argv[1]
outfile = sys.argv[2]

with Dataset(infile, 'r') as src, Dataset(outfile, 'w',
                                          format='NETCDF3_CLASSIC') as dst:
    dst.createDimension('time_counter', None)
    dst.createDimension('y', len(src.dimensions['y']))
    dst.createDimension('x', len(src.dimensions['x']))

    for name in ['votemper', 'vosaline', 'vozocrtx', 'vomecrty']:
        if name not in src.variables:
            continue
        variable = src.variables[name]

        dims = list(variable.dimensions)
        dims.remove('deptht')
        dst.createVariable(name, variable.datatype, dims)
        for attrname in variable.ncattrs():
            if attrname == 'long_name':
                dst.variables[name].setncattr(attrname, "Bottom " +
                                              variable.getncattr(attrname))
            else:
                dst.variables[name].setncattr(attrname,
                                              variable.getncattr(attrname))

        axis = variable.dimensions.index('deptht')
        data = variable[:]

        for shift in range(1, variable.shape[axis] - 1):
            data[data.mask] = np.roll(data, shift, axis)[data.mask]
        bottom = np.rollaxis(data, axis)[variable.shape[axis] - 1, :, :]

        dst.variables[name][:] = bottom[:]
    for name in ['nav_lat', 'nav_lon', 'time_counter']:
        if name not in src.variables:
            continue
        variable = src.variables[name]

        dst.createVariable(name, variable.datatype, variable.dimensions)
        for attrname in variable.ncattrs():
            dst.variables[name].setncattr(attrname,
                                          variable.getncattr(attrname))
        dst.variables[name][:] = variable[:]
