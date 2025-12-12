import argparse
import datetime
import os

import copernicusmarine

import cmems_argo
import cmems_drifter
import cmems_glider
import cmems_ctd


def main(uri: str, output_dir: str, date: str = None):
    """
    Downloads monthly CMEMS observation data for the observation types
    given in obs_types to initialize or append to the observation database. Deletes
    dowloaded files after data is added.
    Arguments should be passed on commandline. e.g.
    python scripts/data_importers/init_cmems_obs.py "mysql://usr:pwd@address/database" "/data/nrt.cmems-du.eu/"

    :param uri: The URI string of the MariaDB Observation database
    :param output_dir: The directory that you want to save the data to.
    :param date: The datestring to download in YYYYMM format. If None current date will be used.
    """

    prod_id = "INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030"
    meta = copernicusmarine.describe(product_id=prod_id)
    version = [v.label for v in meta.products[0].datasets[0].versions][-1]

    if not date:
        date = datetime.date.today().strftime("%Y%m")

    obs_types = ["GL", "DB", "PF", "CT"]

    for obs in obs_types:
        obs_filter = f"{obs}/{date}/*.nc"
        resp = copernicusmarine.get(
            dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
            dataset_version=version,
            output_directory=output_dir,
            filter=obs_filter,
            dataset_part="monthly",
            sync=True,
        )
        file_list = [f.file_path for f in resp.files]

        # Call the appropriate function for the observation type
        if "GL" in obs_filter:
            cmems_glider.main(uri, file_list)
        elif "DB" in obs_filter:
            cmems_drifter.main(uri, file_list)
        elif "PF" in obs_filter:
            cmems_argo.main(uri, file_list)
        elif "CT" in obs_filter:
            cmems_ctd.main(uri, file_list)

        for file in file_list:
            os.remove(file)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="Initialize/append CMEMS Observation data",
        description="Add monthly CMEMS Global Ocean- In-Situ Near-Real-Time Observations data to ONAV Obs database.",
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
        help="Month timestamp to filter obsesrvation data by YYYYMM format (optional)",
    )
    args = parser.parse_args()

    main(args.uri, args.output_dir, args.date)
