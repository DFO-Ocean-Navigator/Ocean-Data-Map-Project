#!env python

'''
Reads in the raw data from the Joubeh ftp site and compiles the separate files
into one file per drifter
'''
import os
import re
import sys
import time
from datetime import datetime

import geopy
import geopy.distance
import numpy as np
import pandas as pd
import scipy
import scipy.fftpack
from netCDF4 import Dataset
from scipy import interpolate

dirname = "/data/drifter/raw/"
shareddir = "/data/drifter/output/"
metadatafile = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "drifter_metadata.xlsx"
)


def appendDateVariable(dataset, dataframe, name, variable):
    '''
    Appends a date/time type variable from a dataframe to a NetCDF dataset.

    Parameters:
        dataset   - the NetCDF Dataset
        dataframe - the Pandas Dataframe
        name      - the NetCDF name of the variable
        variable  - the column name of the variable in the dataframe
    '''
    var = dataset.createVariable(name, 'f4', ('data_date',))
    var.units = "seconds since 1950-01-01 00:00:00"
    var.calendar = "gregorian"
    var.time_origin = "1950-01-01 00:00:00"

    origin = datetime(1950, 01, 01, 00, 00, 00)
    var[:] = [(t - origin).total_seconds() for t in
              dataframe[variable].tolist()]


def appendVariable(dataset, dataframe, variable, datatype, units=None,
                   long_name=None):
    '''
    Appends a variable from a dataframe to a NetCDF dataset.

    Parameters:
        dataset   - the NetCDF Dataset
        dataframe - the Pandas Dataframe
        variable  - the column name of the variable in the dataframe
        datatype  - the data type in NetCDF format
        units     - the units of the variable
        long_name - the variable's human readable name
    '''

    if variable in dataframe.columns:
        var = dataset.createVariable(
            variable.lower(), datatype, ('data_date',))
        var[:] = dataframe[variable].values
        if units:
            var.units = units
        if long_name:
            var.long_name = long_name


def bearing(source, destination):
    l1 = np.radians(source.longitude)
    l2 = np.radians(destination.longitude)
    dl = l2 - l1
    p1 = np.radians(source.latitude)
    p2 = np.radians(destination.latitude)

    y = np.sin(dl) * np.cos(p2)
    x = np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(dl)

    return np.pi / 2 - np.arctan2(y, x)


# clear out the directory where the merged files will be created
if os.path.isdir(shareddir) == 1:
    csvfilelist = [f for f in os.listdir(shareddir) if f.endswith(".csv")]
    ncfilelist = [f for f in os.listdir(shareddir) if f.endswith(".nc")]
    for f in csvfilelist + ncfilelist:
        os.remove(os.path.join(shareddir, f))

# Read the metadata from the Excel sheet
metadata = pd.read_excel(metadatafile, skiprows=3, index_col=1)

buoy_files = {}
# For each directory
for d in os.listdir(dirname):
    for f in os.listdir(os.path.join(dirname, d)):
        if not f.endswith(".csv"):
            continue

        buoy_id = re.split('_', f)[0]

        # Add a dummy entry in buoy_files
        if buoy_id not in buoy_files:
            buoy_files[buoy_id] = []

        buoy_files[buoy_id].append(os.path.join(dirname, d, f))

