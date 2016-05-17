from grid import Grid, bathymetry
from mpl_toolkits.basemap import Basemap
from mpl_toolkits.axes_grid1 import make_axes_locatable
from netCDF4 import Dataset, netcdftime
import matplotlib.gridspec as gridspec
import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter
import numpy as np
import re
import colormap
import cStringIO


def plot(url, bathurl, **kwargs):
    variable = kwargs.get('variable')
    if variable is None:
        variable = 'votemper'
    start = kwargs.get('start')
    if start is None:
        start = '47 N 52.8317 W'
    end = kwargs.get('end')
    if end is None:
        end = '47 N 42 W'
    time = kwargs.get('time')
    if time is None:
        time = -1
    if kwargs.get('scale') is None:
        scale = None
    else:
        scale = kwargs.get('scale').split(",")
    surface = kwargs.get('surface')

    dataset = Dataset(url, 'r')
    grid = Grid(dataset, 'nav_lat', 'nav_lon')
    depth = dataset.variables['deptht'][:]

    velocity = False
    variables = variable.split(",")
    if len(variables) > 1:
        velocity = True
        v = []
        for name in variable.split(","):
            v.append(dataset.variables[name])

        points, distance, parallel, perpendicular = grid.velocitytransect(
            v[0], v[1], start, end, time)
    else:
        points, distance, value = grid.transect(
            dataset.variables[variable],
            start, end, time)

    if surface is not None:
        surface_pts, surface_dist, surface_value = grid.surfacetransect(
            dataset.variables[surface],
            start, end, time)
        surface_name = dataset.variables[surface].long_name
        surface_unit = dataset.variables[surface].units

    variable_unit = dataset.variables[variables[0]].units
    variable_name = dataset.variables[variables[0]].long_name

    t = netcdftime.utime(dataset.variables["time_counter"].units)
    timestamp = t.num2date(dataset.variables["time_counter"][int(time)])
    dataset.close()

    # Bathymetry
    dataset = Dataset(bathurl, 'r')
    bath_x, bath_y = bathymetry(
        dataset.variables['y'],
        dataset.variables['x'],
        dataset.variables['z'],
        start, end)
    dataset.close()

    # Colormap from arguments
    cmap = kwargs.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(colormap)
    if cmap is None:
        cmap = colormap.find_colormap(variable_name)

    # Figure size
    size = kwargs.get('size').replace("x", " ").split()
    figuresize = (float(size[0]), float(size[1]) * (1 if not velocity else 2))
    fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))
    if velocity:
        gs = gridspec.GridSpec(2, 2, width_ratios=[1, 5], height_ratios=[1, 1])
    else:
        gs = gridspec.GridSpec(1, 2, width_ratios=[1, 5])

    # Bounds for map view
    minlat = np.min(points[0, :])
    maxlat = np.max(points[0, :])
    minlon = np.min(points[1, :])
    maxlon = np.max(points[1, :])
    lat_d = max(maxlat - minlat, 20)
    lon_d = max(maxlon - minlon, 20)
    minlat -= lat_d / 2
    minlon -= lon_d / 2
    maxlat += lat_d / 2
    maxlon += lon_d / 2

    # Plot the transect on a map
    if velocity:
        plt.subplot(gs[:, 0])
    else:
        plt.subplot(gs[0])
    m = Basemap(
        llcrnrlon=minlon,
        llcrnrlat=minlat,
        urcrnrlon=maxlon,
        urcrnrlat=maxlat,
        lat_0=np.mean(points[0, :]),
        lon_0=np.mean(points[1, :]),
        resolution='c', projection='merc',
        rsphere=(6378137.00, 6356752.3142))
    # m = basemap.load_arctic()

    m.plot(points[1, :], points[0, :], latlon=True, color='r', linestyle='-')
    qx, qy = m([points[1, -1]], [points[0, -1]])
    qu = points[1, -1] - points[1, 0]
    qv = points[0, -1] - points[0, 0]
    qmag = np.sqrt(qu ** 2 + qv ** 2)
    qu /= qmag
    qv /= qmag
    m.quiver(qx, qy, qu, qv,
             pivot='tip',
             scale=8,
             width=0.25,
             minlength=0.25,
             color='r')
    m.etopo()
    m.drawparallels(
        np.arange(
            round(minlat),
            round(maxlat),
            round(lat_d / 1.5)
        ), labels=[0, 1, 0, 0])
    m.drawmeridians(
        np.arange(
            round(minlon),
            round(maxlon),
            round(lon_d / 1.5)
        ), labels=[0, 0, 0, 1])

    # transect Plot
    if velocity:
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = min(np.amin(parallel), np.amin(perpendicular))
            vmax = max(np.amax(parallel), np.amin(perpendicular))
            vmin = min(vmin, -vmax)
            vmax = max(vmax, -vmin)

        plt.subplot(gs[1])
        divider = _transect_plot(
            distance, parallel, depth, variable_unit, bath_x, bath_y,
            "Parallel", vmin, vmax, cmap, scale)
        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)
        plt.subplot(gs[3])
        divider = _transect_plot(
            distance, perpendicular, depth, variable_unit, bath_x, bath_y,
            "Perpendicular", vmin, vmax, cmap, scale)
        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)

    else:
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = np.amin(value)
            vmax = np.amax(value)
            if re.search("velocity", variable_name):
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)

        plt.subplot(gs[1])
        divider = _transect_plot(
            distance, value, depth, variable_unit, bath_x, bath_y,
            variable_name, vmin, vmax, cmap, scale)

        if surface:
            _surface_plot(divider, surface_dist, surface_value, surface_unit,
                          surface_name)

    if velocity:
        fig.suptitle("Sea water velocity, " + timestamp.strftime("%B %Y") +
                     "\nTransect from " + start + " to " + end)
    else:
        fig.suptitle(variable_name + ", " + timestamp.strftime("%B %Y") +
                     "\nTransect from " + start + " to " + end)

    fig.tight_layout(pad=3, w_pad=4)
    if velocity:
        fig.subplots_adjust(top=0.9)

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


