import math
from io import BytesIO

import matplotlib.cm
import matplotlib.colors
import matplotlib.pyplot as plt
import numpy as np
import xarray as xr
from matplotlib.colorbar import ColorbarBase
from matplotlib.ticker import ScalarFormatter
from netCDF4 import Dataset
from PIL import Image
from pyproj import Proj
from pyproj.transformer import Transformer
from scipy.ndimage import gaussian_filter
from skimage import measure

import plotting.colormap as colormap
import plotting.utils as utils
from data import open_dataset
from data.transformers.geojson import data_array_to_geojson
from oceannavigator import DatasetConfig
from oceannavigator.settings import get_settings


def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0**zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int(
        (1.0 - math.log(math.tan(lat_rad) + (1 / math.cos(lat_rad))) / math.pi)
        / 2.0
        * n
    )
    return (xtile, ytile)


def num2deg(xtile, ytile, zoom):
    n = 2.0**zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def get_m_coords(projection, x, y, z):
    if projection == "EPSG:3857":
        nw = num2deg(x, y, z)
        se = num2deg(x + 1, y + 1, z)

        transformer = Transformer.from_crs("EPSG:4326", projection, always_xy=True)
        x1, y1 = transformer.transform(nw[1], nw[0])
        x2, y2 = transformer.transform(se[1], se[0])
    elif projection == "EPSG:32661" or projection == "EPSG:3031":
        if projection == "EPSG:32661":
            boundinglat = 60.0
            lon_0 = 0
            llcrnr_lon = -45
            urcrnr_lon = 135
        elif projection == "EPSG:3031":
            boundinglat = -60.0
            lon_0 = 0
            llcrnr_lon = -135
            urcrnr_lon = 45

        proj = Proj(projection)

        xx, yy = proj(lon_0, boundinglat)
        lon, llcrnr_lat = proj(math.sqrt(2.0) * yy, 0.0, inverse=True)
        urcrnr_lat = llcrnr_lat

        urcrnrx, urcrnry = proj(urcrnr_lon, urcrnr_lat)
        llcrnrx, llcrnry = proj(llcrnr_lon, llcrnr_lat)

        n = 2**z
        x_tile = (urcrnrx - llcrnrx) / n
        y_tile = (urcrnry - llcrnry) / n

        dx = x_tile / 256
        dy = y_tile / 256

        x = llcrnrx + x * x_tile + dx * np.indices((256, 256), np.float32)[0, :, :]
        y = (
            llcrnry
            + (n - y - 1) * y_tile
            + dy * np.indices((256, 256), np.float32)[1, :, :]
        )
        x = x[:, ::-1]
        y = y[:, ::-1]

        return x, y

    x0 = np.linspace(x1, x2, 256)
    y0 = np.linspace(y1, y2, 256)

    return x0, y0


def get_latlon_coords(projection, x, y, z):
    x0, y0 = get_m_coords(projection, x, y, z)
    dest = Proj(projection)
    lon, lat = dest(x0, y0, inverse=True)

    return lat, lon


def get_m_bounds(projection, x, y, z):
    if projection == "EPSG:3857":
        nw = num2deg(x, y, z)
        se = num2deg(x + 1, y + 1, z)

        transformer = Transformer.from_crs("EPSG:4326", projection, always_xy=True)
        x1, y2 = transformer.transform(nw[1], nw[0])
        x2, y1 = transformer.transform(se[1], se[0])

    elif projection == "EPSG:32661" or projection == "EPSG:3031":
        if projection == "EPSG:32661":
            boundinglat = 60.0
            lon_0 = 0
            llcrnr_lon = -45
            urcrnr_lon = 135
        elif projection == "EPSG:3031":
            boundinglat = -60.0
            lon_0 = 0
            llcrnr_lon = -135
            urcrnr_lon = 45

        proj = Proj(projection)

        xx, yy = proj(lon_0, boundinglat)
        lon, llcrnr_lat = proj(math.sqrt(2.0) * yy, 0.0, inverse=True)
        urcrnr_lat = llcrnr_lat

        urcrnrx, urcrnry = proj(urcrnr_lon, urcrnr_lat)
        llcrnrx, llcrnry = proj(llcrnr_lon, llcrnr_lat)

        n = 2**z
        x_tile = (urcrnrx - llcrnrx) / n
        y_tile = (urcrnry - llcrnry) / n

        x1 = llcrnrx + x * x_tile
        x2 = x1 + x_tile
        y1 = llcrnry + (n - y - 1) * y_tile
        y2 = y1 + y_tile

        return [x1, x1, x2, x2], [y1, y2, y1, y2]

    return [x1, x2], [y1, y2]


