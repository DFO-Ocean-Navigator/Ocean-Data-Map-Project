#!/usr/bin/env python

import glob
import os

import defopt
import numpy as np
import pandas as pd
import xarray as xr

import data.observational
from data.observational import DataType, Platform, Sample, Station

# These files were created by our scripts so they don't have nice attributes
# like standard_name, etc.
# Ideally this script won't stick around as anything other than an example for
# bulk loading drifter data. Going forward a new importer should be written to
# read from the incoming csv files and just add the new samples.
DATATYPE_MAPPING = {
    'sst': ('sea_water_temperature', 'Water Temperature', 'degree_Celsius'),
    'vbat': ('battery_voltage', 'Battery Voltage', 'Volts'),
    'bp': ('air_pressure', 'Barometric Pressure', 'mbar'),
    'bpt': ('tendency_of_air_pressure', 'Barometric Pressure Tendency', 'mbar'),
}

def main(uri: str, filename: str):
    """Import CONCEPTS drifter NetCDF

    :param str uri: Database URI
    :param str filename: Drifter Filename, or directory of NetCDF files
    """
    data.observational.init_db(uri, echo=False)
    data.observational.create_tables()

    if os.path.isdir(filename):
        filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
    else:
        filenames = [filename]

    for fname in filenames:
        print(fname)
        with xr.open_dataset(fname) as ds:
            df = ds.to_dataframe().drop(['wmo', 'deployment', 'imei'], axis=1)
            columns = list(filter(lambda c: c in DATATYPE_MAPPING, df.columns))

            dt_map = {}
            for c in columns:
                # First check our local cache for the DataType object, if
                # that comes up empty, check the db, and failing that,
                # create a new one.
                if c not in dt_map:
                    dt = DataType.query.get(DATATYPE_MAPPING[c][0])
                    if dt is None:
                        dt = DataType(key=DATATYPE_MAPPING[c][0],
                                    name=DATATYPE_MAPPING[c][1],
                                    unit=DATATYPE_MAPPING[c][2])

                        data.observational.db.session.add(dt)

                    dt_map[c] = dt

            # Commit to make sure all the variables are in the db so we don't
            # get any foreign key errors
            data.observational.db.session.commit()

            p = Platform(type=Platform.Type.drifter)
            attrs = dict(ds.attrs)
            attrs['wmo'] = ds.wmo.values[0]
            attrs['deployment'] = ds.deployment.values[0]
            attrs['imei'] = ds.imei.values[0]
            p.attrs = attrs
            data.observational.db.session.add(p)
            data.observational.db.session.commit()
            
            samples = []
            for index, row in df.iterrows():
                time = index[0]
                lat = row['latitude']
                lon = row['longitude']

                station = Station(time=time, latitude=lat, longitude=lon,
                                platform_id=p.id)
                data.observational.db.session.bulk_save_objects(
                    [station], return_defaults=True)

                for c in columns:
                    value = row[c]
                    if isinstance(value, pd.Timestamp):
                        value = value.value / 10 ** 9

                    if np.isfinite(value):
                        samples.append(Sample(
                            depth=0,
                            datatype_key=DATATYPE_MAPPING[c][0],
                            value=value,
                            station_id=station.id
                        ))

                # Commit every 1000 samples, that's a decent balance between
                # locking the db for too long and performance
                if len(samples) > 1000:
                    data.observational.db.session.bulk_save_objects(samples)
                    data.observational.db.session.commit()
                    samples = []

            # If there are any samples that haven't been committed yet, do so
            # now.
            if samples:
                data.observational.db.session.bulk_save_objects(samples)
                data.observational.db.session.commit()
                samples = []

        data.observational.db.session.commit()


if __name__ == '__main__':
    defopt.run(main)
