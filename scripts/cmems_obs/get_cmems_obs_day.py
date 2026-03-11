import argparse
import os
from datetime import date, timedelta

import copernicusmarine

from import_cmems_obs import import_cmems_obs_mp


def main(uri: str, output_dir: str, date_str: str):
    """
    Downloads data from CMEMS latest observation dataset matching the provided date
    string to add to the observation database.
    Deletes dowloaded files after data is added. Arguments should be passed on
    commandline. e.g:
    python scripts/data_importers/init_cmems_obs.py "db_uri" "/output_dir/"

    :param uri: The URI string of the MariaDB Observation database
    :param output_dir: The directory that you want to save the data to.
    :param date_str: The date in YYYYMMDD format.
    """

    prod_id = "INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030"
    meta = copernicusmarine.describe(product_id=prod_id)
    version = [v.label for v in meta.products[0].datasets[0].versions][-1]

    obs_types = ["GL", "DB", "PF", "CT"]

    for obs in obs_types:
        print(obs)
        obs_filter = f"*/{date_str}/*_*_{obs}_*_*.nc"
        resp = copernicusmarine.get(
            dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
            dataset_version=version,
            output_directory=output_dir,
            filter=obs_filter,
            dataset_part="latest",
            sync=True,
        )
        file_list = [f.file_path for f in resp.files]

        if len(file_list) == 0:
            continue

        try:
            import_cmems_obs_mp(uri, file_list, obs)

            for file in file_list:
                os.remove(file)
        except Exception as e:
            print(e)
            with open("obs_error.log", "a") as f:
                f.write(f"{obs_filter}\n")
                f.write("\n")


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
        "output_dir",
        type=str,
        help="Output directory for observation data.",
    )
    parser.add_argument(
        "-d",
        "--date",
        type=str,
        help=(
            "The date to add in YYYYMMDD format. If omitted then yesterday's date "
            "will be used."
        ),
        default=None,
    )

    args = parser.parse_args()

    if args.date:
        main(args.uri, args.output_dir, args.date)
    else:
        date_str = (date.today() - timedelta(days=1)).strftime("%Y%m%d")
        main(args.uri, args.output_dir, date_str)
