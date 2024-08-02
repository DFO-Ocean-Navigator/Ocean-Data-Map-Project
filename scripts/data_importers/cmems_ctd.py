#!/usr/bin/env python

import glob
import os
import sys

import defopt
import gsw
import numpy as np
import pandas as pd
import xarray as xr

from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
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
                
                if ds.LATITUDE.size == 1:
                    print("Moored instrument: skipping file.")
                    continue
        
                times = pd.to_datetime(ds.TIME.values)

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

                try:
                    session.add(p)
                    session.commit()
                except IntegrityError:
                    print("Error committing platform.")
                    session.rollback()
                    stmt = select(Platform.id).where(Platform.unique_id == ds.attrs["platform_code"])
                    p.id = session.execute(stmt).first()[0]

                for idx, time in enumerate(times):
                    # Generate the station
                    s = Station(
                        latitude=ds.LATITUDE.values[idx],
                        longitude=ds.LONGITUDE.values[idx],
                        time=time,
                        platform_id=p.id
                    )
                    try:
                        session.add(s)
                        session.commit()
                    except IntegrityError:
                        print("Error committing station.")
                        session.rollback()

                    # Generate the samples
                    for var, dt in datatype_map.items():
                        if "DEPH" in ds.variables:
                            depth = ds.DEPH.isel(TIME=idx).values
                        elif "PRES" in ds.variables:
                            pres = ds["PRES"].isel(TIME=idx).values
                            lat = ds["LATITUDE"][idx].values

                            depth = gsw.conversions.z_from_p(
                                -pres,
                                lat,
                            )

                        if var in ds.variables:
                            values = ds[var].isel(TIME=idx).values

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
                                    station_id=s.id,
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
