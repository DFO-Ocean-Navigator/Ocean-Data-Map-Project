#!/usr/bin/env python
import glob
import os
import sys

import defopt
import pandas as pd
import gsw
import xarray as xr
from sqlalchemy import create_engine, select
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
    platform_number = ds.attrs[metadata["PLATFORM_NUMBER"]]
    project_name = ds.attrs[metadata["PROJECT_NAME"]]
    pi_name = ds.attrs[metadata["PI_NAME"]]
    data_centre = ds[metadata["DATA_CENTRE"]].values[0]
    platform_type = ds.attrs[metadata["PLATFORM_TYPE"]]
    wmo_inst_type = ds.attrs[metadata["WMO_INST_TYPE"]]

    return {
        "PLATFORM_NUMBER": platform_number,
        "PROJECT_NAME": project_name,
        "PI_NAME": pi_name,
        "DATA_CENTRE": data_centre,
        "PLATFORM_TYPE": platform_type,
        "WMO_INST_TYPE": wmo_inst_type,
    }


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
                times = pd.to_datetime(ds.TIME.values)
                meta_data = extract_metadata(ds, META_FIELDS)

                times = pd.to_datetime(times)

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
                        attrs[META_FIELDS[f]] = meta_data[f].strip()

                    platform.attrs = attrs
                    session.add(platform)

                station = Station(
                    time=times[0],
                    latitude=ds["LATITUDE"].values[0],
                    longitude=ds["LONGITUDE"].values[0],
                )
                platform.stations.append(station)
                session.commit()

                depth = gsw.conversions.z_from_p(
                    -ds["PRES"].dropna("DEPTH").values,
                    ds["LATITUDE"].values,
                )

                samples = []
                for variable in VARIABLES:
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

                    values = ds[variable].values

                    samples = [
                        Sample(
                            depth=pair[0],
                            datatype_key=dt.key,
                            value=pair[1],
                            station_id=station.id,
                        )
                        for pair in zip(depth.flatten(), values.flatten())
                    ]

                    session.bulk_save_objects(samples)

                session.commit()


if __name__ == "__main__":
    defopt.run(main)
