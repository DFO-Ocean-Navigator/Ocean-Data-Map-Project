import argparse
import itertools
import multiprocessing
import os
import sys

import gsw
import numpy as np
import pandas as pd
import xarray as xr
from sqlalchemy import create_engine, select, insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from data.observational import DataType, Platform, Sample, Station


def get_platform_variables(platform_type):

    variables = None
    match platform_type:
        case "GL":
            variables = ["PRES", "PSAL", "TEMP", "CNDC"]
        case "DB":
            variables = ["TEMP", "ATMS"]
        case "PF":
            variables = ["TEMP", "PSAL"]
        case "CT":
            variables = ["PRES", "PSAL", "TEMP"]

    return variables


def insert_stations(pd_table, conn, keys, data_iter):

    data = [dict(zip(keys, d)) for d in data_iter]
    stmt = insert(Station).values(data).prefix_with("IGNORE")
    conn.execute(stmt)
    conn.commit()


def insert_samples(pd_table, conn, keys, data_iter):

    data = [dict(zip(keys, d)) for d in data_iter]
    stmt = insert(Sample).values(data).prefix_with("IGNORE")
    conn.execute(stmt)
    conn.commit()


def get_station_ids(row, session):

    stmt = select(Station).where(
        Station.platform_id == row.platform_id,
        Station.time == row.time,
        Station.latitude == row.latitude,
        Station.longitude == row.longitude,
    )
    station_data = session.execute(stmt).first()

    row.station_id = station_data[0].id

    return row


def fix_drifter_depths(ds):
    if "DEPH" in ds.variables and len(ds.DEPH) == 2 and -12000 in ds.DEPH.data:
        inv_depth_idx = np.argwhere(ds.DEPH.data != -12000)
        ds.DEPH.values[~inv_depth_idx] = ds.DEPH.values[inv_depth_idx]
    return ds


def format_attrs(attrs):
    attrs = {
        "Platform Code": attrs.get("platform_code"),
        "WMO Platform Code": attrs.get("wmo_platform_code"),
        "Platform Name": attrs.get("platform_name"),
        "Institution": attrs.get("institution"),
        "PI Name": attrs.get("creator_name"),
        "Data Center": attrs.get("DC_REFERENCE"),
        "Platform Type": attrs.get("wmo_instrument_type"),
        "WMO Instrument Type": attrs.get("wmo_instrument_type"),
    }
    formatted_attrs = {}
    for key, value in attrs.items():
        new_value = value
        if isinstance(new_value, bytes):
            new_value = new_value.decode("utf-8").strip()
        if isinstance(new_value, str):
            uft8 = new_value.encode('utf-8', errors='ignore')
            if b"\xef\xbf\xbd" in uft8:
                new_value = formatted_attrs["Platform Code"]
            else:
                new_value = uft8.decode("utf-8").strip()
        formatted_attrs[key] = new_value
    formatted_attrs = {key: value for key, value in formatted_attrs.items() if value and value.strip()}
    return formatted_attrs


def import_obs_data(file, variables, platform_type):
    ds = xr.open_dataset(file).drop_duplicates("TIME")

    variables = [v for v in variables if v in ds.variables]
    if len(variables) == 0:
        return pd.DataFrame(), {}, []

    if platform_type == "DB":
        ds = fix_drifter_depths(ds)

    df = (
        ds[["TIME", "LATITUDE", "LONGITUDE", *variables]]
        .to_dataframe()
        .reset_index()
    )

    # calculate depths if missing
    if "DEPTH" not in ds.variables and "DEPH" not in ds.variables and "PRES" in ds.variables:
        if "DEPTH" not in df.columns:
            df["DEPTH"] = 0.0
        df["DEPTH"] = df["DEPTH"].astype(float)
        for idx, row in df.iterrows():
            depth = gsw.conversions.z_from_p(
                -row.PRES,
                row.LATITUDE,
            )
            df.loc[idx, "DEPTH"] = depth
    elif "DEPH" in ds.variables:
        df["DEPTH"] = df["DEPH"]

    new_cols = {
        "TIME": "time",
        "DEPTH": "depth",
        "LATITUDE": "latitude",
        "LONGITUDE": "longitude",
    }
    for col in df.columns:
        if col in variables:
            new_cols[col] = ds[col].standard_name

    df.rename(columns=new_cols, inplace=True)

    if "depth" not in df.columns and platform_type == "DB":
        df["depth"] = 0.0

    if "TRAJECTORY" in df.columns:
        df.drop(columns=["TRAJECTORY"], inplace=True)

    if "DEPH" in df.columns:
        df.drop(columns=["DEPH"], inplace=True)

    df = pd.melt(
        df,
        id_vars=["time", "depth", "latitude", "longitude"],
        var_name="datatype_key",
    ).sort_values(by=["time", "depth"], ignore_index=True)
    df.time = df.time.dt.floor("s")
    df.dropna(inplace=True)

    var_metadata = [{
        "key": ds[v].standard_name,
        "name": ds[v].long_name,
        "unit": ds[v].units
    } for v in variables]

    attrs = format_attrs(ds.attrs)

    return df, attrs, var_metadata


