import copernicusmarine

output_dir = "/home/ubuntu/onav-cloud/Ocean-Data-Map-Project/cmems_obs/"

obs_types = ["GL","DB","PF","CT"] 
    
for obs in obs_types:
    filter = f"*_*_{obs}*.nc"
    copernicusmarine.get(
        dataset_id="cmems_obs-ins_glo_phybgcwav_mynrt_na_irr",
        output_directory=output_dir,
        filter=filter,
        force_download=True,
        overwrite_output_data=True,
        dataset_part="latest",
    )
