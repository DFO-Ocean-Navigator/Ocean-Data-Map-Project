import copernicusmarine
import os
import sys
import glob
current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from scripts.data_importers import cmems_argo
from scripts.data_importers import cmems_drifter
from scripts.data_importers import cmems_glider
from scripts.data_importers import cmems_nafc_ctd


output_dir = "/home/ubuntu/onav-cloud/Ocean-Data-Map-Project/cmems_obs/"
obs_types = ["GL", "DB", "PF", "CT"]

for obs in obs_types:
    obs_filter = f"*_*_{obs}*.nc"
    # file_list = copernicusmarine.get(
    copernicusmarine.get(
        dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
        output_directory=output_dir,
        filter=obs_filter,
        force_download=True,
        overwrite_output_data=True,
        dataset_part="latest",
    )
    uri = "mysql://thakaren:thakaren@142.130.249.15/scriptTest"
    file_list = glob.glob(f"{output_dir}{filter}")
    
# Check the content of file_list and call the appropriate function
    if "GL" in file_list:
        cmems_glider.main(uri, file_list)
    elif "DB" in file_list:
        cmems_drifter.main(uri, file_list)
    elif "PF" in file_list:
        cmems_argo.main(uri, file_list)

    elif "CT" in file_list:
        cmems_nafc_ctd.main(uri, file_list)