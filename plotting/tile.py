from netCDF4 import Dataset
import matplotlib.pyplot as plt
import matplotlib.cm
import matplotlib.colors
from matplotlib.colorbar import ColorbarBase
from matplotlib.ticker import ScalarFormatter
import numpy as np
import re
import plotting.colormap as colormap
import plotting.utils as utils
from io import BytesIO
import os
import math
from oceannavigator import DatasetConfig
from pyproj import Proj
import pyproj
from scipy.ndimage.filters import gaussian_filter
from PIL import Image
from flask_babel import gettext
from skimage import measure
import contextlib
from data import open_dataset
from flask import current_app

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) +
                                (1 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return (xtile, ytile)


def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def get_m_coords(projection, x, y, z):
    if projection == 'EPSG:3857':
        nw = num2deg(x, y, z)
        se = num2deg(x + 1, y + 1, z)

        wgs84 = Proj(init='EPSG:4326')
        dest = Proj(init=projection)

        # 0,0 is top-left, 1st dim is rows
        x1, y1 = pyproj.transform(wgs84, dest, nw[1], nw[0])
        x2, y2 = pyproj.transform(wgs84, dest, se[1], se[0])
    elif projection == 'EPSG:32661' or projection == 'EPSG:3031':
        if projection == 'EPSG:32661':
            boundinglat = 60.0
            lon_0 = 0
            llcrnr_lon = -45
            urcrnr_lon = 135
        elif projection == 'EPSG:3031':
            boundinglat = -60.0
            lon_0 = 0
            llcrnr_lon = -135
            urcrnr_lon = 45

        proj = Proj(init=projection)

        xx, yy = proj(lon_0, boundinglat)
        lon, llcrnr_lat = proj(math.sqrt(2.) * yy, 0., inverse=True)
        urcrnr_lat = llcrnr_lat

        urcrnrx, urcrnry = proj(urcrnr_lon, urcrnr_lat)
        llcrnrx, llcrnry = proj(llcrnr_lon, llcrnr_lat)

        n = 2 ** z
        x_tile = (urcrnrx - llcrnrx) / n
        y_tile = (urcrnry - llcrnry) / n

        dx = x_tile / 256
        dy = y_tile / 256

        x = llcrnrx + x * x_tile + \
            dx * np.indices((256, 256), np.float32)[0, :, :]
        y = llcrnry + (n - y - 1) * y_tile + \
            dy * np.indices((256, 256), np.float32)[1, :, :]
        x = x[:, ::-1]
        y = y[:, ::-1]

        return x, y

    x0 = np.linspace(x1, x2, 256)
    y0 = np.linspace(y1, y2, 256)

    return x0, y0


def get_latlon_coords(projection, x, y, z):
    x0, y0 = get_m_coords(projection, x, y, z)
    # webmerc = Proj(init='EPSG:3857')
    dest = Proj(init=projection)
    lon, lat = dest(x0, y0, inverse=True)

    return lat, lon

"""
    Draws the variable scale that is placed over the map.
    Returns a BytesIO object.
"""
def scale(args):
    dataset_name = args.get('dataset')
    config = DatasetConfig(dataset_name)
    scale = args.get('scale')
    scale = [float(component) for component in scale.split(',')]

    variable = args.get('variable')
    variable = variable.split(',')

    with open_dataset(config) as dataset:
        if len(variable) > 1:
            variable_unit = config.variable[",".join(variable)].unit
            variable_name = config.variable[",".join(variable)].name
        else:
            variable_unit = config.variable[dataset.variables[variable[0]]].unit
            variable_name = config.variable[dataset.variables[variable[0]]].name

    cmap = colormap.find_colormap(variable_name)

    if len(variable) == 2:
        cmap = colormap.colormaps.get('speed')

    fig = plt.figure(figsize=(2, 5), dpi=75)
    ax = fig.add_axes([0.05, 0.05, 0.25, 0.9])
    norm = matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1])

    formatter = ScalarFormatter()
    formatter.set_powerlimits((-3, 4))
    bar = ColorbarBase(ax, cmap=cmap, norm=norm, orientation='vertical',
                       format=formatter)
    bar.set_label("%s (%s)" % (variable_name.title(),
                               utils.mathtext(variable_unit)), fontsize=12)
    # Increase tick font size
    bar.ax.tick_params(labelsize=12)

    buf = BytesIO()
    plt.savefig(buf, format='png', dpi='figure', transparent=False,
                bbox_inches='tight', pad_inches=0.05)
    plt.close(fig)

    buf.seek(0) # Move buffer back to beginning
    return buf


