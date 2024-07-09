#!/usr/bin/env python

import glob
import os
import sys

import defopt
import pandas as pd
import xarray as xr

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station


def main(uri: str, filename: str):

    """Import NAFC CTD

    :param str uri: Database URI
    :param str filename: NetCDF file, or directory of files
    """
    engine = create_engine(
        uri,
        connect_args={"connect_timeout": 10},
        pool_recycle=3600,
    )

    with Session(engine) as session:
        datatype_map = {}

        if not isinstance(filename, list):
            if os.path.isdir(filename):
                filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
            else:
                filenames = [filename]
        else:
            filenames = filename

        for fname in filenames:
            print(fname)
            with xr.open_dataset(fname) as ds:
                if len(datatype_map) == 0:
                    # Generate the DataTypes; only consider variables that have depth
                    for var in filter(
                        lambda x, dataset=ds: "DEPTH" in dataset[x].dims,
                        [d for d in ds.variables],
                    ):
                        variable = ds[var]
                        standard_name = variable.attrs.get('standard_name')
                        if standard_name is not None:
                            statement = select(DataType).where(
                                    DataType.key == ds[var].standard_name
                                )
                            dt = session.execute(statement).all()                                                   
                            if not dt :
                                dt = DataType(
                                    key=ds[var].standard_name,
                                    name=ds[var].long_name,
                                    unit=ds[var].units,
                                )
                                session.add(dt)
                            else:
                                dt = dt[0][0]

                            datatype_map[var] = dt
                    session.commit()

                p = Platform(
                    type=Platform.Type.mission, unique_id=f"{ds.attrs["platform_code"]}"
                )
                attrs = {
                    "Institution": ds.attrs["institution"],
                }
                p.attrs = attrs
                session.add(p)
                session.commit()

                # Generate the station
                s = Station(
                    latitude=ds.LATITUDE.values,
                    longitude=ds.LONGITUDE.values,
                    time=pd.Timestamp(ds.TIME.values[0]),
                )
                p.stations.append(s)
                session.commit()

                # Generate the samples
                for var, dt in datatype_map.items():
                    if var in ds.variables:
                        samples = [
                            Sample(
                                value=value,
                                depth=depth,
                                datatype_key=dt.key,
                                station_id=s.id,
                            )
                            for value, depth in zip(ds[var][0].values, ds['DEPTH'].values)
                        ]
                        session.bulk_save_objects(samples)

                session.commit()


if __name__ == "__main__":
    defopt.run(main)
