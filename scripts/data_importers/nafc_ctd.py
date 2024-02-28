#!/usr/bin/env python

import glob
import os

import defopt
import pandas as pd
import gsw
import xarray as xr

import data.observational
from data.observational import DataType, Platform, Sample, Station


def main(uri: str, filename: str):
    """Import NAFC CTD

    :param str uri: Database URI
    :param str filename: NetCDF file, or directory of files
    """
    data.observational.init_db(uri, echo=False)
    data.observational.create_tables()

    datatype_map = {}

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

                data.observational.db.session.add_all(datatype_map.values())

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
                data.observational.db.session.add(p)

            # Generate the station
            s = Station(
                latitude=ds.latitude.values[0],
                longitude=ds.longitude.values[0],
                time=pd.Timestamp(ds.time.values[0]),
            )
            p.stations.append(s)
            data.observational.db.session.commit()

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
                data.observational.db.session.bulk_save_objects(samples)

            data.observational.db.session.commit()


if __name__ == "__main__":
    defopt.run(main)
