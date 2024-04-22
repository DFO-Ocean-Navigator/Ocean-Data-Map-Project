#!/usr/bin/env python

import glob
import os
import sys

import defopt
import gsw
import xarray as xr
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station

VARIABLES = ["PSAL", "TEMP", "CNDC"]


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
            with xr.open_dataset(fname) as ds:
                variables = [v for v in VARIABLES if v in ds.variables]
                df = (
                    ds[["TIME", "LATITUDE", "LONGITUDE", "PRES", *variables]]
                    .to_dataframe()
                    .reset_index()
                    .dropna()
                )

                ds["DEPTH"] = abs(
                    gsw.conversions.z_from_p(ds.PRES.values, ds.LATITUDE.values)
                )

                for variable in variables:
                    if variable not in datatype_map:
                        statement = select(DataType).where(
                            DataType.key == ds[variable].standard_name
                        )
                        dt = session.execute(statement).all()
                        if not dt:
                            dt = DataType(
                                key=ds[variable].standard_name,
                                name=ds[variable].long_name,
                                unit=ds[variable].units,
                            )
                            session.add(dt)
                        else:
                            dt = dt[0][0]

                        datatype_map[variable] = dt

                session.commit()

                p = Platform(
                    type=Platform.Type.glider, unique_id=f"{ds.attrs["platform_code"]}"

                )
                attrs = {
                    "Glider Platform": ds.attrs["platform_code"],
                    "WMO": ds.attrs["wmo_platform_code"],
                    "Institution": ds.attrs["institution"],
                }
                p.attrs = attrs
                session.add(p)
                session.commit()

                stations = [
                    Station(
                        platform_id=p.id,
                        time=row.TIME,
                        latitude=row.LATITUDE,
                        longitude=row.LONGITUDE,
                    )
                    for idx, row in df.iterrows()
                ]

                # Using return_defaults=True here so that the stations will get
                # updated with id's. It's slower, but it means that we can just
                # put all the station ids into a pandas series to use when
                # constructing the samples.
                session.bulk_save_objects(stations, return_defaults=True)
                df["STATION_ID"] = [s.id for s in stations]

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
                    for idx, row in df.iterrows()
                ]
                session.bulk_save_objects(
                    [item for sublist in samples for item in sublist]
                )
                session.commit()


if __name__ == "__main__":
    defopt.run(main)
