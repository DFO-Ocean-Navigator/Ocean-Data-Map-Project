'''
Reads in NAFC p-files and outputs a NetCDF file using the CF conventions,
with the data interpolated to standard depths.
'''
import sys

from netCDF4 import Dataset, date2num
from pfile import PFile
from scipy.interpolate import interp1d

STANDARD_DEPTHS = [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45,
    50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
    100, 125, 150, 175, 200, 225, 250, 275, 300, 325,
    350, 375, 400, 425, 450, 475, 500, 550, 600, 650,
    700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150,
    1200, 1250, 1300, 1350, 1400, 1450, 1500, 1550, 1600, 1650,
    1700, 1750, 1800, 1850, 1900, 1950, 2000, 2100, 2200, 2300,
    2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300,
    3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300,
    4400, 4500, 4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300,
    5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300,
    6400, 6500, 6600, 6700, 6800, 6900, 7000, 7100, 7200, 7300,
    7400, 7500, 7600, 7700, 7800, 7900, 8000, 8100, 8200, 8300,
    8400, 8500, 8600, 8700, 8800, 8900, 9000,
]

infiles = sys.argv[2:]
outfile = sys.argv[1]

with Dataset(outfile, "w", format='NETCDF4') as ds:
    ds.Conventions = "CF-1.6"
    ds.Metadata_Conventions = "Unidata Dataset Discovery v1.0"
    ds.featureType = "profile"
    ds.cdm_data_type = "Profile"
    ds.nodc_template_version = "NODC_NetCDF_Profile_Orthogonal_Template_v1.1"

    ds.createDimension('z', len(STANDARD_DEPTHS))
    ds.createDimension('profile', None)

    profile_var = ds.createVariable('profile', str, ('profile',))
    profile_var.long_name = "Unique identifier for each feature instance"
    profile_var.cf_role = "profile_id"

    ship_var = ds.createVariable('ship', str, ('profile',))
    ship_var.long_name = "Vessel"
    trip_var = ds.createVariable('trip', str, ('profile',))
    trip_var.long_name = "Trip Number"
    cast_var = ds.createVariable('cast', str, ('profile',))
    cast_var.long_name = "Cast Identifier"

    z_var = ds.createVariable('z', 'i4', ('z',))
    z_var[:] = STANDARD_DEPTHS
    z_var.long_name = "Depth"
    z_var.standard_name = "depth"
    z_var.units = "meter"
    z_var.axis = "Z"
    z_var.positive = "down"
    z_var.valid_min = 0
    z_var.valid_max = 9000

    time_var = ds.createVariable('time', 'f4', ('profile',))
    time_var.long_name = "Profile Time"
    time_var.standard_name = "time"
    time_var.units = "seconds since 1950-01-01 00:00:00"
    time_var.axis = "T"

    lat_var = ds.createVariable('lat', 'f4', ('profile',))
    lat_var.long_name = "Latitude"
    lat_var.standard_name = "latitude"
    lat_var.units = "degrees_north"
    lat_var.axis = "Y"
    lat_var.valid_min = 0.
    lat_var.valid_max = 90.

    lon_var = ds.createVariable('lon', 'f4', ('profile',))
    lon_var.long_name = "Longitude"
    lon_var.standard_name = "longitude"
    lon_var.units = "degrees_east"
    lon_var.axis = "X"
    lon_var.valid_min = -360.
    lon_var.valid_max = 360.

    # Temperature
    temp_var = ds.createVariable('temperature', 'f4', ('profile', 'z',),
                                 fill_value=-99.)
    temp_var.long_name = "Temperature"
    temp_var.standard_name = "sea_water_temperature"
    temp_var.units = "degree_Celsius"
    temp_var.coordinates = "time lat lon z"

    # Salinity
    sal_var = ds.createVariable('salinity', 'f4', ('profile', 'z',),
                                fill_value=-99.)
    sal_var.long_name = "Salinity"
    sal_var.standard_name = "sea_water_salinity"
    sal_var.units = "PSU"
    sal_var.coordinates = "time lat lon z"

    # Conductivity
    cond_var = ds.createVariable('conductivity', 'f4', ('profile', 'z',),
                                 fill_value=-99.)
    cond_var.long_name = "Conductivity"
    cond_var.standard_name = "sea_water_electrical_conductivity"
    cond_var.units = "S m-1"
    cond_var.coordinates = "time lat lon z"

    # Sigma-t
    sigmat_var = ds.createVariable('sigmat', 'f4', ('profile', 'z',),
                                   fill_value=-99.)
    sigmat_var.long_name = "Sigma-T"
    sigmat_var.standard_name = "sea_water_sigma_t"
    sigmat_var.units = "kg m-3"
    sigmat_var.coordinates = "time lat lon z"

    # Dissolved Oxygen
    oxygen_var = ds.createVariable('oxygen', 'f4', ('profile', 'z',),
                                   fill_value=-99.)
    oxygen_var.long_name = "Oxygen"
    oxygen_var.standard_name = \
        "mole_concentration_of_dissolved_molecular_oxygen_in_sea_water"
    oxygen_var.units = "ml l-1"
    oxygen_var.coordinates = "time lat lon z"

    # Fluorescence
    flor_var = ds.createVariable('fluorescence', 'f4', ('profile', 'z',),
                                 fill_value=-99.)
    flor_var.long_name = "Fluorescence"
    flor_var.units = "mg m-3"
    flor_var.coordinates = "time lat lon z"

    # PAR
    par_var = ds.createVariable('par', 'f4', ('profile', 'z',),
                                fill_value=-99.)
    par_var.long_name = "PAR"
    par_var.units = "1"
    par_var.coordinates = "time lat lon z"

    # pH
    ph_var = ds.createVariable('ph', 'f4', ('profile', 'z',),
                               fill_value=-99.)
    ph_var.long_name = "pH"
    ph_var.standard_name = "sea_water_ph_reported_on_total_scale"
    ph_var.units = "1"
    ph_var.coordinates = "time lat lon z"

    for idx, filename in enumerate(infiles):
        f = PFile(filename)
        f.remove_upcast()

        time_var[idx] = date2num(f.meta['timestamp'], time_var.units)
        lat_var[idx] = f.meta['latitude']
        lon_var[idx] = f.meta['longitude']
        profile_var[idx] = f.meta['id']
        ship_var[idx] = f.meta['ship']
        trip_var[idx] = f.meta['trip']
        cast_var[idx] = f.meta['cast']

        mapping = {
            'temp': temp_var,
            'sal': sal_var,
            'cond': cond_var,
            'sigt': sigmat_var,
            'oxy': oxygen_var,
            'flor': flor_var,
            'par': par_var,
            'ph': ph_var,
        }

        for name, var in mapping.items():
            if name in f.dataframe.columns.values:
                g = interp1d(
                    f.dataframe['depth'],
                    f.dataframe[name],
                    bounds_error=False,
                    fill_value=temp_var._FillValue
                )
                var[idx, :] = g(STANDARD_DEPTHS)
