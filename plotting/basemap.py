import hashlib
import os
import pickle
import threading

import cartopy.crs as ccrs
import cartopy.io.shapereader as shpreader
import matplotlib.pyplot as plt
import numpy as np
import shapely.geometry as sgeom
from flask import current_app
from typing import Union


def get_resolution(height: float, width: float) -> str:
    area = height * width / 1e6

    if area < 1e5:
        return "f"  # full resolution
    elif area < 1e12:
        return "i"  # intermediate resolution
    else:
        return "c"  # crude resolution


def _get_land_geoms(resolution: str, extent: list) -> shpreader.BasicReader:

    if resolution == "f":
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "/ne_10m_diff.shp"
        )
    elif resolution == "i":
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "/ne_50m_diff.shp"
        )
    else:
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "/ne_110m_diff.shp"
        )

    # crop land geometries to plot extent
    bbox = sgeom.box(*extent)
    geoms = [geom.intersection(bbox) for geom in land_shp.geometries()]

    return geoms


def load_map(
    plot_proj: ccrs, extent: list, figuresize: list, dpi: int, plot_resolution: str
) -> Union[plt.figure, plt.axes]:

    CACHE_DIR = current_app.config["CACHE_DIR"]
    filename = _get_filename(plot_proj.proj4_params["proj"], extent)
    filename = "".join([CACHE_DIR, "/", filename])

    pc_proj = ccrs.PlateCarree()
    pc_extent = pc_proj.transform_points(
        plot_proj, np.array(extent[:2]), np.array(extent[2:])
    )
    pc_extent = [
        pc_extent[0, 0] - 5,
        pc_extent[0, 1] - 5,
        pc_extent[1, 0] + 5,
        pc_extent[1, 1] + 5,
    ]

    land_geoms = _get_land_geoms(plot_resolution, pc_extent)

    if not os.path.exists(filename):

        fig = plt.figure(figsize=figuresize, dpi=dpi)
        ax = plt.axes(projection=plot_proj, facecolor="dimgrey")
        ax.set_extent(extent, crs=plot_proj)

        ax.add_geometries(
            land_geoms,
            crs=pc_proj,
            facecolor="grey",
            edgecolor="black",
        )

        ax.gridlines(
            draw_labels={"bottom": "x", "left": "y"},
            dms=True,
            x_inline=False,
            y_inline=False,
            xlabel_style={"size": 10, "rotation": 0},
            ylabel_style={"size": 10},
            zorder=2,
        )

        def do_pickle(fig, ax, filename: str) -> None:
            pickle.dump((fig, ax), open(filename, "wb"), -1)

        if not os.path.isdir(CACHE_DIR):
            os.makedirs(CACHE_DIR)

        t = threading.Thread(target=do_pickle, args=(fig, ax, filename))
        t.daemon = True
        t.start()
    else:
        fig, ax = pickle.load(open(filename, "rb"))

    return fig, ax


def _get_filename(projection: str, extent: list) -> str:
    hash = hashlib.sha1(
        ";".join(str(x) for x in [projection] + extent).encode()
    ).hexdigest()
    return hash + ".pickle"
