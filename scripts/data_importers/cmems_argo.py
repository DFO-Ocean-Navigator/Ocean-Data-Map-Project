#!/usr/bin/env python
import glob
import os
import sys

import defopt
import pandas as pd
import gsw
import numpy as np
import xarray as xr
from sqlalchemy import create_engine, select
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

datatype_map = {}


def extract_metadata(ds, metadata):
    platform_number = ds.attrs.get(metadata["PLATFORM_NUMBER"])
    project_name = ds.attrs.get(metadata["PROJECT_NAME"])
    pi_name = ds.attrs.get(metadata["PI_NAME"])
    data_centre = ds[metadata["DATA_CENTRE"]].values[0]
    platform_type = ds.attrs.get(metadata["PLATFORM_TYPE"])
    wmo_inst_type = ds.attrs.get(metadata["WMO_INST_TYPE"])

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
    """Import Argo Profiles

    :param str uri: Database URI
    :param str filename: Argo NetCDF Filename, or directory of files
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

        for fname in filenames:
            with xr.open_dataset(fname) as ds:
                print(fname)
                if ds.LATITUDE.size == 1:
                    print("Moored instrument: skipping file.")
                    continue

                ds = reformat_coordinates(ds)

                times = pd.to_datetime(ds.TIME.values)

                meta_data = extract_metadata(ds, META_FIELDS)

                variables = [v for v in VARIABLES if v in ds.variables]

                platform_number = meta_data["PLATFORM_NUMBER"]
                unique_id = f"argo_{platform_number}"

                platform = (
                    session.query(Platform)
                    .filter(
                        Platform.unique_id == unique_id,
                        Platform.type == Platform.Type.argo,
                    )
                    .first()
                )
                if platform is None:
                    platform = Platform(type=Platform.Type.argo, unique_id=unique_id)
                    attrs = {}
                    for f in META_FIELDS:
                        attrs[META_FIELDS[f]] = (meta_data[f] or "").strip()

                    platform.attrs = attrs
                    session.add(platform)
                    session.commit()

                for idx, time in enumerate(times):
                    station = Station(
                        time=time,
                        latitude=ds["LATITUDE"].values[idx],
                        longitude=ds["LONGITUDE"].values[idx],
                        platform_id=platform.id,
                    )

                    try:
                        session.add(station)
                        session.commit()
                    except IntegrityError:
                        print("Error committing station.")
                        session.rollback()

                    samples = []
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
                                session.commit()
                                datatype_map[variable] = dt
                            else:
                                dt = dt[0][0]
                        else:
                            dt = datatype_map[variable]

                        values = ds[variable].isel(TIME=idx).values

                        if "DEPH" in ds.variables:
                            depth = ds.DEPH.isel(TIME=idx).values
                        elif "PRES" in ds.variables:
                            pres = ds["PRES"].isel(TIME=idx).values
                            lat = ds["LATITUDE"][idx].values

                            depth = gsw.conversions.z_from_p(
                                -pres,
                                lat,
                            )

                        data = np.stack(
                            [
                                depth.flatten(),
                                values.flatten(),
                            ],
                            axis=1,
                        )
                        data = data[~np.isnan(data).any(axis=1)]

                        samples = [
                            Sample(
                                depth=pair[0],
                                datatype_key=dt.key,
                                value=pair[1],
                                station_id=station.id,
                            )
                            for pair in data
                        ]

                        try:
                            session.bulk_save_objects(samples)
                        except IntegrityError:
                            print("Error committing samples.")
                            session.rollback()

                session.commit()


if __name__ == "__main__":
    defopt.run(main)
