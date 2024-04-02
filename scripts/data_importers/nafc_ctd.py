#!/usr/bin/env python

import glob
import os
import sys


import defopt
import pandas as pd
import gsw
import xarray as xr
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station


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
# def main(uri: str, filename: str):
#     """Import NAFC CTD

#     :param str uri: Database URI
#     :param str filename: NetCDF file, or directory of files
#     """
#     data.observational.init_db(uri, echo=False)
#     data.observational.create_tables()

    with Session(engine) as session:
        if os.path.isdir(filename):
            filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
        else:
            filenames = [filename]

        for fname in filenames:
            print(fname)
            with xr.open_dataset(fname) as ds:
                if len(datatype_map) == 0:
                    # Generate the DataTypes; only consider variables that have depth
                    for var in filter(
                        lambda x, dataset=ds: "level" in dataset[x].coords,
                        [d for d in ds.data_vars],
                    ):
                        dt = DataType.query.get(ds[var].standard_name)
                        if dt is None:
                            dt = DataType(
                                key=ds[var].standard_name,
                                name=ds[var].long_name,
                                unit=ds[var].units,
                            )
                        datatype_map[var] = dt

                    session.add_all(datatype_map.values())

                # Query or generate the platform
                # The files I worked off of were not finalized -- in this case the
                # trip id also included the cast number, so I strip off the last 3
                # digits.
                unique_id = f"nafc_ctd_{ds.trip_id[:-3]}"
                p = Platform.query.filter(Platform.unique_id == unique_id).one_or_none()
                if p is None:
                    p = Platform(type=Platform.Type.mission, unique_id=unique_id)
                    p.attrs = {
                        "Institution": ds.institution,
                        "Trip ID": ds.trip_id[:-3],
                        "Ship Name": ds.shipname,
                    }
                    session.add(p)

                # Generate the station
                s = Station(
                    latitude=ds.latitude.values[0],
                    longitude=ds.longitude.values[0],
                    time=pd.Timestamp(ds.time.values[0]),
                )
                p.stations.append(s)
                session.commit()

            ds["level"] = abs(gsw.conversions.z_from_p(ds.level.values, ds.latitude[0].values))

                # Generate the samples
                for var, dt in datatype_map.items():
                    da = ds[var].dropna("level")
                    samples = [
                        Sample(
                            value=d.item(),
                            depth=d.level.item(),
                            datatype_key=dt.key,
                            station_id=s.id,
                        )
                        for d in da
                    ]
                    session.bulk_save_objects(samples)

                session.commit()


if __name__ == "__main__":
    defopt.run(main)
