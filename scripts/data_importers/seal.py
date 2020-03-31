#!/usr/bin/env python

import numpy as np
import pandas as pd
import xarray as xr
import defopt
import seawater
import os
import glob
import data.observational
from data.observational import Platform, Sample, Station, DataType

VARIABLES = [ 'TEMP', 'PSAL' ]

META_FIELDS = {
    'PLATFORM_NUMBER': None,
    'PROJECT_NAME': None,
    'PI_NAME': None,
    'DATA_CENTRE': None,
    'PLATFORM_TYPE': None,
    'FLOAT_SERIAL_NO': None,
    'FIRMWARE_VERSION': None,
    'WMO_INST_TYPE': None
}

datatype_map = {}

def main(uri: str, filename: str):
    """Import Seal Profiles

    :param str uri: Database URI
    :param str filename: Seal NetCDF Filename, or directory of files
    """
    data.observational.init_db(uri, echo=False)
    data.observational.create_tables()

    if os.path.isdir(filename):
        filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
    else:
        filenames = [filename]

    for fname in filenames:
        print(fname)
        # We're only loading Temperature and Salinity from these files, so
        # we'll just make sure the DataTypes are in the db now.
        if DataType.query.get('sea_water_temperature') is None:
            dt = DataType(
                key='sea_water_temperature',
                name='Water Temperature',
                unit='degree_Celsius'
            )
            data.observational.db.session.add(dt)

        if DataType.query.get('sea_water_temperature') is None:
            dt = DataType(
                key='sea_water_salinity',
                name='Water Salinity',
                unit='PSU'
            )
            data.observational.db.session.add(dt)

        data.observational.db.session.commit()

        with xr.open_dataset(fname) as ds:
            ds['TIME'] = ds.JULD.to_index().to_datetimeindex()
            ds['TIME'] = ds.TIME.swap_dims({'TIME': 'N_PROF'})
            depth = seawater.dpth(
                ds.PRES_ADJUSTED,
                np.tile(ds.LATITUDE, (ds.PRES.shape[1], 1)).transpose()
            )
            ds['DEPTH'] = (['N_PROF', 'N_LEVELS'], depth)

            # This is a single platform, so we can construct it here.
            p = Platform(
                type=Platform.Type.animal,
                unique_id=ds.reference_file_name
            )
            p.attrs = {
                'Principle Investigator': ds.pi_name,
                'Platform Code': ds.platform_code,
                'Species': ds.species,
            }

            data.observational.db.session.add(p)
            data.observational.db.session.commit()

            # Generate Stations
            df = ds[['LATITUDE', 'LONGITUDE', 'TIME']].to_dataframe()
            stations = [
                Station(
                    platform_id=p.id,
                    latitude=row.LATITUDE,
                    longitude=row.LONGITUDE,
                    time=row.TIME,
                )
                for idx, row in df.iterrows()
            ]

            # Using return_defaults=True here so that the stations will get
            # updated with id's. It's slower, but it means that we can just
            # put all the station ids into a pandas series to use when
            # constructing the samples.
            data.observational.db.session.bulk_save_objects(
                stations,
                return_defaults=True
            )
            df['STATION_ID'] = [s.id for s in stations]

            # Generate Samples
            df_samp = ds[
                ['TEMP_ADJUSTED', 'PSAL_ADJUSTED', 'DEPTH']
            ].to_dataframe().reorder_levels(['N_PROF', 'N_LEVELS'])

            samples = [
                [
                    Sample(
                        station_id=df.STATION_ID[idx[0]],
                        datatype_key='sea_water_temperature',
                        value=row.TEMP_ADJUSTED,
                        depth=row.DEPTH,
                    ),
                    Sample(
                        station_id=df.STATION_ID[idx[0]],
                        datatype_key='sea_water_salinity',
                        value=row.PSAL_ADJUSTED,
                        depth=row.DEPTH,
                    )
                ]

                for idx, row in df_samp.iterrows()
            ]
            samples = [item for sublist in samples for item in sublist]
            samples = [s for s in samples if not pd.isna(s.value)]

            data.observational.db.session.bulk_save_objects(samples)
            data.observational.db.session.commit()


if __name__ == '__main__':
    defopt.run(main)