def plot(projection, x, y, z, args):
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    dataset_name = args.get('dataset')
    config = DatasetConfig(dataset_name)
    variable = args.get('variable')

    variable = variable.split(',')

    depth = args.get('depth')

    scale = args.get('scale')
    scale = [float(component) for component in scale.split(',')]

    data = []
    with open_dataset(config) as dataset:
        if args.get('time') is None or (type(args.get('time')) == str and
                                        len(args.get('time')) == 0):
            time = -1
        else:
            time = int(args.get('time'))

        t_len = len(dataset.timestamps)
        while time >= t_len:
            time -= t_len

        while time < 0:
            time += len(dataset.timestamps)

        timestamp = dataset.timestamps[time]

        for v in variable:
            data.append(dataset.get_area(
                np.array([lat, lon]),
                depth,
                time,
                v,
                args.get('interp'),
                args.get('radius'),
                args.get('neighbours')
            ))

        vc = config.variable[dataset.variables[variable[0]]]
        variable_name = vc.name
        variable_unit = vc.unit
        scale_factor = vc.scale_factor
        cmap = colormap.find_colormap(variable_name)

        if depth != 'bottom':
            depthm = dataset.depths[depth]
        else:
            depthm = 0

    if scale_factor != 1.0:
        for idx, val in enumerate(data):
            data[idx] = np.multiply(val, scale_factor)

    if len(data) == 1:
        data = data[0]

    if len(data) == 2:
        data = np.sqrt(data[0] ** 2 + data[1] ** 2)
        cmap = colormap.colormaps.get('speed')
    
    data = data.transpose()
    xpx = x * 256
    ypx = y * 256
    
    # Mask out any topography if we're below the vector-tile threshold
    if z < 8:
        with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
            bathymetry = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)]

        bathymetry = gaussian_filter(bathymetry, 0.5)

        data[np.where(bathymetry > -depthm)] = np.ma.masked

    
    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.Normalize(vmin=scale[0], vmax=scale[1]), cmap=cmap)
    
    img = sm.to_rgba(np.ma.masked_invalid(np.squeeze(data)))
    im = Image.fromarray((img * 255.0).astype(np.uint8))

    buf = BytesIO()
    im.save(buf, format='PNG', optimize=True)
    return buf


def topo(projection, x, y, z, shaded_relief):
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    scale = [-4000, 1000]
    cmap = 'BrBG_r'

    land_colors = plt.cm.BrBG_r(np.linspace(0.6, 1, 128))
    water_colors = colormap.colormaps['bathymetry'](np.linspace(1, 0.25, 128))
    colors = np.vstack((water_colors, land_colors))
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list('topo', colors)

    data = None
    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        data = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)]

    shade = 0
    if shaded_relief:
        x, y = np.gradient(data)
        slope = np.pi / 2. - np.arctan(np.sqrt(x * x + y * y))
        aspect = np.arctan2(-x, y)
        altitude = np.pi / 4.
        azimuth = np.pi / 2.

        shaded = np.sin(altitude) * np.sin(slope)\
            + np.cos(altitude) * np.cos(slope)\
            * np.cos((azimuth - np.pi / 2.) - aspect)
        shade = (shaded + 1) / 8
        shade = np.repeat(np.expand_dims(shade, 2), 4, axis=2)
        shade[:, :, 3] = 0


    sm = matplotlib.cm.ScalarMappable(
        matplotlib.colors.SymLogNorm(linthresh=0.1,
                                     vmin=scale[0],
                                     vmax=scale[1]),
        cmap=cmap)
    img = sm.to_rgba(np.squeeze(data))

    img = img + shade
    img = np.clip(img, 0, 1)

    im = Image.fromarray((img * 255.0).astype(np.uint8))
    buf = BytesIO()
    im.save(buf, format='PNG', optimize=True)
    
    return buf


def bathymetry(projection, x, y, z, args):
    lat, lon = get_latlon_coords(projection, x, y, z)
    if len(lat.shape) == 1:
        lat, lon = np.meshgrid(lat, lon)

    xpx = x * 256
    ypx = y * 256

    with Dataset(current_app.config['ETOPO_FILE'] % (projection, z), 'r') as dataset:
        data = dataset["z"][ypx:(ypx + 256), xpx:(xpx + 256)] * -1
        data = data[::-1, :]

    LEVELS = [100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000]

    normalized = matplotlib.colors.LogNorm(vmin=1, vmax=6000)(LEVELS)
    cmap = matplotlib.colors.LinearSegmentedColormap.from_list(
        'transparent_gray',
        [(0, 0, 0, 1), (0, 0, 0, 0.5)]
    )
    colors = cmap(normalized)

    fig = plt.figure()
    fig.set_size_inches(4, 4)
    ax = plt.Axes(fig, [0, 0, 1, 1])
    ax.set_axis_off()
    fig.add_axes(ax)

    for i, l in enumerate(LEVELS):
        contours = measure.find_contours(data, l)

        for n, contour in enumerate(contours):
            ax.plot(contour[:, 1], contour[:, 0], color=colors[i], linewidth=1)

    plt.xlim([0, 255])
    plt.ylim([0, 255])

    with contextlib.closing(BytesIO()) as buf:
        plt.savefig(
            buf,
            format='png',
            dpi=64,
            transparent=True,
        )
        plt.close(fig)
        buf.seek(0)
        im = Image.open(buf)

        buf2 = BytesIO()
        im.save(buf2, format='PNG', optimize=True)
        return buf2

    return None
