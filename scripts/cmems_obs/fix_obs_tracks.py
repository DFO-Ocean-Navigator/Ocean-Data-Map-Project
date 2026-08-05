import argparse

import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.dialects.mysql import insert


def mysql_upsert(table, conn, keys, data_iter):
    data = [dict(zip(keys, row)) for row in data_iter]
    stmt = insert(table.table).values(data)
    update_stmt = stmt.on_duplicate_key_update(**{c.name: c for c in stmt.inserted})
    conn.execute(update_stmt)


def main(uri: str, platform_ids: str | list | None = None):
    """
    Corrects station coordinates at crossing of date line so that tracks are displayed
    continuously in the Navigator. Arguments should be passed on commandline. e.g:
    python scripts/data_importers/get_cmems_month.py "uri" -p 12345 45678

    :param uri: The URI string of the MariaDB Observation database
    :param platform_ids: IDs of platforms to be corrected. If not provided all
                        platforms will be updated.
    """

    engine = create_engine(uri)

    if isinstance(platform_ids, str):
        platform_ids = [platform_ids]
    elif platform_ids is None:
        platforms = pd.read_sql("SELECT * FROM platforms;", con=engine)
        platform_ids = platforms.id.values

    for platform_id in platform_ids:
        stations = pd.read_sql(
            f"SELECT * FROM stations where platform_id={platform_id};",
            con=engine,
            index_col="id",
        ).sort_values(by="time")

        corrected_lon = np.copy(stations.longitude.values)
        diffs = np.diff(corrected_lon)
        crossings = np.where(np.abs(diffs) > 180)[0]

        if len(crossings) > 0:
            print(f"Updating track of platform {platform_id}.")

            for crossing in crossings:
                if diffs[crossing] > 0:
                    corrected_lon[crossing + 1 :] -= 360
                else:
                    corrected_lon[crossing + 1 :] += 360
            stations.longitude = corrected_lon
            stations.to_sql(
                "stations", engine, if_exists="append", method=mysql_upsert, index=False
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="Initialize/append CMEMS Observation data",
        description=(
            "Add monthly CMEMS Global Ocean In-Situ Near-Real-Time "
            "Observations data to ONAV Obs database."
        ),
    )
    parser.add_argument("uri", type=str, help="URI of the observation database.")
    parser.add_argument(
        "-p",
        "--platform_ids",
        type=str,
        help="ID of platforms to modify.",
        default=None,
    )

    args = parser.parse_args()

    main(args.uri, args.platform_ids)
