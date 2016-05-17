from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from mpl_toolkits.axes_grid1 import make_axes_locatable
import numpy as np
import re
import colormap
from grid import Grid
import cStringIO
import pyresample
import basemap
import overlays


def plot(url, **kwargs):
    variable = kwargs.get('variable')
    if variable is None:
        variable = 'votemper'
    depth = kwargs.get('depth')
    if depth is None:
        depth = 0
    lowerleft = kwargs.get('lowerleft')
    if lowerleft is None:
        lowerleft = '30 N 80 W'
    upperright = kwargs.get('upperright')
    if upperright is None:
        upperright = '80 N 30 W'
    time = kwargs.get('time')
    if time is None:
        time = -1
    quiver = kwargs.get('quiver')
    if quiver is None:
        quiver = ""

    vector = False
    variables = variable.split(",")
    if len(variables) > 1:
        vector = True
    quivervars = quiver.split(",")

    # TODO: Make this work on multiple locations, with different projections
    # m = basemap.load_map('lcc', (55, -45), 5e6, 3.5e6)
    m = basemap.load_arctic()

    dataset = Dataset(url, 'r')
    grid = Grid(dataset, 'nav_lat', 'nav_lon')

    variable_unit = dataset.variables[variables[0]].units
    variable_name = dataset.variables[variables[0]].long_name

    miny, maxy, minx, maxx = grid.bounding_box(m)
    lat = dataset.variables['nav_lat'][miny:maxy, minx:maxx]
    lon = dataset.variables['nav_lon'][miny:maxy, minx:maxx]

    depthm = dataset.variables['deptht'][int(depth)]
    data = []
    allvars = []
    for v in variables:
        var = dataset.variables[v]
        allvars.append(v)
        if len(var.shape) == 3:
            data.append(var[time, miny:maxy, minx:maxx])
            depth_label = ""
        else:
            data.append(var[time, depth, miny:maxy, minx:maxx])
            depth_var = dataset.variables['deptht']
            depth_label = " at " + \
                str(int(np.round(depthm))) + " " + depth_var.units
    quiver_data = []
    for v in quivervars:
        if len(v) == 0:
            continue
        allvars.append(v)
        var = dataset.variables[v]
        quiver_unit = var.units
        quiver_name = var.long_name
        if len(var.shape) == 3:
            quiver_data.append(var[time, miny:maxy, minx:maxx])
        else:
            quiver_data.append(var[time, depth, miny:maxy, minx:maxx])

    if all(map(lambda v: len(dataset.variables[v].shape) == 3, allvars)):
        depth = 0

    masked_lon = lon.view(np.ma.MaskedArray)
    masked_lat = lat.view(np.ma.MaskedArray)
    masked_lon.mask = masked_lat.mask = data[0].view(np.ma.MaskedArray).mask
    target_lon, target_lat = m.makegrid(500, 500)
    quiver_lon, quiver_lat = m.makegrid(50, 50)

    orig_def = pyresample.geometry.SwathDefinition(
        # lons=lon,
        # lats=lat)
        lons=masked_lon,
        lats=masked_lat)
    target_def = pyresample.geometry.SwathDefinition(
        lons=target_lon,
        lats=target_lat)
    quiver_def = pyresample.geometry.SwathDefinition(
        lons=quiver_lon,
        lats=quiver_lat)

    # Load bathymetry data
    bathymetry = overlays.bathymetry(
        m,
        'http://localhost:8080/thredds/dodsC/baselayers/ETOPO1_Bed_g_gmt4.grd',
        target_lat, target_lon, blur=2)
    if len(quiver_data) > 0 and int(depth) != 0:
        quiver_bathymetry = overlays.bathymetry(
            m,
            'http://localhost:8080/thredds/dodsC/baselayers/ETOPO1_Bed_g_gmt4.grd',
            quiver_lat, quiver_lon)

    resampled = {}
    index = 0
    for d in data:
        resampled[index] = pyresample.kd_tree.resample_custom(
            orig_def, d, target_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=lambda r: 1 / r ** 2,
            fill_value=None, nprocs=4)
        if int(depth) != 0:
            resampled[index][np.where(bathymetry < depthm)] = np.ma.masked
        index += 1
    quiver_resampled = {}
    index = 0
    for d in quiver_data:
        quiver_resampled[index] = pyresample.kd_tree.resample_custom(
            orig_def, d, quiver_def,
            radius_of_influence=500000,
            neighbours=10,
            weight_funcs=lambda r: 1 / r ** 2,
            fill_value=None, nprocs=4)
        if int(depth) != 0:
            quiver_resampled[index][
                np.where(quiver_bathymetry < depthm)] = np.ma.masked
        index += 1

    t = netcdftime.utime(dataset.variables["time_counter"].units)
    timestamp = t.num2date(dataset.variables["time_counter"][time])
    dataset.close()

    # Colormap from arguments
    cmap = kwargs.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(colormap)
    if cmap is None:
        cmap = colormap.find_colormap(variable_name)

    # Figure size
    size = kwargs.get('size').replace("x", " ").split()
    figuresize = (float(size[0]), float(size[1]))
    fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

    if variable_unit == "Kelvins":
        variable_unit = "Celsius"
        for k, v in resampled.iteritems():
            resampled[k] = np.add(v, -273.15)

    if vector:
        mag = np.sqrt(resampled[0] ** 2 + resampled[1] ** 2)
        vmin = 0
        vmax = np.amax(mag)
        cmap = colormap.colormaps.get('speed')
        c = m.imshow(mag, vmin=vmin, vmax=vmax, cmap=cmap)

    else:
        vmin = np.inf
        vmax = -np.inf

        for k, v in resampled.iteritems():
            vmin = min(vmin, np.amin(v))
            vmax = max(vmax, np.amax(v))
        if re.search("free surface", variable_name) or \
                re.search("velocity", variable_name):
            vmin = min(vmin, -vmax)
            vmax = max(vmax, -vmin)

        c = m.imshow(resampled[0], vmin=vmin, vmax=vmax, cmap=cmap)

    if len(quiver_data) == 2:
        qx = quiver_resampled[0]
        qy = quiver_resampled[1]
        quiver_mag = np.sqrt(qx ** 2 + qy ** 2)

        if variable == quiver:
            qx /= quiver_mag
            qy /= quiver_mag
            scale = 150
        else:
            scale = None

        q = m.quiver(quiver_lon, quiver_lat,
                     qx, qy,
                     latlon=True, width=0.0025,
                     headaxislength=4, headlength=4,
                     scale=scale,
                     pivot='mid'
                     )

        if variable != quiver:
            unit_length = np.mean(quiver_mag) * 2
            unit_length = np.round(unit_length,
                                   -int(np.floor(np.log10(unit_length))))
            if unit_length >= 1:
                unit_length = int(unit_length)
            plt.quiverkey(q, .65, .01,
                          unit_length,
                          quiver_name + " " +
                          str(unit_length) + " " + quiver_unit,
                          coordinates='figure',
                          labelpos='E')

    # Plot bathymetry on top

    cs = m.contour(
        target_lon, target_lat, bathymetry, latlon=True,
        lineweight=0.5,
        norm=LogNorm(vmin=1, vmax=6000),
        cmap=colormap.colormaps['transparent_gray'],
        levels=[100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000])
    plt.clabel(cs, fontsize='xx-small', fmt='%1.0fm')

    # NAFO divisions
    # overlays.nafo_divisions(m)

    # Map Info
    m.drawcoastlines(linewidth=0.5)
    m.fillcontinents(color='grey', lake_color='dimgrey')
    m.drawparallels(
        np.arange(
            round(np.amin(target_lat), -1),
            round(np.amax(target_lat), -1),
            5
        ), labels=[1, 0, 0, 0], color=(0, 0, 0, 0.5))
    m.drawmeridians(
        np.arange(
            round(np.amin(target_lon), -1),
            round(np.amax(target_lon), -1),
            10
        ), labels=[0, 0, 0, 1], color=(0, 0, 0, 0.5), latmax=85)

    plt.title(variable_name + depth_label + ", " + timestamp.strftime("%B %Y"))
    divider = make_axes_locatable(plt.gca())
    cax = divider.append_axes("right", size="5%", pad=0.05)
    bar = plt.colorbar(c, cax=cax)
    bar.set_label(variable_name + " (" + variable_unit + ")")
    fig.tight_layout(pad=3, w_pad=4)

    # Save or show the plot
    filename = kwargs.get('filename')
    if filename is None:
        buf = cStringIO.StringIO()
        try:
            plt.savefig(buf, format='png')
            return buf.getvalue()
        finally:
            buf.close()
        # plt.show()
    else:
        plt.savefig(filename, transparent=True)
