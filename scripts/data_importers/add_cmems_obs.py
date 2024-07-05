import defopt
import glob
import os

import cmems_argo
import cmems_drifter
import cmems_glider
import cmems_nafc_ctd


def main(uri: str, output_dir: str):

    obs_types = ["GL"]#, "DB", "PF", "CT"]

    for obs in obs_types:
        root_dir = (
            output_dir
            + "INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030/"
            + "cmems_obs-ins_glo_phybgcwav_mynrt_na_irr_202311/history/"
        )
        obs_dir = root_dir + obs

        # files = glob.glob(f"{obs_dir}/*.nc")

        files = ["/data/cmems_obs/INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030/cmems_obs-ins_glo_phybgcwav_mynrt_na_irr_202311/history/GL/GL_PR_GL_6800166.nc"]

        for file in files:
            print(file)
            if "GL" in obs:
                cmems_glider.main(uri, file)
            elif "DB" in obs:
                cmems_drifter.main(uri, file)
            elif "PF" in obs:
                cmems_argo.main(uri, file)
            elif "CT" in obs:
                cmems_nafc_ctd.main(uri, file)
            # os.remove(file)


if __name__ == "__main__":
    main(
        "mysql://nav-write:hAReCT*L7fVZzd!F#A9T@142.130.125.20/navigator",
        "/data/cmems_obs/",
    )
    # defopt.run(main)