def get_latlon_bounds(projection, x, y, z):
    x0, y0 = get_m_bounds(projection, x, y, z)
    dest = Proj(projection)
    lon, lat = dest(x0, y0, inverse=True)
    lon = np.array(lon).round(0) % 360
    lat = np.array(lat).round(0)

    if projection != "EPSG:3857":
        unique_lat, cnts = np.unique(lat, return_counts=True)
        lon = lon[lat == unique_lat[cnts > 1]]
        lat = unique_lat[cnts == 1]
        if np.absolute(np.diff(lon)) > 90:
            lon[lon == 0] = 360
    elif lon[1] == 0:
        lon[1] = 360

    return lat, lon


def scale(args):
    """
    Draws the variable scale that is placed over the map.
    Returns a BytesIO object.
    """

    dataset_name = args.get("dataset")
    config = DatasetConfig(dataset_name)
    scale = args.get("scale")
    scale = [float(component) for component in scale.split(",")]

    variable = args.get("variable")
    variable = variable.split(",")

    if len(variable) > 1:
        variable_unit = config.variable[",".join(variable)].unit
        variable_name = config.variable[",".join(variable)].name
    else:
        variable_unit = config.variable[variable[0]].unit
        variable_name = config.variable[variable[0]].name

    cmap = colormap.find_colormap(variable_name)

    if len(variable) == 2:
        cmap = colormap.colormaps.get("speed")

    fig = plt.figure(figsize=(2, 5), dpi=75)
    ax = fig.add_axes([0.05, 0.05, 0.25, 0.9])
    norm = matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1])

    formatter = ScalarFormatter()
    formatter.set_powerlimits((-3, 4))
    bar = ColorbarBase(
        ax, cmap=cmap, norm=norm, orientation="vertical", format=formatter
    )
    if variable_name == "Potential Sub Surface Channel":
        bar.set_ticks([0, 1])

    bar.set_label(
        "%s (%s)" % (variable_name.title(), utils.mathtext(variable_unit)), fontsize=12
    )
    # Increase tick font size
    bar.ax.tick_params(labelsize=12)

    buf = BytesIO()
    plt.savefig(
        buf,
        format="png",
        dpi="figure",
        transparent=False,
        bbox_inches="tight",
        pad_inches=0.05,
    )
    plt.close(fig)

    buf.seek(0)  # Move buffer back to beginning
    return buf


async def plot(projection: str, x: int, y: int, z: int, args: dict) -> BytesIO:
    settings = get_settings()

    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    dataset_name = args.get("dataset")
    config = DatasetConfig(dataset_name)
    variable = args.get("variable")

    variable = variable.split(",")

    depth = args.get("depth")

    scale = args.get("scale")
    scale = [float(component) for component in scale.split(",")]

    time = args.get("time")

    data = []
    with open_dataset(config, variable=variable, timestamp=time) as dataset:
        for v in variable:
            data.append(
                dataset.get_area(
                    np.array([lat, lon]),
                    depth,
                    time,
                    v,
                    args.get("interp"),
                    args.get("radius"),
                    args.get("neighbours"),
                )
            )

        vc = config.variable[dataset.variables[variable[0]]]
        variable_name = vc.name
        cmap = colormap.find_colormap(variable_name)

        if depth != "bottom":
            depthm = dataset.depths[depth]
        else:
            depthm = 0

    if len(data) == 1:
        data = data[0]

    if len(data) == 2:
        data = np.sqrt(data[0] ** 2 + data[1] ** 2)
        cmap = colormap.colormaps.get("speed")

    data = data.transpose()
    xpx = x * 256
    ypx = y * 256

    # Mask out any topography if we're below the vector-tile threshold
    if z < 8:
        with Dataset(settings.etopo_file % (projection, z), "r") as dataset:
            bathymetry = dataset["z"][ypx : (ypx + 256), xpx : (xpx + 256)]

        bathymetry = gaussian_filter(bathymetry, 0.5)

        data[np.where(bathymetry > -depthm)] = np.ma.masked

    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1]), cmap=cmap
    )

    img = sm.to_rgba(np.ma.masked_invalid(np.squeeze(data)))
    im = Image.fromarray((img * 255.0).astype(np.uint8))

    return im


def get_quiver_slice(
    dim_var: xr.IndexVariable, tile_bounds: np.array, n_quivers: int
) -> np.array:
    dim_slice = np.argwhere(
        (dim_var.data >= tile_bounds.min() - 1)
        & (dim_var.data <= tile_bounds.max() + 1)
    ).flatten()

    stride = int(dim_var.size / n_quivers)
    stride = stride if stride > 1 else 1

    dim_slice = dim_slice[dim_slice % stride == 0]

    if tile_bounds[1] == 360 and dim_var.size - dim_slice[-1] < stride:
        dim_slice[-1] = 0
    elif tile_bounds[1] == 360:
        dim_slice = np.append(dim_slice, 0)

    return dim_slice