def _surface_plot(axis_divider, distance, values, units, name):
    surface_ax = axis_divider.append_axes("top", size="15%", pad=0.15)
    surface_ax.plot(distance, values, color='r')
    surface_ax.locator_params(nbins=3)
    surface_ax.yaxis.tick_right()
    surface_ax.yaxis.set_label_position("right")
    label = plt.ylabel(units)
    title = plt.title(name)
    plt.setp(title, size='smaller')
    plt.setp(label, size='smaller')
    plt.setp(surface_ax.get_yticklabels(), size='x-small')
    plt.xlim([0, distance[-1]])
    if re.search("free surface", name):
        ylim = plt.ylim()
        plt.ylim([min(ylim[0], -ylim[1]), max([-ylim[0], ylim[1]])])
        surface_ax.yaxis.grid(True)
    # s = surface_ax.imshow(np.tile(values, [2, 1]),
                            # cmap=colormap.find_colormap(name))
    surface_ax.axes.get_xaxis().set_visible(False)


def _transect_plot(distance, values, depth, unit, bath_x, bath_y, name,
                   vmin, vmax, cmap, scale):
    LINEAR = 200
    if unit == "Kelvins":
        unit = "Celsius"
        values = np.add(values, -273.15)
        if scale is None:
            vmin -= 273.15
            vmax -= 273.15

    c = plt.pcolormesh(distance, depth, values.data,
                       cmap=cmap,
                       shading='gouraud',
                       vmin=vmin,
                       vmax=vmax)
    plt.gca().invert_yaxis()
    plt.yscale('symlog', linthreshy=LINEAR)
    plt.gca().yaxis.set_major_formatter(ScalarFormatter())

    # Mask out the bottom
    plt.fill_between(bath_x, bath_y * -1, plt.ylim()[0],
                     facecolor='dimgray', hatch='xx')

    plt.xlabel("Distance (km)")
    plt.ylabel("Depth (m)")
    plt.xlim([distance[0], distance[-1]])

    # Tighten the y-limits
    deep = np.amax(bath_y * -1)
    ylim = plt.ylim()
    l = 10 ** np.floor(np.log10(deep))
    plt.ylim(np.ceil(deep / l) * l, ylim[1])
    plt.yticks(list(plt.yticks()[0]) + [LINEAR, plt.ylim()[0]])

    divider = make_axes_locatable(plt.gca())
    cax = divider.append_axes("right", size="5%", pad=0.05)
    bar = plt.colorbar(c, cax=cax)
    bar.set_label(name + " (" + unit + ")")

    return divider
