import argparse
import pickle
import sys
from pathlib import Path

import cartopy.crs as ccrs
import matplotlib.pyplot as plt
import numpy as np
from shapely import Polygon, simplify
from skimage import measure, morphology

parent_dir = str(Path(__file__).resolve().parent.parent)
sys.path.append(parent_dir)

from oceannavigator.dataset_config import DatasetConfig
from data import open_dataset


def generate_perimeters(
    dataset_keys: list[str] | None = None, save_fig: bool = False
) -> None:
    if not dataset_keys:
        print("No dataset keys provided, generating all perimeters.")
        dataset_keys = DatasetConfig.get_datasets()

    for dataset_key in dataset_keys:
        print(f"Generating perimeter of dataset {dataset_key}.")

        try:
            dataset_config = DatasetConfig(dataset_key)
        except KeyError:
            print(f"No configuration found for dataset key {dataset_key}. Skipping.")
            continue

        try:
            with open_dataset(dataset_config) as dataset:
                ds = dataset.nc_data.dataset

                variables = list(ds.data_vars)
                variable = ds[variables[0]]

            # get surface level data
            if len(variable.dims) == 3:
                surface_data = variable[-1, :, :].load()
            elif len(variable.dims) == 2:
                surface_data = variable.load()
            else:
                surface_data = variable[-1, 0, :, :].load()
        except Exception:
            print(f"Could not extract data for {dataset_key}.")
            continue

        # create binary mask from data
        binary_mask = np.where(np.isnan(surface_data.data), 0, 1)
        binary_mask = np.pad(
            binary_mask, 1
        )  # pad the mask so that the edges will be included in the perimeter

        # create a convex hull mask
        ch_mask = morphology.convex_hull_image(binary_mask)

        # get the contours from the mask
        contours = measure.find_contours(ch_mask, level=0)

        # select the first contour for our perimeter (the first element should be the
        # one we're interested in but you'll have to confirm yourself)
        perim_y, perim_x = np.transpose(contours[0]).astype(int)

        # shift coordinates on array edges so that we're not selecting the padded
        # portion
        height, width = ch_mask.shape

        perim_y[perim_y == 0] = 1
        perim_y[perim_y >= height - 1] = height - 2

        perim_x[perim_x == 0] = 1
        perim_x[perim_x >= width - 1] = width - 2

        # Select the actual lon lat values
        lat_var = ds[dataset_config.lat_var_key].load()
        lon_var = ds[dataset_config.lon_var_key].load()
        dim = lat_var.ndim

        if dim == 2:
            pad_lat = np.pad(lat_var.data, 1)
            pad_lon = np.pad(lon_var.data, 1)
            lon_mesh = lon_var.data
            lat_mesh = lat_var.data

        elif dim == 1:
            lon_mesh, lat_mesh = np.meshgrid(ds.longitude.data, ds.latitude.data)
            pad_lat = np.pad(lat_mesh, 1)
            pad_lon = np.pad(lon_mesh, 1)

        perim_lat = pad_lat[perim_y, perim_x]
        perim_lon = pad_lon[perim_y, perim_x]
        perim_coords = np.stack([perim_lon, perim_lat], axis=1)
        perim_poly = Polygon(perim_coords)

        # check if perimeter is self intersecting (i.e. polar projection)
        if not perim_poly.is_valid:
            min_lon = perim_lon.min()
            max_lon = perim_lon.max()

            pt_lat = 90
            if len(perim_lat[perim_lat > 0]) < len(perim_lat[perim_lat < 0]):
                pt_lat = -90

            perim_coords = perim_coords[perim_coords[:, 0].argsort()]
            perim_coords = np.insert(perim_coords, 0, [[min_lon, pt_lat]], axis=0)
            perim_coords = np.append(perim_coords, [[max_lon, pt_lat]], axis=0)
            perim_poly = Polygon(perim_coords)

        perim_poly = simplify(perim_poly, 0)

        with open(f"{dataset_key}.pkl", "wb") as f:
            pickle.dump(perim_poly, f)

        if save_fig:
            print(f"Saving validation image for {dataset_key}.")
            fig = plt.figure()
            ax = fig.add_subplot(1, 1, 1, projection=ccrs.PlateCarree())

            ax.coastlines()

            ax.pcolormesh(
                lon_var.data,
                lat_var.data,
                surface_data,
                transform=ccrs.PlateCarree(),
                cmap="viridis",
                shading="auto",
            )
            ax.plot(
                perim_poly.exterior.xy[0],
                perim_poly.exterior.xy[1],
                transform=ccrs.PlateCarree(),
                color="red",
            )

            plt.savefig(f"{dataset_key}_perimeter.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="Generate dataset perimeters.",
        description="""
            Extracts dataset perimeter from NetCDF data and writes to a pickle file.
            If no dataset keys are provided then this script will generate perimeter
             files for all datasets in the configuration file."
        """,
    )
    parser.add_argument(
        "-d",
        "--dataset_keys",
        type=str,
        help="Keys of datasets to generate perimeters for. (Optional)",
        nargs="+",
        default=None,
    )
    parser.add_argument(
        "-s",
        "--save_image",
        action="store_true",
        help="Saves an image of the generated perimeter and extracted data for "
        "vaidation. (Optional)",
    )

    args = parser.parse_args()

    generate_perimeters(args.dataset_keys, args.save_image)