async def quiver(
    dataset_name: str,
    variable: str,
    time: str,
    depth: str,
    density_adj: int,
    x: int,
    y: int,
    z: int,
    projection: str,
):
    config = DatasetConfig(dataset_name)

    with open_dataset(config, variable=variable, timestamp=time) as ds:
        lat_var, lon_var = ds.nc_data.latlon_variables

        time_index = ds.nc_data.timestamp_to_time_index(time)

        data = ds.nc_data.get_dataset_variable(variable)

        lat_bounds, lon_bounds = get_latlon_bounds(projection, x, y, z)
        n_y_quivers = (
            (25 + 10 * density_adj) * 2**z * (lat_var.max() - lat_var.min()) / 180
        )
        n_x_quivers = (
            (25 + 10 * density_adj) * 2**z * (lon_var.max() - lon_var.min()) / 360
        )

        lat_slice = get_quiver_slice(lat_var, lat_bounds, n_y_quivers)
        lon_slice = get_quiver_slice(lon_var, lon_bounds, n_x_quivers)

        if lat_slice.any() and lon_slice.any():
            if len(data.shape) == 3:
                data_slice = (time_index, lat_slice, lon_slice)
            else:
                data_slice = (time_index, int(depth), lat_slice, lon_slice)

            data = data[data_slice]

            bearings = None
            bearings_var = config.variable[variable].bearing_component
            if variable in config.vector_variables and bearings_var:
                with open_dataset(
                    config, variable=bearings_var, timestamp=time
                ) as ds_bearing:
                    bearings = ds_bearing.nc_data.get_dataset_variable(bearings_var)[
                        data_slice
                    ].squeeze(drop=True)

            d = await data_array_to_geojson(
                data.squeeze(drop=True),
                bearings,
                lat_var[lat_slice],
                lon_var[lon_slice],
                config.variable[variable].scale,
            )

            return d
    return {"type": "FeatureCollection", "features": []}


def topo(projection: str, x: int, y: int, z: int, shaded_relief: bool) -> BytesIO:
    settings = get_settings()

    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    scale = [-4000, 1000]
    cmap = "BrBG_r"

    land_colors = plt.cm.BrBG_r(np.linspace(0.6, 1, 128))
    water_colors = colormap.colormaps["bathymetry"](np.linspace(0.25, 1, 196))
    colors = np.vstack((water_colors, land_colors))
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list("topo", colors)

    data = None
    with Dataset(settings.etopo_file % (projection, z), "r") as dataset:
        data = dataset["z"][ypx : (ypx + 256), xpx : (xpx + 256)]

    shade = 0
    if shaded_relief:
        x, y = np.gradient(data)
        slope = np.pi / 2.0 - np.arctan(np.sqrt(x * x + y * y))
        aspect = np.arctan2(-x, y)
        altitude = np.pi / 4.0
        azimuth = np.pi / 2.0

        shaded = np.sin(altitude) * np.sin(slope) + np.cos(altitude) * np.cos(
            slope
        ) * np.cos((azimuth - np.pi / 2.0) - aspect)
        shade = (shaded + 1) / 8
        shade = np.repeat(np.expand_dims(shade, 2), 4, axis=2)
        shade[:, :, 3] = 0

    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.SymLogNorm(linthresh=0.1, vmin=scale[0], vmax=scale[1]),
        cmap=cmap,
    )
    img = sm.to_rgba(np.squeeze(data))

    img += shade
    img = np.clip(img, 0, 1)

    im = Image.fromarray((img * 255.0).astype(np.uint8))

    buf = BytesIO()
    im.save(buf, format="PNG", optimize=True)
    buf.seek(0)

    return buf


async def bathymetry(projection: str, x: int, y: int, z: int) -> BytesIO:
    settings = get_settings()

    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    with Dataset(settings.etopo_file % (projection, z), "r") as dataset:
        data = dataset["z"][ypx : (ypx + 256), xpx : (xpx + 256)] * -1
        data = data[::-1, :]

    LEVELS = [100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000]

    normalized = matplotlib.colors.LogNorm(vmin=1, vmax=6000)(LEVELS)
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list(
        "transparent_gray", [(0, 0, 0, 1), (0, 0, 0, 0.5)]
    )
    colors = cmap(normalized)

    fig = plt.figure()
    fig.set_size_inches(4, 4)
    ax = plt.Axes(fig, [0, 0, 1, 1])
    ax.set_axis_off()
    fig.add_axes(ax)

    for i, l in enumerate(LEVELS):
        contours = measure.find_contours(data, l)

        for _, contour in enumerate(contours):
            ax.plot(contour[:, 1], contour[:, 0], color=colors[i], linewidth=1)

    plt.xlim([0, 255])
    plt.ylim([0, 255])

    buf = BytesIO()
    plt.savefig(
        buf,
        format="png",
        dpi=64,
        transparent=True,
    )
    plt.close(fig)
    buf.seek(0)

    return buf