# For each buoy
for buoy_id, files in buoy_files.items():
    if len(sys.argv) > 1:
        if buoy_id not in sys.argv[1::]:
            continue

    # Clear the list
    dataframes = []

    # Read each CSV file into a dataframe and add it to the list
    for f in files:
        dataframes.append(pd.read_csv(f))

    # Concatenate all the dataframes together
    dataframe = pd.concat(dataframes).sort_values('Data Date(GMT)')

    # We don't need the individual dataframes anymore, release that memory
    dataframes = None

    # Convert dates to datetime objects
    for col in ['Data Date(GMT)', 'Received Date(GMT)', 'Sent Date(GMT)']:
        dataframe[col] = pd.to_datetime(dataframe[col],
                                        format='%Y-%m-%d %H:%M:%S')

    dataframe.drop_duplicates(subset='Data Date(GMT)', inplace=True)

    '''
    Any QC of the data should be done here.
    '''

    changed = True
    std = None
    mean = None
    while changed:
        dataframe.reset_index(inplace=True)
        dataframe.drop('index', axis=1, inplace=True)

        # Get geopy points for each lat,lon pair
        points = dataframe[
            ['LATITUDE', 'LONGITUDE']
        ].apply(lambda x: geopy.Point(x[0], x[1]), axis=1)

        # get distances in nautical miles
        ends = points.shift(1)
        distances = []
        for idx, start in enumerate(points):
            distances.append(geopy.distance.geodesic(start, ends[idx]).nm)
        distances = np.ma.masked_invalid(distances)

        # get time differences in hours
        times = dataframe['Data Date(GMT)'].diff().apply(
            lambda x: x.total_seconds() / 3600.0
        )

        # Speed in knots
        speed = distances / times

        # Drop anything where the speed is 2 standard deviations from the mean
        if std is None:
            std = np.std(speed)
            mean = np.mean(speed)

        si = np.where((abs(speed - mean) > 3 * std) & (speed > 10))[0]

        if len(si) > 0:
            dataframe.drop(points.index[si[0]], inplace=True)
            print("\tDropping point with speed=%0.1f knots" % speed[si[0]])
        else:
            changed = False

        del si

    '''
    QA is now done, back to our regularly scheduled programming.
    '''
    # Calculate speeds
    start = dataframe[
        ['LATITUDE', 'LONGITUDE']
    ].apply(lambda x: geopy.Point(x[0], x[1]), axis=1)

    # get distances in nautical miles
    ends = start.shift(-1)
    dx = []
    dy = []
    for idx in range(0, len(start) - 1):
        d = geopy.distance.geodesic(start[idx], ends[idx]).meters
        b = bearing(start[idx], ends[idx])
        dy.append(np.sin(b) * d)
        dx.append(np.cos(b) * d)

    dt = dataframe['Data Date(GMT)'].diff()
    times = dt.apply(
        lambda x: x.total_seconds()
    )

    vx = dx / times[1::]
    vy = dy / times[1::]

    vt = (dataframe['Data Date(GMT)'] + dt / 2)[1::].apply(
        lambda x: time.mktime(x.timetuple())
    )

    if (vt.size<= 2 or vx.size <=2 or vy.size <=2 ):
        print("vt,vx,or vy are to small to use, must nbe greater than 1 (the drifter should have more than 1 point)")
        continue
    fx = interpolate.interp1d(vt, vx, bounds_error=False, kind='linear')
    fy = interpolate.interp1d(vt, vy, bounds_error=False, kind='linear')

    target_times = dataframe['Data Date(GMT)'].apply(
        lambda x: time.mktime(x.timetuple())
    )

    dataframe['VX'] = pd.Series(
        fx(target_times),
        index=dataframe.index
    )
    dataframe['VY'] = pd.Series(
        fy(target_times),
        index=dataframe.index
    )

    # Smooth the velocities
    even_times = np.arange(
        vt.iloc[0],
        vt.iloc[-1],
        3600.0
    )

    for v in [(fx, 'VX_smooth'), (fy, 'VY_smooth')]:
        ve = np.ma.masked_invalid(v[0](even_times))
        slices = np.ma.notmasked_contiguous(ve)
        valid = slices[0]
        sig = ve[valid]
        t = even_times[valid]

        M = sig.size
        spectrum = scipy.fftpack.rfft(sig, n=M)

        p1 = (30.0 / 24.0) / 24.0 * M / 2
        p2 = (40.0 / 24.0) / 24.0 * M / 2

        def ramp_filter(x):
            if x <= p1:
                return 1.0
            elif x >= p2:
                return 0.0
            else:
                return (x - p1) / (p2 - p1)

        filtered_spec = [spectrum[i] * ramp_filter(i) for i in xrange(M)]

        output = scipy.fftpack.irfft(filtered_spec)

        f = scipy.interpolate.interp1d(
            t, output, bounds_error=False, kind='linear'
        )
        fo = f(dataframe['Data Date(GMT)'].apply(
            lambda x: time.mktime(x.timetuple())
        ))
        dataframe[v[1]] = pd.Series(
            fo,
            index=dataframe.index
        )

    # Remove the hex data from the dataframe
    if 'Hex Data' in dataframe.columns:
        dataframe.drop('Hex Data', axis=1, inplace=True)

    # Output File Paths
    csv_path = os.path.join(shareddir, buoy_id + ".csv")
    netcdf_path = os.path.join(shareddir, buoy_id + ".nc")

    # Write out CSV file
    dataframe.to_csv(csv_path, index=False, date_format='%Y-%m-%d %H:%M:%S')

    # Write out NetCDF file
    with Dataset(netcdf_path, "w", format='NETCDF4') as ds:
        ds.createDimension('data_date', len(dataframe))  # Number of rows
        ds.createDimension('meta', 1)
        ds.buoyid = buoy_id
        ds.description = 'CONCEPTS Ocean Drifter %s' % (buoy_id)
        wmo = metadata['WMO ID'][int(buoy_id)]
        if isinstance(wmo, pd.Series):
            wmo = wmo.iloc[wmo.size - 1]

        if isinstance(wmo, basestring):
            wmo = wmo.strip()

        ds.createVariable('wmo', str, ('meta',))[0] = str(wmo)
        deployment = metadata['Dep. Type(ship name, cruise)'][int(buoy_id)]
        if isinstance(deployment, pd.Series):
            deployment = deployment.iloc[deployment.size - 1]
        ds.createVariable('deployment', str, ('meta',))[0] = str(deployment)
        ds.createVariable('imei', str, ('meta',))[0] = str(buoy_id)

        endtime = dataframe['Data Date(GMT)'].tail(1).tolist()[0]
        delta = (datetime.utcnow() - endtime).total_seconds() / 3600.0
        if delta > 168:
            ds.status = 'inactive'
        elif delta > 24:
            ds.status = 'not responding'
        else:
            ds.status = 'normal'

        appendDateVariable(
            ds, dataframe, 'data_date', 'Data Date(GMT)'
        )
        appendDateVariable(
            ds, dataframe, 'received_date', 'Received Date(GMT)'
        )
        appendDateVariable(
            ds, dataframe, 'sent_date', 'Sent Date(GMT)'
        )
        appendVariable(
            ds, dataframe, "LATITUDE", 'f4', 'degrees_north', 'Latitude'
        )
        appendVariable(
            ds, dataframe, "LONGITUDE", 'f4', 'degrees_east', 'Longitude'
        )
        appendVariable(
            ds, dataframe,
            "SST", 'f4', 'degree_Celsius', 'Sea Surface Temperature'
        )
        appendVariable(
            ds, dataframe, "SBDTIME", 'i4', 'Seconds',
            'Time for Iridium message transmission'
        )
        appendVariable(
            ds, dataframe, "VBAT", 'f4', 'Volts', 'Battery Voltage'
        )
        appendVariable(
            ds, dataframe, "TTFF", 'i4', 'Seconds', 'Time to first GPS fix'
        )
        appendVariable(
            ds, dataframe, "FOM", 'i4'
        )
        appendVariable(
            ds, dataframe, "MAXDB", 'i4'
        )
        appendVariable(
            ds, dataframe, "AT", 'i4'
        )
        appendVariable(
            ds, dataframe, "BP", 'f4', 'mbar', 'Barometric Pressure'
        )
        appendVariable(
            ds, dataframe, "BPT", 'f4', 'mbar', 'Barometric Pressure Tendency'
        )
        appendVariable(
            ds, dataframe, "RANGE", 'i4', None,
            'Drogue Loss Strain Gauge Sensor Data'
        )
        appendVariable(
            ds, dataframe, "GPSDELAY", 'i4', 'Seconds', 'GPS Delay'
        )
        appendVariable(
            ds, dataframe, "SNR", 'i4', None, 'GPS Signal Strength'
        )
        appendVariable(
            ds, dataframe, "VX", 'f4', 'm/s', 'Drifter X Velocity'
        )
        appendVariable(
            ds, dataframe, "VY", 'f4', 'm/s', 'Drifter Y Velocity'
        )
        appendVariable(
            ds, dataframe, "VX_smooth", 'f4', 'm/s',
            'Drifter X Velocity (filtered)'
        )
        appendVariable(
            ds, dataframe, "VY_smooth", 'f4', 'm/s',
            'Drifter Y Velocity (filtered)'
        )   
        