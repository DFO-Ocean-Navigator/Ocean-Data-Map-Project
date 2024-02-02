#!/usr/bin/env python

import glob
import os

import defopt
import gsw
import xarray as xr

import data.observational
from data.observational import DataType, Platform, Sample, Station

VARIABLES = ["CHLA", "PSAL", "TEMP", "CNDC"]


def main(uri: str, filename: str):
    """Import Glider NetCDF

    :param str uri: Database URI
    :param str filename: Glider Filename, or directory of NetCDF files
    """
    data.observational.init_db(uri, echo=False)
    data.observational.create_tables()

    if os.path.isdir(filename):
        filenames = sorted(glob.glob(os.path.join(filename, "*.nc")))
    else:
        filenames = [filename]

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

            df["DEPTH"] = gsw.conversions.z_from_p(df.PRES, df.LATITUDE)

            for variable in variables:
                if variable not in datatype_map:
                    dt = DataType.query.get(ds[variable].standard_name)
                    if dt is None:
                        dt = DataType(
                            key=ds[variable].standard_name,
                            name=ds[variable].long_name,
                            unit=ds[variable].units,
                        )
                        data.observational.db.session.add(dt)

                    datatype_map[variable] = dt

            data.observational.db.session.commit()

            p = Platform(
                type=Platform.Type.glider, unique_id=f"glider_{ds.deployment_label}"
            )
            attrs = {
                "Glider Platform": ds.platform_code,
                "WMO": ds.wmo_platform_code,
                "Deployment": ds.deployment_label,
                "Institution": ds.institution,
                "Contact": ds.contact,
            }
            p.attrs = attrs
            data.observational.db.session.add(p)
            data.observational.db.session.commit()

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
            data.observational.db.session.bulk_save_objects(
                stations, return_defaults=True
            )
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
            data.observational.db.session.bulk_save_objects(
                [item for sublist in samples for item in sublist]
            )
            data.observational.db.session.commit()

        data.observational.db.session.commit()


if __name__ == "__main__":
    defopt.run(main)
