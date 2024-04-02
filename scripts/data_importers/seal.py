#!/usr/bin/env python

import glob
import os
import sys

import defopt
import numpy as np
import pandas as pd
import gsw
import xarray as xr
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station

VARIABLES = ["TEMP", "PSAL"]

META_FIELDS = {
    "PLATFORM_NUMBER": None,
    "PROJECT_NAME": None,
    "PI_NAME": None,
    "DATA_CENTRE": None,
    "PLATFORM_TYPE": None,
    "FLOAT_SERIAL_NO": None,
    "FIRMWARE_VERSION": None,
    "WMO_INST_TYPE": None,
}

datatype_map = {}


def main(uri: str, filename: str):
    """Import Seal Profiles
    :param str uri: Database URI

    :param str filename: Seal NetCDF Filename, or directory of files
    """

    engine = create_engine(
        uri,
        connect_args={"connect_timeout": 10},
        pool_recycle=3600,
    )

    with Session(engine) as session:

        if os.path.isdir(filename):
            filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
        else:
            filenames = [filename]

        for fname in filenames:
            print(fname)
            # We're only loading Temperature and Salinity from these files, so
            # we'll just make sure the DataTypes are in the db now.
            if DataType.query.get("sea_water_temperature") is None:
                dt = DataType(
                    key="sea_water_temperature",
                    name="Water Temperature",
                    unit="degree_Celsius",
                )
                session.add(dt)

            if DataType.query.get("sea_water_temperature") is None:
                dt = DataType(
                    key="sea_water_salinity", name="Water Salinity", unit="PSU"
                )
                session.add(dt)

            session.commit()

        with xr.open_dataset(fname) as ds:
            ds["TIME"] = ds.JULD.to_index().to_datetimeindex()
            ds["TIME"] = ds.TIME.swap_dims({"TIME": "N_PROF"})
            depth = abs(
                gsw.conversions.z_from_p(
                    ds.PRES_ADJUSTED,
                    np.tile(ds.LATITUDE, (ds.PRES.shape[1], 1)).transpose(),
                )
            )
            ds["DEPTH"] = (["N_PROF", "N_LEVELS"], depth)

            # This is a single platform, so we can construct it here.
            p = Platform(type=Platform.Type.animal, unique_id=ds.reference_file_name)
            p.attrs = {
                "Principle Investigator": ds.pi_name,
                "Platform Code": ds.platform_code,
                "Species": ds.species,
            }

            session.add(p)
            session.commit()

            # Generate Stations
            df = ds[["LATITUDE", "LONGITUDE", "TIME"]].to_dataframe()
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
            session.bulk_save_objects(stations, return_defaults=True)
            df["STATION_ID"] = [s.id for s in stations]

            # Generate Samples
            df_samp = (
                ds[["TEMP_ADJUSTED", "PSAL_ADJUSTED", "DEPTH"]]
                .to_dataframe()
                .reorder_levels(["N_PROF", "N_LEVELS"])
            )

            samples = [
                [
                    Sample(
                        station_id=df.STATION_ID[idx[0]],
                        datatype_key="sea_water_temperature",
                        value=row.TEMP_ADJUSTED,
                        depth=row.DEPTH,
                    ),
                    Sample(
                        station_id=df.STATION_ID[idx[0]],
                        datatype_key="sea_water_salinity",
                        value=row.PSAL_ADJUSTED,
                        depth=row.DEPTH,
                    ),
                ]
                for idx, row in df_samp.iterrows()
            ]
            samples = [item for sublist in samples for item in sublist]
            samples = [s for s in samples if not pd.isna(s.value)]

            session.bulk_save_objects(samples)
            session.commit()


if __name__ == "__main__":
    defopt.run(main)
