import defopt
import os

import copernicusmarine

import cmems_argo
import cmems_drifter
import cmems_glider
import cmems_ctd


def main(uri: str, output_dir: str):
    """
    Downloads historical CMEMS observation data for the observation types
    given in obs_types to initialize the observation database. Deletes
    dowloaded files after data is added.
    Arguments should be passed on commandline. e.g.
    python scripts/data_importers/init_cmems_obs.py "mysql://usr:pwd@address/database" "/data/nrt.cmems-du.eu/"

    :param uri: The URI string of the MariaDB Observation database
    :param output_dir: The directory that you want to save the data to.
    """

    obs_types = ["GL", "DB", "PF", "CT"]

    for obs in obs_types:
        obs_filter = f"{obs}/*.nc"
        file_list = copernicusmarine.get(
            dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
            output_directory=output_dir,
            filter=obs_filter,
            force_download=True,
            overwrite_output_data=True,
            dataset_part="history",
        )

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
    defopt.run(main)