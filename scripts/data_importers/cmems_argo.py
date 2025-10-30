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

VARIABLES = ["TEMP", "PSAL"]

META_FIELDS = {
    "PLATFORM_NUMBER": "wmo_platform_code",
    "PROJECT_NAME": "platform_name",
    "PI_NAME": "creator_name",
    "DATA_CENTRE": "DC_REFERENCE",
    "PLATFORM_TYPE": "wmo_instrument_type",
    "WMO_INST_TYPE": "wmo_instrument_type",
}


def extract_metadata(ds, metadata):
    platform_number = ds.attrs.get(metadata["PLATFORM_NUMBER"])
    project_name = ds.attrs.get(metadata["PROJECT_NAME"])
    pi_name = ds.attrs.get(metadata["PI_NAME"])
    data_centre = ds[metadata["DATA_CENTRE"]].values[0]
    platform_type = ds.attrs.get(metadata["PLATFORM_TYPE"])
    wmo_inst_type = ds.attrs.get(metadata["WMO_INST_TYPE"])

    if isinstance(data_centre, bytes):
        data_centre = data_centre.decode("utf-8")

    return {
        "PLATFORM_NUMBER": platform_number,
        "PROJECT_NAME": project_name,
        "PI_NAME": pi_name,
        "DATA_CENTRE": data_centre,
        "PLATFORM_TYPE": platform_type,
        "WMO_INST_TYPE": wmo_inst_type,
    }


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
                ds = reformat_coordinates(ds)
                meta_data = extract_metadata(ds, META_FIELDS)
                variables = [v for v in VARIABLES if v in ds.variables]
                df = (
                    ds[["TIME", "LATITUDE", "LONGITUDE", *variables]]
                    .to_dataframe()
                    .reset_index()
                    .dropna(axis=1, how="all")
                    .dropna()
                )

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

                p = Platform(
                    type=Platform.Type.argo, unique_id=f"{ds.attrs["platform_code"]}"
                )
                attrs = {}
                for f in META_FIELDS:
                    attrs[META_FIELDS[f]] = (meta_data[f] or "").strip()
                p.attrs = attrs

                try:
                    session.add(p)
                    session.commit()
                except IntegrityError:
                    print("Error committing platform.")
                    session.rollback()
                    stmt = select(Platform.id).where(
                        Platform.unique_id == ds.attrs["platform_code"]
                    )
                    p.id = session.execute(stmt).first()[0]

                df["STATION_ID"] = 0

                stations = [
                    dict(
                        platform_id=p.id,
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
                stmt = select(Station).where(Station.platform_id == p.id)
                station_data = session.execute(stmt).all()

                for station in station_data:
                    df.loc[
                        df["TIME"].dt.floor("s") == station[0].time, "STATION_ID"
                    ] = station[0].id

                n_chunks = np.ceil(len(df) / 1e3)

                if n_chunks < 1:
                    continue

                for chunk in np.array_split(df, n_chunks):
                    samples = []
                    for _, row in chunk.iterrows():
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
        prog="CMEMS ARGO script",
        description="Add CMEMS Profiling Float data to ONAV Obs database.",
    )
    parser.add_argument("uri", type=str)
    parser.add_argument("filename", type=str)
    args = parser.parse_args()

    main(args.uri, args.filename)
