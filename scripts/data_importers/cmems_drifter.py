#!/usr/bin/env python

import glob
import os
import sys
import defopt

import xarray as xr
from sqlalchemy import create_engine, select
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

        if os.path.isdir(filename):
            filename = sorted(glob.glob(os.path.join(filename, "*.nc")))
        else:
            filename = [filename]

        for fname in filename:
            print(fname)
            with xr.open_dataset(fname) as ds:
                df = ds.to_dataframe().reset_index()

                # Iterate over variables defined in the mapping
                for var_name, (key, name, unit) in VARIABLE_MAPPING.items():
                    if var_name not in df.columns:
                        continue  # Skip if the variable is not present in the dataset

                    # Create or retrieve DataType object
                    statement = select(DataType).where(DataType.key == key)
                    data_type = session.execute(statement).all()
                    if data_type is None:
                        data_type = DataType(
                            key=key,
                            name=name,
                            unit=unit,
                        )
                        session.add(data_type)
                        session.commit()

                    # Create Platform object
                    
                    platform = Platform(type=Platform.Type.drifter)
                    session.add(platform)
                    session.commit()

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
                        session.add(station)
                        session.commit()

                        # Create Sample object
                        sample = Sample(
                            depth=depth,
                            value=value,
                            datatype_key=data_type[0][0].key,
                            station_id=station.id,
                        )
                        session.add(sample)

                    session.commit()


if __name__ == "__main__":
    defopt.run(main)