def add_datatypes(engine, variables, var_metadata):
    with Session(engine) as session:
        db_datatypes = session.execute(select(DataType)).all()
        db_datatype_keys = [dt[0].key for dt in db_datatypes]

        for variable in var_metadata:
            if variable["key"] not in db_datatype_keys:
                dt = DataType(
                    key=variable["key"],
                    name=variable["name"],
                    unit=variable["unit"],
                )
                session.add(dt)

        session.commit()


def add_platform(engine, attrs, platform_type):
    platform_schema = None

    match platform_type:
        case "GL":
            platform_schema = Platform.Type.glider
        case "DB":
            platform_schema = Platform.Type.drifter
        case "PF":
            platform_schema = Platform.Type.argo
        case "CT":
            platform_schema = Platform.Type.mission

    platform = Platform(type=platform_schema, unique_id=f"{attrs["Platform Code"]}")
    platform.attrs = attrs

    with Session(engine) as session:
        try:
            session.add(platform)
            session.commit()
            platform_id = platform.id
        except IntegrityError as e:
            print("Error committing platform.")
            print(e)
            session.rollback()

            stmt = select(Platform.id).where(
                Platform.unique_id == attrs["Platform Code"]
            )
            platform_id = session.execute(stmt).first()[0]

    return platform_id


def add_stations(df, engine):
    station_df = df[["platform_id", "time", "latitude", "longitude"]]
    station_df.drop_duplicates(inplace=True)

    with Session(engine) as session:
        station_df.to_sql(
            name="stations",
            con=session.connection(),
            if_exists="append",
            index=False,
            chunksize=100,
            method=insert_stations,
        )

        station_df["station_id"] = None

        station_df = station_df.apply(get_station_ids, axis=1, session=session)

        df = pd.merge(df, station_df)

    return df


def add_samples(df, engine):
    samples_df = df[["station_id", "depth", "value", "datatype_key"]]

    with Session(engine) as session:
        samples_df.to_sql(
            name="samples",
            con=session.connection(),
            if_exists="append",
            index=False,
            chunksize=100,
            method=insert_samples,
        )


def import_cmems_obs(uri, file_list, platform_type):

    engine = create_engine(
        uri,
        connect_args={"connect_timeout": 10},
        pool_recycle=3600,
    )

    if isinstance(file_list, str):
        file_list = [file_list]

    variables = get_platform_variables(platform_type)

    for file in file_list:
        print(f"Importing file: {file}")
        df, attrs, var_metadata = import_obs_data(file, variables, platform_type)
        if len(df) == 0:
            print(f"No valid variables found in file: {file}. Skipping.")
            continue

        add_datatypes(engine, variables, var_metadata)

        platform_id = add_platform(engine, attrs, platform_type)
        df["platform_id"] = platform_id

        df = add_stations(df, engine)
        add_samples(df, engine)

    engine.dispose()


def import_cmems_obs_mp(uri, file_list, platform_type):
    inputs = list(itertools.product([uri], file_list, [platform_type]))
    with multiprocessing.Pool(processes=4) as pool:
        pool.starmap(import_cmems_obs, inputs)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="CMEMS Obs script",
        description="Add CMEMS Observation data to ONAV Obs database.",
    )
    parser.add_argument("uri", type=str, help="URI of the observation database.")
    parser.add_argument("filename", type=str, help="Path to the observation NetCDF file.")
    parser.add_argument("platform_type", type=str, help="Type of platform: GL, DB, PF, CT.")
    args = parser.parse_args()

    import_cmems_obs([args.uri, args.filename, args.platform_type])
