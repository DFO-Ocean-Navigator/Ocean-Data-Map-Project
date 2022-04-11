import hashlib
import os
import pickle
import threading

import cartopy.crs as ccrs
import cartopy.io.shapereader as shpreader
import matplotlib.pyplot as plt
from flask import current_app
from typing import Union


def get_resolution(height: float, width: float) -> str:
    area = height * width / 1e6

    if area < 1e8:
        return "f"  # full resolution
    elif area < 1e12:
        return "i"  # intermediate resolution
    else:
        return "c"  # crude resolution


def _get_shapefile(resolution: str) -> shpreader.BasicReader:

    if resolution == "f":
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "ne_10m_diff.shp"
        )
    elif resolution == "i":
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "ne_50m_diff.shp"
        )
    else:
        land_shp = shpreader.BasicReader(
            current_app.config["SHAPE_FILE_DIR"] + "ne_110m_diff.shp"
        )

    return land_shp


def load_map(
    plot_proj: ccrs, extent: list, figuresize: list, dpi: int, plot_resolution: str
) -> Union[plt.figure, plt.axes]:

    CACHE_DIR = current_app.config["CACHE_DIR"]
    filename = _get_filename(plot_proj.proj4_params["proj"], extent)
    filename = "".join([CACHE_DIR, "/", filename])

    land_shp = _get_shapefile(plot_resolution)

    if not os.path.exists(filename):

        try:
            fig, map_plot = pickle.load(open(filename))
        except:
            fig = plt.figure(figsize=figuresize, dpi=dpi)

            map_plot = plt.axes(projection=plot_proj, facecolor="dimgrey")
            map_plot.set_extent(extent, crs=plot_proj)

            map_plot.add_geometries(
                land_shp.geometries(),
                crs=ccrs.PlateCarree(),
                facecolor="grey",
                edgecolor="black",
            )

            map_plot.gridlines(
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

            t = threading.Thread(target=do_pickle, args=(fig, map_plot, filename))
            t.daemon = True
            t.start()
    else:
        fig, map_plot = pickle.load(open(filename, "rb"))

    return fig, map_plot


def _get_filename(projection: str, extent: list) -> str:
    hash = hashlib.sha1(
        ";".join(str(x) for x in [projection] + extent).encode()
    ).hexdigest()
    return hash + ".pickle"
