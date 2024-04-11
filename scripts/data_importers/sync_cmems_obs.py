import defopt
import os
import sys
from datetime import datetime

import copernicusmarine

import cmems_argo
import cmems_drifter
import cmems_glider
import cmems_nafc_ctd

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)


def main(
    uri: str,
    output_dir: str,
):
    """
    Downloads today's data for the observation types given in obs_types then adds that
    data to the observation database.
    Args:
        uri: The URI string of the MariaDB Observation database
        output_dir: The directory that you want to save the data to.

    Arguments should be passed on commandline. e.g.
        python scripts/data_importers/sync_cmems_obs.py "mysql://usr:pwd@address/database" "/data/nrt.cmems-du.eu/"

    Observation types are:
        GL: glider
        DB: drifter
        PF: profiling float (argo)
        CT: CTD
    """

    obs_types = ["GL", "DB", "PF", "CT"]

    timestamp = datetime.today().strftime("%Y%m%d")

    for obs in obs_types:
        obs_filter = f"{timestamp}/*_*_{obs}*.nc"
        file_list = copernicusmarine.get(
            dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
            output_directory=output_dir,
            filter=obs_filter,
            force_download=True,
            overwrite_output_data=True,
            dataset_part="latest",
        )

        # Call the appropriate function for the observation type
        if "GL" in obs_filter:
            cmems_glider.main(uri, file_list)
        elif "DB" in obs_filter:
            cmems_drifter.main(uri, file_list)
        elif "PF" in obs_filter:
            cmems_argo.main(uri, file_list)
        elif "CT" in obs_filter:
            cmems_nafc_ctd.main(uri, file_list)


if __name__ == "__main__":
    defopt.run(main)
