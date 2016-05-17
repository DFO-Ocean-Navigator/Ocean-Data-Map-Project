from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from mpl_toolkits.axes_grid1 import make_axes_locatable
import numpy as np
import re
import colormap
import cStringIO
import basemap
import overlays
from data import load_interpolated


def plot(url, climate_url, **kwargs):
    variable = kwargs.get('variable')
    if variable is None:
        variable = 'votemper'
    depth = kwargs.get('depth')
    if depth is None:
        depth = 0
    if kwargs.get('time') is None:
        time = -1
    else:
        time = int(kwargs.get('time'))
    quiver = kwargs.get('quiver')
    if quiver is None:
        quiver = ""
    anom = bool(kwargs.get('anom'))
    if kwargs.get('scale') is None:
        scale = None
    else:
        scale = kwargs.get('scale').split(",")
    location = kwargs.get('location')

    vector = False
    variables = variable.split(",")
    if len(variables) > 1:
        vector = True
    quivervars = quiver.split(",")

    # TODO: Make this work on multiple locations, with different projections
    if 'arctic' == location:
        m = basemap.load_arctic()
    elif 'pacific' == location:
        m = basemap.load_pacific()
    elif 'nwatlantic' == location:
        m = basemap.load_nwatlantic()
    else:
        # Default to NW Atlantic
        m = basemap.load_nwatlantic()

    dataset = Dataset(url, 'r')

    variable_unit = dataset.variables[variables[0]].units
    variable_name = dataset.variables[variables[0]].long_name
    if anom:
        variable_name += " Anomaly"

    if 'deptht' in dataset.variables:
        depthm = dataset.variables['deptht'][int(depth)]
    else:
        depthm = 0
    data = []
    allvars = []
    for v in variables:
        var = dataset.variables[v]
        allvars.append(v)
        target_lat, target_lon, d = load_interpolated(m, 500, dataset, v,
                                                      depth, time)
        data.append(d)
        if len(var.shape) == 3:
            depth_label = ""
        else:
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
        quiver_lat, quiver_lon, d = load_interpolated(m, 50, dataset, v, depth,
                                                      time)
        quiver_data.append(d)

    if all(map(lambda v: len(dataset.variables[v].shape) == 3, allvars)):
        depth = 0

    t = netcdftime.utime(dataset.variables["time_counter"].units)
    timestamp = t.num2date(dataset.variables["time_counter"][time])
    dataset.close()

    # Load bathymetry data
    bathymetry = overlays.bathymetry(m, target_lat, target_lon, blur=2)
    if len(quiver_data) > 0 and int(depth) != 0:
        quiver_bathymetry = overlays.bathymetry(m, quiver_lat, quiver_lon)

    if int(depth) != 0:
        for d in data:
            d[np.where(bathymetry < depthm)] = np.ma.masked
        for d in quiver_data:
            d[np.where(quiver_bathymetry < depthm)] = np.ma.masked

    # Anomomilies
    if len(variables) > 1 or \
            ('votemper' not in variables and 'vosaline' not in variables):
        anom = False
    if anom:
        dataset = Dataset(climate_url, 'r')
        target_lat, target_lon, d = load_interpolated(
            m, 500, dataset, variables[0],
            depth, timestamp.month - 1)
        dataset.close()
        data[0] = data[0] - d

    # Colormap from arguments
    cmap = kwargs.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(cmap)
    if cmap is None:
        if anom:
            cmap = colormap.colormaps['anomaly']
        else:
            cmap = colormap.find_colormap(variable_name)

    # Figure size
    size = kwargs.get('size').replace("x", " ").split()
    figuresize = (float(size[0]), float(size[1]))
    fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

    if variable_unit == "Kelvins":
        variable_unit = "Celsius"
        for idx, val in enumerate(data):
            data[idx] = np.add(val, -273.15)

    if vector:
        mag = np.sqrt(data[0] ** 2 + data[1] ** 2)
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = 0
            vmax = np.amax(mag)
        cmap = colormap.colormaps.get('speed')
        c = m.imshow(mag, vmin=vmin, vmax=vmax, cmap=cmap)

    else:
        if scale:
            vmin = float(scale[0])
            vmax = float(scale[1])
        else:
            vmin = np.inf
            vmax = -np.inf

            for d in data:
                vmin = min(vmin, np.amin(d))
                vmax = max(vmax, np.amax(d))
            if re.search("free surface", variable_name) or \
                    re.search("velocity", variable_name) or anom:
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)
            if variable_unit == "fraction":
                vmin = 0
                vmax = 1

        c = m.imshow(data[0], vmin=vmin, vmax=vmax, cmap=cmap)

    if len(quiver_data) == 2:
        qx = quiver_data[0]
        qy = quiver_data[1]
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
    overlays.draw_overlay(m, 'NAFO_Divisions',
                          labelcolor='k',
                          edgecolor='k',
                          # facecolor='rnd',
                          # alpha=0.2,
                          linewidth=0.5)

    # Map Info
    m.drawmapboundary(fill_color=(0.3, 0.3, 0.3))
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
            plt.close(fig)
            return buf.getvalue()
        finally:
            buf.close()
    else:
        plt.savefig(filename, transparent=True)
        plt.close(fig)
