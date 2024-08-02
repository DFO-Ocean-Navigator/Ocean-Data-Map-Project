#!/usr/bin/env python

import glob
import os
import sys
import defopt

import xarray as xr
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station

# Mapping of variable names to their attributes
VARIABLE_MAPPING = {
    "TEMP": ("sea_water_temperature", "Sea Temperature", "degrees_C"),
    "ATMS": ("air_pressure_at_sea_level", "Atmospheric Pressure", "hPa"),
    # Add more variables here if necessary
}


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

        for fname in filenames:
            print(fname)
            with xr.open_dataset(fname) as ds:
                df = ds.to_dataframe().reset_index().dropna(axis=1, how="all").dropna()

                # Iterate over variables defined in the mapping
                for var_name, (key, name, unit) in VARIABLE_MAPPING.items():
                    if var_name not in df.columns:
                        continue  # Skip if the variable is not present in the dataset

                    # Create or retrieve DataType object
                    statement = select(DataType).where(DataType.key == key)
                    data_type = session.execute(statement).first()
                    if data_type is None:
                        data_type = DataType(
                            key=key,
                            name=name,
                            unit=unit,
                        )
                        session.add(data_type)
                        session.commit()
                    else:
                        data_type = data_type[0]

                    # Create Platform object

                    platform = Platform(type=Platform.Type.drifter, unique_id=f"{ds.attrs["platform_code"]}")
                    try:
                        session.add(platform)
                        session.commit()
                    except IntegrityError:
                        print("Error committing platform.")
                        session.rollback()
                        stmt = select(Platform.id).where(Platform.unique_id == ds.attrs["platform_code"])
                        platform.id = session.execute(stmt).first()[0]

                    # Iterate over rows in the DataFrame
                    for index, row in df.iterrows():
                        time = row["TIME"]
                        latitude = row["LATITUDE"]
                        longitude = row["LONGITUDE"]
                        depth = row["DEPH"]
                        value = row[var_name]

                        # Create Station object
                        station = Station(
                            time=time,
                            latitude=latitude,
                            longitude=longitude,
                            platform_id=platform.id,
                        )

                        try:
                            session.add(station)
                            session.commit()
                        except IntegrityError:
                            print("Error committing station.")
                            session.rollback()

                        # Create Sample object
                        sample = Sample(
                            depth=depth,
                            value=value,
                            datatype_key=data_type.key,
                            station_id=station.id,
                        )

                        try:
                            session.add(sample)
                            session.commit()
                        except IntegrityError:
                            print("Error committing sample.")
                            session.rollback()

                    session.commit()


if __name__ == "__main__":
    defopt.run(main)
