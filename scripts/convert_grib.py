import getopt
import os
import sys

import xarray as xr

var_names = {
    "SWHSSWEL": "Significant wave height of second swell partition",
    "SWHFSWEL": "Significant wave height of first swell partition",
    "PWPSSWEL": "Peak wave period of second swell partition",
    "PWPFSWEL": "Peak wave period of first swell partition",
    "PWAVEDIR": "Peak wave direction",
    "PPERWW": "Peak period of wind waves",
    "MWDSSWEL": "Mean wave direction of second swell partition",
    "MWDFSWEL": "Mean wave direction of first swell partition",
}


def main(input_file: str = None, input_dir: str = None, output_dir: str = None) -> None:

    if input_dir:
        grib_files = []
        for root, dirs, files in os.walk(input_dir):
            for file in files:
                if file.endswith(".grib2"):
                    grib_files.append(f"{root}/{file}")
    else:
        grib_files = [input_file]

    for grib in grib_files:
        file_name = grib.split("/")[-1]

        if input_dir:
            wrk_dir = output_dir + grib.replace(input_dir, "").replace(file_name, "")
        elif input_file:
            wrk_dir = output_dir + grib.replace(file_name, "")
        wrk_dir.replace("//", "")

        if not os.path.exists(wrk_dir):
            os.makedirs(wrk_dir)

        wrk_file = wrk_dir + file_name
        out_name = wrk_file.replace(".grib2", ".nc")
        os.system(f"cp {grib} {wrk_file}")

        ds = xr.open_dataset(wrk_file)
        ds["time"].data = ds["time"].data + ds["step"]
        if any(var in file_name for var in var_names):
            pass
        else:
            variables = list(ds.keys())
            for v in variables:
                ds[v] = ds[v].expand_dims(("time"), axis=[0])
        ds.to_netcdf(out_name)

        files = os.listdir(wrk_dir)
        for f in files:
            if f.endswith(".grib2") or f.endswith(".idx"):
                os.remove(wrk_dir + f)


if __name__ == "__main__":

    try:
        opts, args = getopt.getopt(
            sys.argv[1:],
            ":f:d:o:",
        )
    except getopt.GetoptError as err:
        print(err)
        sys.exit()

    input_file = None
    input_dir = None
    output_dir = None

    for o, a in opts:
        if o == "-f":
            input_file = a
        elif o == "-d":
            input_dir = a
        elif o == "-o":
            output_dir = a

    if input_file and input_dir:
        print("Please provide only one of input file (-f) and input directory (-d)")
        sys.exit()
    if not input_file and not input_dir:
        print("Please provide either input file (-f) or input directory (-d)")
        sys.exit()
    if not output_dir:
        print("Please provide an output path (-o)")
        sys.exit()

    main(input_file, input_dir, output_dir)
