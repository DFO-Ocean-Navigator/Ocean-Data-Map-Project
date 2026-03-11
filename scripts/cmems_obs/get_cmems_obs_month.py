import argparse
import os
from datetime import date, datetime, timedelta

import copernicusmarine

from import_cmems_obs import import_cmems_obs_mp


def main(uri: str, output_dir: str, month_key: str):
    """
    Downloads one month of CMEMS monthly observation data to append to the observation
    database. Deletes dowloaded files after data is added. Arguments should be passed
    on commandline. e.g:
    python scripts/data_importers/get_cmems_month.py "db_uri" "/output_dir/" "month_key"

    :param uri: The URI string of the MariaDB Observation database
    :param output_dir: The directory that you want to save the data to.
    :param month_key: The month in YYYYMM format
    """

    prod_id = "INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030"
    meta = copernicusmarine.describe(product_id=prod_id)
    version = [v.label for v in meta.products[0].datasets[0].versions][-1]

    obs_types = ["GL", "DB", "PF", "CT"]

    for obs in obs_types:
        obs_filter = f"*/{month_key}/{obs}/*.nc"
        resp = copernicusmarine.get(
            dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
            dataset_version=version,
            output_directory=output_dir,
            filter=obs_filter,
            dataset_part="monthly",
            sync=True,
        )
        file_list = [f.file_path for f in resp.files]

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
        "-m",
        "--month",
        type=str,
        help=(
            "The month to add in YYYYMM format. If omitted then all months from 2017 "
            "onward will be downloaded."
        ),
        default=None,
    )

    args = parser.parse_args()

    if args.month:
        main(args.uri, args.output_dir, args.month)
    else:
        start_month = date.today().replace(day=1)
        end_month = datetime(2017, 1, 1)
        while end_month >= end_month:
            month_key = start_month.strftime("%Y%m")

            main(args.uri, args.output_dir, month_key)

            start_month = (start_month - timedelta(days=28)).replace(day=1)
