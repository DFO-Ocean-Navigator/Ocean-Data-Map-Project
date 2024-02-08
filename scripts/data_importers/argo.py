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

        if os.path.isdir(filename):
            filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
        else:
            filenames = [filename]

        for fname in filenames:
            print(fname)
            with xr.open_dataset(fname) as ds:
                times = pd.to_datetime(ds.JULD.values)

                for f in META_FIELDS:
                    META_FIELDS[f] = ds[f].values.astype(str)

                for prof in ds.N_PROF.values:
                    plat_number = ds.PLATFORM_NUMBER.values.astype(str)[prof]
                    unique_id = f"argo_{plat_number}"

                    # Grab the platform from the db base on the unique id
                    platform = (
                        session.query(Platform)
                        .filter(
                            Platform.unique_id == unique_id,
                            Platform.type == Platform.Type.argo,
                        )
                        .first()
                    )
                    if platform is None:
                        # ... or make a new platform
                        platform = Platform(
                            type=Platform.Type.argo, unique_id=unique_id
                        )
                        attrs = {}
                        for f in META_FIELDS:
                            attrs[ds[f].long_name] = META_FIELDS[f][prof].strip()

                        platform.attrs = attrs
                        session.add(platform)

                    # Make a new Station
                    station = Station(
                        time=times[prof],
                        latitude=ds.LATITUDE.values[prof],
                        longitude=ds.LONGITUDE.values[prof],
                    )
                    platform.stations.append(station)
                    # We need to commit the station here so that it'll have an id
                    session.commit()

                    depth = gsw.conversions.z_from_p(
                        ds.PRES[prof].dropna("N_LEVELS").values,
                        ds.LATITUDE.values[prof],
                    )

                    samples = []
                    for variable in VARIABLES:
                        # First check our local cache for the DataType object, if
                        # that comes up empty, check the db, and failing that,
                        # create a new one from the variable's attributes
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
                                # Commit the DataType right away. This might lead
                                # to a few extra commits on the first import, but
                                # reduces overall complexity in having to
                                # 'remember' if we added a new one later.
                                session.commit()
                                datatype_map[variable] = dt
                            else:
                                dt = dt[0][0]  # fix this
                        else:
                            dt = datatype_map[variable]

                        values = ds[variable][prof].dropna("N_LEVELS").values

                        # Using station_id and datatype_key here instead of the
                        # actual objects so that we can use bulk_save_objects--this
                        # is much faster, but it doesn't follow any relationships.
                        samples = [
                            Sample(
                                depth=pair[0],
                                datatype_key=dt.key,
                                value=pair[1],
                                station_id=station.id,
                            )
                            for pair in zip(depth, values)
                        ]

                        session.bulk_save_objects(samples)

                    session.commit()


if __name__ == "__main__":
    defopt.run(main)    
