import hashlib
import pickle
import threading
from pathlib import Path
from typing import Union

import cartopy.crs as ccrs
import cartopy.feature as cfeature
import cartopy.io.shapereader as shpreader
import matplotlib.pyplot as plt
import numpy as np
import shapely.geometry as sgeom

from oceannavigator.settings import get_settings

settings = get_settings()


def get_resolution(height: float, width: float) -> str:
    area = height * width / 1e8

    if area < 2e5:
        return "10m"  # full resolution
    elif area < 2e6:
        return "50m"  # intermediate resolution
    else:
        return "110m"  # crude resolution

def _get_land_geoms(resolution: str, extent: list) -> list:

    shp_file = f"/cartopy_resources/ne_{resolution}_diff.shp"
    try:
        land_shp = shpreader.BasicReader(settings.shape_file_dir + shp_file)
    except shpreader.shapefile.ShapefileException:
        land_shp = cfeature.NaturalEarthFeature("physical", "land", resolution)

    lon_min, lat_min, lon_max, lat_max = extent

    cropped = []
    if lon_min <= lon_max:
        # simple case
        bbox = sgeom.box(lon_min, lat_min, lon_max, lat_max)
        for geom in land_shp.geometries():
            inter = geom.intersection(bbox)
            if not inter.is_empty:
                cropped.append(inter)
    else:
        # crosses the line
        west_box = sgeom.box(lon_min, lat_min,  180, lat_max)
        east_box = sgeom.box(-180,    lat_min, lon_max, lat_max)
        for geom in land_shp.geometries():
            for bb in (west_box, east_box):
                inter = geom.intersection(bb)
                if not inter.is_empty:
                    cropped.append(inter)

    return cropped



def load_map(
    plot_proj: ccrs, extent: list, figuresize: list, dpi: int, plot_resolution: str
) -> Union[plt.figure, plt.axes]:

    CACHE_DIR = settings.cache_dir
    filename = _get_filename(plot_proj.proj4_params["proj"], extent)
    filename = Path(CACHE_DIR).joinpath(filename)

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

    if not filename.exists():
        fig = plt.figure(figsize=figuresize, dpi=dpi)
        ax = plt.axes(projection=plot_proj, facecolor="dimgrey")
        ax.set_extent(extent, crs=plot_proj)

        land_geoms = _get_land_geoms(plot_resolution, pc_extent)
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

        Path(CACHE_DIR).mkdir(parents=True, exist_ok=True)

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
