import datetime
import re

import cartopy.crs as ccrs
import cartopy.feature as cfeature
import matplotlib.pyplot as plt
import numpy as np

from oceannavigator.settings import get_settings

settings = get_settings()


def get_filename(plot_type, dataset_name, extension):
    if extension == "stats":
        plot_type += "_statistics"
        extension = "csv"
    outname = [plot_type, dataset_name, datetime.datetime.now().isoformat()]

    return "%s.%s" % ("_".join(map(str, outname)), extension)


def get_mimetype(filetype: str):
    if filetype:
        filetype = filetype.lower()

    if filetype == "png":
        mime = "image/png"
    elif filetype == "jpeg":
        mime = "image/jpeg"
    elif filetype == "svg":
        mime = "image/svg+xml"
    elif filetype == "pdf":
        mime = "application/pdf"
    elif filetype == "ps":
        mime = "application/postscript"
    elif filetype == "tiff":
        mime = "image/tiff"
    elif filetype == "eps":
        mime = "application/postscript"
    elif filetype == "geotiff":
        mime = "image/geotifffloat64"
    elif filetype == "csv":
        mime = "text/csv"
    elif filetype == "odv":
        mime = "text/plain"
        filetype = "txt"
    elif filetype == "stats":
        mime = "text/csv"
    else:
        filetype = "png"
        mime = "image/png"

    return (filetype, mime)


def normalize_scale(data, variable_config):
    vmin = np.amin(data)
    vmax = np.amax(data)

    if variable_config.is_zero_centered:
        vmax = max(abs(vmax), abs(vmin))
        vmin = -vmax

    if variable_config.unit == "fraction":
        vmin = 0
        vmax = 1

    return vmin, vmax


def mathtext(text):
    if re.search(r"[Cc]elsius", text):
        text = re.sub(r"(degree[_ ])?[Cc]elsius", "\u00b0C", text)
    if re.search(r"[Kk]elvin", text):
        text = re.sub(r"(degree[_ ])?[Kk]elvin", "\u00b0K", text)
    if re.search(r"-[0-9]", text):
        text = re.sub(r" ([^- ])-1", r"/\1", text)
        text = re.sub(r" ([^- ])-([2-9][0-9]*)", r"/\1^\2", text)
        text = re.sub(r"([a-z]+)\^-([0-9]+)", r"/ \1^\2", text)
    if re.search(r"[/_\^\\]", text):
        return "$%s$" % text
    else:
        return text


# Plots point(s) on a map (called when "Show Location" is true)
def _map_plot(points, grid_loc, path=True, quiver=True):
    minlat = np.min(points[0, :])
    maxlat = np.max(points[0, :])
    minlon = np.min(points[1, :])
    maxlon = np.max(points[1, :])
    lat_d = max(maxlat - minlat, 20)
    lon_d = max(maxlon - minlon, 20)
    lat_d /= 10
    lon_d /= 10
    minlat -= lat_d
    minlon -= lon_d
    maxlat += lat_d
    maxlon += lon_d
    if minlat < -90:
        minlat = -90
    if maxlat > 90:
        maxlat = 90

    plot_projection = ccrs.Mercator(
        central_longitude=np.mean([minlon, maxlon]),
        min_latitude=minlat,
        max_latitude=maxlat,
    )
    pc_projection = ccrs.PlateCarree()

    extent = [minlon, maxlon, minlat, maxlat]

    m = plt.subplot(grid_loc, projection=plot_projection)
    m.set_extent(extent)
    m.coastlines()

    if path:
        marker = ""
        if (np.round(points[1, :], 2) == np.round(points[1, 0], 2)).all() and (
            np.round(points[0, :], 2) == np.round(points[0, 0], 2)
        ).all():
            marker = "."
        m.plot(
            points[1, :],
            points[0, :],
            color="r",
            linestyle="-",
            marker=marker,
            transform=pc_projection,
            zorder=2,
        )
        if quiver:
            qx = np.array([points[1, -1]])
            qy = np.array([points[0, -1]])
            qu = np.array([points[1, -1] - points[1, -2]])
            qv = np.array([points[0, -1] - points[0, -2]])
            qmag = np.sqrt(qu**2 + qv**2)
            qu /= qmag
            qv /= qmag
            m.quiver(
                qx,
                qy,
                qu,
                qv,
                pivot="tip",
                scale=8,
                width=0.25,
                minlength=0.25,
                color="r",
                transform=pc_projection,
                zorder=3,
            )
    else:
        for idx in range(0, points.shape[1]):
            m.plot(
                points[1, idx],
                points[0, idx],
                "o",
                color="r",
                transform=pc_projection,
                zorder=2,
            )

    m.gridlines(
        draw_labels={"bottom": "x", "left": "y"},
        dms=True,
        x_inline=False,
        y_inline=False,
        xlabel_style={"size": 10, "rotation": 0},
        ylabel_style={"size": 10},
        zorder=1,
    )

    img_path = "/cartopy_resources/bluemarble.png"
    try:
        img = plt.imread(settings.shape_file_dir + img_path)
        m.imshow(
            img,
            origin="upper",
            extent=(-180, 180, -90, 90),
            transform=ccrs.PlateCarree(),
            zorder=1,
        )
    except FileNotFoundError:
        print(f"Could not open {img_path}, using Cartopy feature interface.")
        m.add_feature(cfeature.LAND)
        m.add_feature(cfeature.OCEAN)


def point_plot(points, grid_loc):
    _map_plot(points, grid_loc, False)


def path_plot(points, grid_loc, quiver=True):
    _map_plot(points, grid_loc, True, quiver=quiver)
