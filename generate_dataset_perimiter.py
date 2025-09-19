import os

import pickle
import shutil
import shapely
import cartopy.crs as ccrs
import cartopy.geodesic as cgeo
import cartopy.vector_transform as cvt
import matplotlib.pyplot as plt
import numpy as np
import xarray as xr
from shapely import prepare, Point, Polygon
from shapely.validation import make_valid
from skimage import measure, morphology
import sqlite3
import sys
import defopt

current = os.path.dirname(os.path.realpath(__file__))
parent = os.path.dirname(os.path.dirname(current))
sys.path.append(parent)

from oceannavigator.dataset_config import DatasetConfig
from data import open_dataset
from data.sqlite_database import SQLiteDatabase


def shapeGenerator(dataset_keys: list[str] = None):
    print(dataset_keys)
    if not dataset_keys:
        dataset_keys = DatasetConfig.get_datasets()
    for dataset in dataset_keys:
        config = DatasetConfig(dataset)
        url = config.url
        if not isinstance(config.url, list) and config.url.endswith(".sqlite3"):
            with SQLiteDatabase(url) as db:
                variable_list = db.get_data_variables()
                variable = variable_list[0].key
                timestamp = db.get_latest_timestamp(variable)
                files = db.get_netcdf_files([timestamp], [variable])
                src_path = files[-1]
                filename = os.path.basename(src_path)
                if not os.path.exists(filename):
                    shutil.copy(src_path, filename)
                ds = xr.open_dataset(filename)
                var = ds[variable]
        else:
            if not isinstance(config.url, list):
                data = xr.open_mfdataset([config.url])
            else:
                data = xr.open_mfdataset(config.url)
        # get surface level data
        if len(ds.dims) == 3:
            surface_data = var[0, :, :].data
        elif len(ds.dims) == 2:
            surface_data = var.data
        else:
            surface_data = var[0, 0, :, :].data

        # create binary mask from data
        binary_mask = np.where(np.isnan(surface_data), 0, 1)
        binary_mask = np.pad(
            binary_mask, 1
        )  # pad the mask so that the edges will be included in the perimeter

        # create a convex hull mask
        ch_mask = morphology.convex_hull_image(binary_mask)

        # get the contours from the mask
        contours = measure.find_contours(ch_mask, level=0)

        # select the first contour for our perimeter (the first element should be the one we're interested in but you'll have to confirm yourself)
        perim_y, perim_x = np.transpose(contours[0]).astype(int)

        # shift coordinates on array edges so that we're not selecting the padded portion
        height, width = ch_mask.shape

        perim_y[perim_y == 0] = 1
        perim_y[perim_y >= height - 1] = height - 2

        perim_x[perim_x == 0] = 1
        perim_x[perim_x >= width - 1] = width - 2

        # second version
        lat_var = ds.get("latitude", ds.get("lat"))
        lon_var = ds.get("longitude", ds.get("lon"))
        dim = lat_var.ndim
        # Select that actual lon lat values
        if dim == 2:
            pad_lat = np.pad(lat_var.data, 1)
            pad_lon = np.pad(lon_var.data, 1)
            lon_mesh = lon_var.data
            lat_mesh = lat_var.data

        elif dim == 1:
            lon_mesh, lat_mesh = np.meshgrid(ds.longitude.data, ds.latitude.data)
            pad_lat = np.pad(lat_mesh, 1)
            pad_lon = np.pad(lon_mesh, 1)

        pts = np.stack([lon_mesh, lat_mesh], axis=2)
        pts = np.apply_along_axis(lambda pt: Point(pt), 2, pts)
        perim_lat = pad_lat[perim_y, perim_x]
        perim_lon = pad_lon[perim_y, perim_x]
        perim_poly = Polygon(np.stack([perim_lon, perim_lat], axis=1))

        idx = np.argmax(np.abs(np.diff(perim_lon)))
        if shapely.is_simple(perim_poly) == False:
            new_lons = [360, 360, 0, 0]
            new_lats = [perim_lat[idx], 90, 90, perim_lat[idx + 1]]
            perim_lon = np.insert(perim_lon, idx + 1, new_lons)
            perim_lat = np.insert(perim_lat, idx + 1, new_lats)

        name = dataset + ".pkl"
        with open(name, "wb") as f:
            pickle.dump(perim_poly, f)


if __name__ == "__main__":
    defopt.run(shapeGenerator)
