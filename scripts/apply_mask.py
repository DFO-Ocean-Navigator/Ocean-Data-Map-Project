#!env python
"""
Applies the masks from a netCDF file to another and saves it in a new file.

"""
import sys

import numpy as np
from netCDF4 import Dataset

if len(sys.argv) < 4:
    print("Usage: " + sys.argv[0] + " inputfile maskedfile outputfile")
    exit(1)

infile = sys.argv[1]
maskedfile = sys.argv[2]
outfile = sys.argv[3]

with Dataset(infile, 'r') as src, \
    Dataset(maskedfile, 'r') as masked, \
        Dataset(outfile, 'w', format='NETCDF3_CLASSIC') as dst:

    for name, dimension in src.dimensions.items():
        dst.createDimension(
            name,
            len(dimension) if not dimension.isunlimited() else None
        )

    for name, variable in src.variables.items():
        print(name)
        dst.createVariable(name, variable.datatype, variable.dimensions)
        addMask = False
        for attrname in variable.ncattrs():
            dst.variables[name].setncattr(
                attrname,
                variable.getncattr(attrname)
            )
        for attrname in ['missing_value', '_FillValue']:
            if attrname not in masked.variables[name].ncattrs():
                continue
            if attrname in dst.variables[name].ncattrs():
                continue
            dst.variables[name].setncattr(
                attrname,
                masked.variables[name].getncattr(attrname)
            )
            addMask = True

        if addMask:
            print("Adding mask to %s" % name)
            result = np.ma.masked_array(variable[:])
            result.mask = masked.variables[name][0, :].mask
            dst.variables[name][:] = result
        else:
            dst.variables[name][:] = variable[:]
