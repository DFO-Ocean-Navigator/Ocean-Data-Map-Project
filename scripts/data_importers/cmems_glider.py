#!/usr/bin/env python

import glob
import os
import sys

import defopt
import numpy as np
import xarray as xr
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station

VARIABLES = ["PRES", "PSAL", "TEMP", "CNDC"]


def main(uri: str, filename: str):

    """Import Glider NetCDF

    :param str uri: Database URI
    :param str filename: Glider Filename, or directory of NetCDF files
    """
    engine = create_engine(
        uri,
        connect_args={"connect_timeout": 10},
        pool_recycle=3600,
    )

    with Session(engine) as session:

        if not isinstance(filename, list):
            if os.path.isdir(filename):
                filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
            else:
                filenames = [filename]
        else:
            filenames = filename

        datatype_map = {}
        for fname in filenames:
            print(fname)
            with xr.open_dataset(fname).drop_duplicates("TIME") as ds:   
                time_diff = np.diff(ds.TIME.data).astype('timedelta64[D]').astype(int)
                breaks = np.argwhere(time_diff > 5).flatten()
                deployment_times = np.split(ds.TIME, breaks + 1)

                variables = [v for v in VARIABLES if v in ds.variables]

                for deployment in deployment_times:
                    subset = ds.sel(TIME=deployment)
                    dep_date = np.datetime_as_string(deployment, unit='D')[0]
                    df = (
                        subset[["TIME", "LATITUDE", "LONGITUDE", *variables]]
                        .to_dataframe()
                        .reset_index()
                        .dropna(axis=1, how='all')
                        .dropna()
                    )

                    # remove missing variables from variables list
                    variables = [v for v in VARIABLES if v in df.columns]

                    for variable in variables:
                        if variable not in datatype_map:
                            statement = select(DataType).where(
                                DataType.key == subset[variable].standard_name
                            )
                            dt = session.execute(statement).all()
                            if not dt:
                                dt = DataType(
                                    key=subset[variable].standard_name,
                                    name=subset[variable].long_name,
                                    unit=subset[variable].units,
                                )
                                session.add(dt)
                            else:
                                dt = dt[0][0]

                            datatype_map[variable] = dt

                    session.commit()

                    platform_id = subset.attrs["platform_code"]
                    p = Platform(
                        type=Platform.Type.glider, unique_id=f"{platform_id}-{dep_date}"

                    )
                    attrs = {
                        "Glider Platform": platform_id,
                        "WMO": subset.attrs["wmo_platform_code"],
                        "Institution": subset.attrs["institution"],
                    }
                    p.attrs = attrs

                    try:
                        session.add(p)
                        session.commit()
                    except IntegrityError:
                        print("Error committing platform.")
                        session.rollback()
                        stmt = select(Platform.id).where(Platform.unique_id == f"{platform_id}-{dep_date}")
                        p.id = session.execute(stmt).first()[0]

                    n_chunks = np.ceil(len(df)/1e4)

                    if n_chunks < 1:
                        continue

                    for chunk in np.array_split(df, n_chunks):
                        stations = [
                            Station(
                                platform_id=p.id,
                                time=row.TIME,
                                latitude=row.LATITUDE,
                                longitude=row.LONGITUDE,
                            )
                            for idx, row in chunk.iterrows()
                        ]

                        # Using return_defaults=True here so that the stations will get
                        # updated with id's. It's slower, but it means that we can just
                        # put all the station ids into a pandas series to use when
                        # constructing the samples.
                        try:
                            session.bulk_save_objects(stations, return_defaults=True)
                        except IntegrityError:
                            print("Error committing station.")
                            session.rollback()
                            stmt = select(Station).where(Station.platform_id==p.id)
                            chunk["STATION_ID"] = session.execute(stmt).all()

                        chunk["STATION_ID"] = [s.id for s in stations]

                        samples = [
                            [
                                Sample(
                                    station_id=row.STATION_ID,
                                    depth=row.DEPTH,
                                    value=row[variable],
                                    datatype_key=datatype_map[variable].key,
                                )
                                for variable in variables
                            ]
                            for idx, row in chunk.iterrows()
                        ]
                        try:
                            session.bulk_save_objects(
                                [item for sublist in samples for item in sublist]
                            )
                        except IntegrityError:
                            print("Error committing samples.")
                            session.rollback()

                        session.commit()


if __name__ == "__main__":
    defopt.run(main)