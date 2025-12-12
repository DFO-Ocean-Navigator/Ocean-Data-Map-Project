import argparse
import os
import sys

import gsw
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


def import_obs_data(file, variables):
    ds = xr.open_dataset(file).drop_duplicates("TIME")

    variables = [v for v in variables if v in ds.variables]
    df = (
        ds[["TIME", "LATITUDE", "LONGITUDE", *variables]]
        .to_dataframe()
        .reset_index()
        .dropna(axis=1, how="all")
        .dropna()
    )

    if "TRAJECTORY" in df.columns:
        df.drop(columns=["TRAJECTORY"], inplace=True)

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

    df = pd.melt(
        df,
        id_vars=["time", "depth", "latitude", "longitude"],
        var_name="datatype_key",
    ).sort_values(by=["time", "depth"], ignore_index=True)
    df.time = df.time.dt.floor("s")

    var_metadata = [{
        "key": ds[v].standard_name,
        "name": ds[v].long_name,
        "unit": ds[v].units
    } for v in variables]

    return df, ds.attrs, var_metadata


def add_datatypes(session, variables, var_metadata):
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


def add_platform(session, attrs, platform_type):
    platform_schema = None
    platform_attrs = {
        "Platform Code": attrs.get("platform_code"),
        "WMO Platform Code": attrs.get("wmo_platform_code"),
        "Platform Name": attrs.get("platform_name"),
        "Institution": attrs.get("institution"),
        "PI Name": attrs.get("creator_name"),
        "Data Center": attrs.get("DC_REFERENCE"),
        "Platform Type": attrs.get("wmo_instrument_type"),
        "WMO Instrument Type": attrs.get("wmo_instrument_type"),
    }

    match platform_type:
        case "GL":
            platform_schema = Platform.Type.glider
        case "DB":
            platform_schema = Platform.Type.drifter
        case "PF":
            platform_schema = Platform.Type.argo
        case "CT":
            platform_schema = Platform.Type.mission

    platform = Platform(type=platform_schema, unique_id=f"{attrs["platform_code"]}")
    platform.attrs = {key: value for key, value in platform_attrs.items() if value and value.strip()}

    try:
        session.add(platform)
        session.commit()
    except IntegrityError as e:
        print("Error committing platform.")
        print(e)
        session.rollback()

        stmt = select(Platform.id).where(
            Platform.unique_id == attrs["platform_code"]
        )
        platform.id = session.execute(stmt).first()[0]

    return platform


def add_stations(df, session):
    station_df = df[["platform_id", "time", "latitude", "longitude"]]
    station_df.drop_duplicates(inplace=True)

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


def add_samples(df, session):
    samples_df = df[["station_id", "depth", "value", "datatype_key"]]

    samples_df.to_sql(
        name="samples",
        con=session.connection(),
        if_exists="append",
        index=False,
        chunksize=100,
        method=insert_samples,
    )


def import_cmems_obs(url, file_list, platform_type):

    engine = create_engine(
        url,
        connect_args={"connect_timeout": 10},
        pool_recycle=3600,
    )

    if isinstance(file_list, str):
        file_list = [file_list]

    variables = get_platform_variables(platform_type)

    with Session(engine) as session:
        for file in file_list:
            df, attrs, var_metadata = import_obs_data(file, variables)

            add_datatypes(session, variables, var_metadata)

            platform = add_platform(session, attrs, platform_type)
            df["platform_id"] = platform.id

            df = add_stations(df, session)
            add_samples(df, session)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="CMEMS Obs script",
        description="Add CMEMS Observation data to ONAV Obs database.",
    )
    parser.add_argument("uri", type=str, help="URI of the observation database.")
    parser.add_argument("filename", type=str, help="Path to the observation NetCDF file.")
    parser.add_argument("platform_type", type=str, help="Type of platform: GL, DB, PF, CT.")
    args = parser.parse_args()

    import_cmems_obs(args.uri, args.filename, args.platform_type)
