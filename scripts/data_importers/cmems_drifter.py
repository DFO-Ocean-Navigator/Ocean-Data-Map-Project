#!/usr/bin/env python

import argparse
import glob
import os
import sys

import numpy as np
import xarray as xr
from sqlalchemy import create_engine, select, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station

# Mapping of variable names to their attributes
VARIABLES = ["TEMP", "ATMS"]


def reformat_coordinates(ds: xr.Dataset) -> xr.Dataset:
    """
    Shifts coordinates so that tracks are continuous on each side of map limits
    (-180,180 degrees longitude). i.e if a track crosses -180 deg such that the
    first point is -178 and the next is 178 then the second coordinate will be
    replaced with -182. This allows the navigator to draw the track continusouly
    without bounching between points on the far sides of the map.
    """

    lons = ds.LONGITUDE.data.copy()

    lon_diff = np.diff(lons)
    crossings = np.where(np.abs(lon_diff) > 180)[0]

    while len(crossings) > 0:
        if lons[crossings[0]] > lons[crossings[0] + 1]:
            lons[crossings[0] + 1 :] = 360 + lons[crossings[0] + 1 :]
        else:
            lons[crossings[0] + 1 :] = -360 + lons[crossings[0] + 1 :]
        lon_diff = np.diff(lons)
        crossings = np.where(np.abs(lon_diff) > 180)[0]

    ds.LONGITUDE.data = lons

    return ds


def main(uri: str, filename: str):
    """Import data from NetCDF file(s) into the database.

    :param str uri: Database URI
    :param str filename: NetCDF file or directory of NetCDF files
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
                if ds.LATITUDE.size > 1:
                    ds = reformat_coordinates(ds)

                df = ds.to_dataframe().reset_index().dropna(axis=1, how="all").dropna()

                # remove missing variables from variables list
                variables = [v for v in VARIABLES if v in df.columns]

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

                # Create Platform object

                platform = Platform(
                    type=Platform.Type.drifter,
                    unique_id=f"{ds.attrs["platform_code"]}",
                )
                try:
                    session.add(platform)
                    session.commit()
                except IntegrityError:
                    print("Error committing platform.")
                    session.rollback()
                    stmt = select(Platform.id).where(
                        Platform.unique_id == ds.attrs["platform_code"]
                    )
                    platform.id = session.execute(stmt).first()[0]

                stations = [
                    dict(
                        platform_id=platform.id,
                        time=row.TIME,
                        latitude=row.LATITUDE,
                        longitude=row.LONGITUDE,
                    )
                    for idx, row in df[["TIME", "LATITUDE", "LONGITUDE"]]
                    .drop_duplicates()
                    .iterrows()
                ]

                try:
                    stmt = insert(Station).values(stations).prefix_with("IGNORE")
                    session.execute(stmt)
                    session.commit()
                except IntegrityError as e:
                    print("Error committing station.")
                    print(e)
                    session.rollback()
                stmt = select(Station).where(Station.platform_id == platform.id)
                station_data = session.execute(stmt).all()

                for station in station_data:
                    df.loc[
                        df["TIME"].dt.floor("s") == station[0].time, "STATION_ID"
                    ] = station[0].id

                samples = []
                for _, row in df.iterrows():
                    for variable in variables:
                        samples.append(
                            dict(
                                station_id=row.STATION_ID,
                                depth=row.DEPTH,
                                value=row[variable],
                                datatype_key=datatype_map[variable].key,
                            )
                        )

                try:
                    stmt = insert(Sample).values(samples).prefix_with("IGNORE")
                    session.execute(stmt)
                    session.commit()
                except IntegrityError as e:
                    print("Error committing samples.")
                    print(e)
                    session.rollback()

                session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="CMEMS Drifter script",
        description="Add CMEMS drifting buoy data to ONAV Obs database.",
    )
    parser.add_argument("uri", type=str)
    parser.add_argument("filename", type=str)
    args = parser.parse_args()

    main(args.uri, args.filename)
