import defopt
import glob

import cmems_argo
import cmems_drifter
import cmems_glider
import cmems_ctd


def main(uri: str, output_dir: str):

    obs_types = ["GL", "DB", "PF", "CT"]

    for obs in obs_types:
        root_dir = (
            output_dir
            + "INSITU_GLO_PHYBGCWAV_DISCRETE_MYNRT_013_030/"
            + "cmems_obs-ins_glo_phybgcwav_mynrt_na_irr_202311/history"
        )

        files = glob.glob(f"{root_dir}/{obs}/*.nc")

        for file in files:
            print(file)
            if "GL" in obs:
                cmems_glider.main(uri, file)
            elif "DB" in obs:
                cmems_drifter.main(uri, file)
            elif "PF" in obs:
                cmems_argo.main(uri, file)
            elif "CT" in obs:
                cmems_ctd.main(uri, file)


if __name__ == "__main__":
    defopt.run(main)
