from netCDF4 import Dataset, netcdftime
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm
from mpl_toolkits.axes_grid1 import make_axes_locatable
from mpl_toolkits.basemap import maskoceans
import numpy as np
import re
import colormap
from StringIO import StringIO
import basemap
import overlays
import utils
from data import load_interpolated, load_interpolated_grid
import gdal
import osr
import tempfile
import os
from oceannavigator.util import get_variable_name, get_variable_unit, \
    get_dataset_url, get_dataset_climatology
from shapely.geometry import LinearRing
from shapely.ops import cascaded_union
from matplotlib.patches import Polygon
from matplotlib.bezier import concatenate_paths
from matplotlib.patches import PathPatch
from textwrap import wrap
from oceannavigator.misc import list_areas


def plot(dataset_name, **kwargs):
    filetype, mime = utils.get_mimetype(kwargs.get('format'))

    query = kwargs.get('query')

    scale = query.get('scale')
    if scale is None or 'auto' in scale:
        scale = None
    else:
        scale = [float(x) for x in scale.split(',')]

    variables = query.get('variable').split(',')
    vector = False
    if len(variables) > 1:
        vector = True
        # quivervars = quiver.split(",")

    projection = query.get('projection')

    area = query.get('area')
    names = None
    centroids = None
    data = None

    if area:
        names = []
        centroids = []
        all_rings = []
        for idx, a in enumerate(area):
            if isinstance(a, str) or isinstance(a, unicode):
                a = a.encode("utf-8")
                sp = a.split('/', 1)
                if data is None:
                    data = list_areas(sp[0], simplify=False)

                b = [x for x in data if x.get('key') == a]
                a = b[0]
                area[idx] = a

            rings = [LinearRing(p) for p in a['polygons']]
            if len(rings) > 1:
                u = cascaded_union(rings)
            else:
                u = rings[0]
            all_rings.append(u.envelope)
            if a.get('name'):
                names.append(a.get('name'))
                centroids.append(u.centroid)

        nc = sorted(zip(names, centroids))
        names = [n for (n, c) in nc]
        centroids = [c for (n, c) in nc]
        data = None

        if len(all_rings) > 1:
            combined = cascaded_union(all_rings)
        else:
            combined = all_rings[0]

        combined = combined.envelope

        from geopy.distance import VincentyDistance
        distance = VincentyDistance()

        centroid = list(combined.centroid.coords)[0]

        b = combined.bounds
        height = distance.measure(
            (b[0], centroid[1]), (b[2], centroid[1])) * 1000 * 1.1
        width = distance.measure(
            (b[1], centroid[0]), (b[3], centroid[0])) * 1000 * 1.1

        # bounds = list(b)
        # Add 10%
        # bounds[0] -= (b[2] - b[0]) / 10.0
        # bounds[2] += (b[2] - b[0]) / 10.0
        # bounds[1] -= (b[3] - b[1]) / 10.0
        # bounds[3] += (b[3] - b[1]) / 10.0
        # m = basemap.load_map('merc', None,
        #                      bounds[0:2],
        #                      bounds[2:4])

        if projection == 'EPSG:32661':
            blat = min(b[0], b[2])
            blat = 5 * np.floor(blat / 5)
            m = basemap.load_map('npstere', (blat, 0), None, None)
        elif projection == 'EPSG:3031':
            blat = max(b[0], b[2])
            blat = 5 * np.ceil(blat / 5)
            m = basemap.load_map('spstere', (blat, 180), None, None)
        else:
            m = basemap.load_map('lcc', centroid, height, width)

    else:
        if 'arctic' == query.get('location'):
            m = basemap.load_arctic()
        elif 'pacific' == query.get('location'):
            m = basemap.load_pacific()
        elif 'nwatlantic' == query.get('location'):
            m = basemap.load_nwatlantic()
        elif 'nwpassage' == query.get('location'):
            m = basemap.load_nwpassage()
        elif isinstance(query.get('location'), list):
            m = basemap.load_map('merc', None,
                                 query.get('location')[0],
                                 query.get('location')[1])
        else:
            # Default to NW Atlantic
            m = basemap.load_nwatlantic()

    if filetype == 'geotiff' and m.projection == 'merc':
        target_lat, target_lon = np.meshgrid(
            np.linspace(query.get('location')[0][0],
                        query.get('location')[1][0],
                        500),
            np.linspace(query.get('location')[0][1],
                        query.get('location')[1][1],
                        500)
        )
    else:
        target_lon, target_lat = m.makegrid(500, 500)

    # Anomomilies
    anom = np.array([v.endswith('_anom') for v in variables]).all()
    if anom:
        variables = [v[:-5] for v in variables]

    with Dataset(get_dataset_url(dataset_name), 'r') as dataset:
        if query.get('time') is None or (type(query.get('time')) == str and
                                         len(query.get('time')) == 0):
            time = -1
        else:
            time = int(query.get('time'))

        if 'time_counter' in dataset.variables:
            time_var = dataset.variables['time_counter']
        elif 'time' in dataset.variables:
            time_var = dataset.variables['time']
        if time >= time_var.shape[0]:
            time = -1

        if time < 0:
            time += time_var.shape[0]

        variable_unit = get_variable_unit(dataset_name,
                                          dataset.variables[variables[0]])
        variable_name = get_variable_name(dataset_name,
                                          dataset.variables[variables[0]])
        if vector:
            variable_name = re.sub(
                r"(?i)( x | y |zonal |meridional |northward |eastward )", " ",
                variable_name)
            variable_name = re.sub(r" +", " ", variable_name)

        depth = 0
        depthm = 0
        if 'deptht' in dataset.variables:
            depth_var = dataset.variables['deptht']
        elif 'depth' in dataset.variables:
            depth_var = dataset.variables['depth']
        else:
            depth_var = None

        if depth_var is not None and query.get('depth'):
            if query.get('depth') == 'bottom':
                depth = 'bottom'
                depthm = 'Bottom'
            if len(query.get('depth')) > 0 and \
                    query.get('depth') != 'bottom':
                depth = int(query.get('depth'))

                if depth >= depth_var.shape[0]:
                    depth = 0
                depthm = depth_var[int(depth)]

        interp = query.get('interpolation')
        if interp is None or interp == '':
            interp = {
                'method': 'inv_square',
                'neighbours': 8,
            }

        data = []
        allvars = []
        for v in variables:
            var = dataset.variables[v]
            allvars.append(v)
            d = load_interpolated_grid(
                target_lat, target_lon, dataset, v,
                depth, time, interpolation=interp)
            data.append(d)
            if len(var.shape) == 3:
                depth_label = ""
            elif depth == 'bottom':
                depth_label = " at Bottom"
            else:
                depth_label = " at " + \
                    str(int(np.round(depthm))) + " " + depth_var.units

        quiver_data = []
        if 'quiver' in query and len(query.get('quiver')) > 0:
            quiver_vars = query.get('quiver').split(',')
            for v in quiver_vars:
                if v is None or len(v) == 0 or v == 'none':
                    continue
                allvars.append(v)
                var = dataset.variables[v]
                quiver_unit = get_variable_unit(dataset_name, var)
                quiver_name = get_variable_name(dataset_name, var)
                quiver_lat, quiver_lon, d = load_interpolated(
                    m, 50, dataset, v, depth, time, interpolation=interp)
                quiver_data.append(d)

            if quiver_vars[0] != 'none':
                quiver_name = re.sub(
                    r"(?i)( x | y |zonal |meridional |northward |eastward )",
                    " ", quiver_name)
                quiver_name = re.sub(r" +", " ", quiver_name)

        if all(map(lambda v: len(dataset.variables[v].shape) == 3, allvars)):
            depth = 0

        contour_data = []
        contour = query.get('contour')
        if contour is not None and \
            contour['variable'] != '' and \
                contour['variable'] != 'none':
            target_lat, target_lon, d = load_interpolated(m, 500, dataset,
                                                          contour['variable'],
                                                          depth, time,
                                                          interpolation=interp)
            contour_unit = get_variable_unit(dataset_name, contour['variable'])
            contour_name = get_variable_name(dataset_name, contour['variable'])
            if contour_unit.startswith("Kelvin"):
                d = np.add(d, -273.15)
                contour_unit = "Celsius"

            contour_data.append(d)

        t = netcdftime.utime(time_var.units)
        timestamp = t.num2date(time_var[time])

    # Load bathymetry data
    bathymetry = overlays.bathymetry(m, target_lat, target_lon, blur=2)
    if len(quiver_data) > 0 and depth != 'bottom' and int(depth) != 0:
        quiver_bathymetry = overlays.bathymetry(m, quiver_lat, quiver_lon)

    if depth != 'bottom' and int(depth) != 0:
        for d in data:
            d[np.where(bathymetry < depthm)] = np.ma.masked
        for d in quiver_data:
            d[np.where(quiver_bathymetry < depthm)] = np.ma.masked
        for d in contour_data:
            d[np.where(bathymetry < depthm)] = np.ma.masked
    else:
        for d in data:
            mask = maskoceans(target_lon, target_lat, d).mask
            d[~mask] = np.ma.masked
        for d in quiver_data:
            mask = maskoceans(quiver_lon, quiver_lat, d).mask
            d[~mask] = np.ma.masked
        for d in contour_data:
            mask = maskoceans(target_lon, target_lat, d).mask
            d[~mask] = np.ma.masked

    if anom:
        a = []
        with Dataset(get_dataset_climatology(dataset_name), 'r') as dataset:
            if variables[0] in dataset.variables:
                for i, v in enumerate(variables):
                    a.append(load_interpolated_grid(
                        target_lat, target_lon, dataset, v,
                        depth, timestamp.month - 1, interpolation=interp))
                    if not vector:
                        data[i] = data[i] - a[i]
                variable_name += " Anomaly"
            else:
                anom = False

    # Colormap from arguments
    cmap = query.get('colormap')
    if cmap is not None:
        cmap = colormap.colormaps.get(cmap)
    if cmap is None:
        if anom:
            cmap = colormap.colormaps['anomaly']
        else:
            cmap = colormap.find_colormap(variable_name)

    if variable_unit.startswith("Kelvin"):
        variable_unit = "Celsius"
        for idx, val in enumerate(data):
            data[idx] = np.add(val, -273.15)

    if vector:
        data[0] = np.sqrt(data[0] ** 2 + data[1] ** 2)
        if anom:
            a[0] = np.sqrt(a[0] ** 2 + a[1] ** 2)
            data[0] = data[0] - a[0]
        if scale:
            vmin = scale[0]
            vmax = scale[1]
        else:
            vmax = np.amax(data[0])
            vmin = 0
            if anom:
                vmin = -vmax
            if not anom:
                if query.get('colormap') is None or \
                        query.get('colormap') == 'default':
                    cmap = colormap.colormaps.get('speed')

    else:
        if scale:
            vmin = scale[0]
            vmax = scale[1]
        else:
            vmin = np.inf
            vmax = -np.inf

            for d in data:
                dmin, dmax = utils.normalize_scale(d, variable_name,
                                                   variable_unit)
                vmin = min(vmin, dmin)
                vmax = max(vmax, dmax)

            if anom:
                vmin = min(vmin, -vmax)
                vmax = max(vmax, -vmin)

    filename = utils.get_filename(get_dataset_url(dataset_name),
                                  query.get('location'),
                                  variables, variable_unit,
                                  timestamp, depthm,
                                  filetype)
    if filetype == 'geotiff':
        f, fname = tempfile.mkstemp()
        os.close(f)

        driver = gdal.GetDriverByName('GTiff')
        outRaster = driver.Create(fname,
                                  target_lon.shape[0],
                                  target_lat.shape[1],
                                  1, gdal.GDT_Float64)
        x = [target_lon[0, 0], target_lon[-1, -1]]
        y = [target_lat[0, 0], target_lat[-1, -1]]
        outRasterSRS = osr.SpatialReference()
        if m.projection != 'merc':
            x, y = m(x, y)
            outRasterSRS.ImportFromProj4(m.proj4string)
        else:
            data[0] = data[0].transpose()
            outRasterSRS.SetWellKnownGeogCS("WGS84")

        pixelWidth = (x[-1] - x[0]) / target_lon.shape[0]
        pixelHeight = (y[-1] - y[0]) / target_lat.shape[0]
        outRaster.SetGeoTransform((x[0], pixelWidth, 0, y[0], 0,
                                   pixelHeight))

        outband = outRaster.GetRasterBand(1)
        d = data[0].astype("Float64")
        ndv = d.fill_value
        outband.WriteArray(d.filled(ndv))
        outband.SetNoDataValue(ndv)
        outRaster.SetProjection(outRasterSRS.ExportToWkt())
        outband.FlushCache()
        outRaster = None

        with open(fname, 'r') as f:
            buf = f.read()
        os.remove(fname)

        return (buf, mime, filename.replace(".geotiff", ".tif"))
    else:
        # Figure size
        size = kwargs.get('size').replace("x", " ").split()
        figuresize = (float(size[0]), float(size[1]))
        fig = plt.figure(figsize=figuresize, dpi=float(kwargs.get('dpi')))

        c = m.imshow(data[0], vmin=vmin, vmax=vmax, cmap=cmap)

        if len(quiver_data) == 2:
            qx = quiver_data[0]
            qy = quiver_data[1]
            quiver_mag = np.sqrt(qx ** 2 + qy ** 2)

            # TODO: this is probably busted.
            if query.get('variable') == query.get('quiver'):
                qx /= quiver_mag
                qy /= quiver_mag
                qscale = 150
            else:
                qscale = None

            q = m.quiver(quiver_lon, quiver_lat,
                         qx, qy,
                         latlon=True, width=0.0025,
                         headaxislength=4, headlength=4,
                         scale=qscale,
                         pivot='mid'
                         )

            if query.get('variable') != query.get('quiver'):
                unit_length = np.mean(quiver_mag) * 2
                unit_length = np.round(unit_length,
                                       -int(np.floor(np.log10(unit_length))))
                if unit_length >= 1:
                    unit_length = int(unit_length)

                plt.quiverkey(q, .65, .01,
                              unit_length,
                              quiver_name.title() + " " +
                              str(unit_length) + " " +
                              utils.mathtext(quiver_unit),
                              coordinates='figure',
                              labelpos='E')

        if bool(query.get('bathymetry')):
            # Plot bathymetry on top
            cs = m.contour(
                target_lon, target_lat, bathymetry, latlon=True,
                lineweight=0.5,
                norm=LogNorm(vmin=1, vmax=6000),
                cmap=colormap.colormaps['transparent_gray'],
                levels=[100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000])
            plt.clabel(cs, fontsize='xx-small', fmt='%1.0fm')

        overlay = query.get('overlay')
        if overlay is not None and overlay != '':
            f = overlay.get('file')
            if f is not None and f != '' and f != 'none':
                opts = {}
                if overlay.get('selection') != 'all':
                    opts['name'] = overlay.get('selection')
                opts['labelcolor'] = overlay.get('labelcolor')
                opts['edgecolor'] = overlay.get('edgecolor')
                opts['facecolor'] = overlay.get('facecolor')
                opts['alpha'] = float(overlay.get('alpha'))

                overlays.draw_overlay(m, f, **opts)

        if area and query.get('showarea'):
            for a in area:
                polys = []
                for co in a['polygons'] + a['innerrings']:
                    coords = np.array(co).transpose()
                    mx, my = m(coords[1], coords[0])
                    map_coords = zip(mx, my)
                    polys.append(Polygon(map_coords))

                paths = []
                for poly in polys:
                    paths.append(poly.get_path())
                path = concatenate_paths(paths)

                poly = PathPatch(path,
                                 fill=None,
                                 edgecolor='k',
                                 linewidth=1
                                 )
                plt.gca().add_patch(poly)

            if names is not None and len(names) > 1:
                for idx, name in enumerate(names):
                    x, y = m(centroids[idx].y, centroids[idx].x)
                    plt.annotate(
                        xy=(x, y),
                        s=name,
                        ha='center',
                        va='center',
                        size=12,
                        # weight='bold'
                    )

        if len(contour_data) > 0:
            if (contour_data[0].min() != contour_data[0].max()):
                cmin, cmax = utils.normalize_scale(contour_data[0],
                                                   contour_name, contour_unit)
                levels = None
                if contour.get('levels') is not None and \
                    contour['levels'] != 'auto' and \
                        contour['levels'] != '':
                    try:
                        levels = list(
                            set(
                                [float(xx)
                                 for xx in contour['levels'].split(",")
                                 if xx.strip()]
                            )
                        )
                        levels.sort()
                    except ValueError:
                        pass

                if levels is None:
                    levels = np.linspace(cmin, cmax, 5)
                cmap = contour['colormap']
                if cmap is not None:
                    cmap = colormap.colormaps.get(cmap)
                    if cmap is None:
                        cmap = colormap.find_colormap(contour_name)

                if not contour.get('hatch'):
                    contours = m.contour(
                        target_lon, target_lat, contour_data[0], latlon=True,
                        linewidths=2,
                        levels=levels,
                        cmap=cmap)
                else:
                    hatches = [
                        '//', 'xx', '\\\\', '--', '||', '..', 'oo', '**'
                    ]
                    if len(levels) + 1 < len(hatches):
                        hatches = hatches[0:len(levels) + 2]
                    m.contour(
                        target_lon, target_lat, contour_data[0], latlon=True,
                        linewidths=1,
                        levels=levels,
                        colors='k')
                    contours = m.contourf(
                        target_lon, target_lat, contour_data[0],
                        latlon=True, colors=['none'],
                        levels=levels,
                        hatches=hatches,
                        vmin=cmin, vmax=cmax, extend='both')

                if contour['legend']:
                    handles, l = contours.legend_elements()
                    labels = []
                    for i, lab in enumerate(l):
                        if contour.get('hatch'):
                            if contour_unit == 'fraction':
                                if i == 0:
                                    labels.append("$x \\leq {0: .0f}\\%$".
                                                  format(levels[i] * 100))
                                elif i == len(levels):
                                    labels.append("$x > {0: .0f}\\%$".
                                                  format(levels[i - 1] * 100))
                                else:
                                    labels.append(
                                        "${0:.0f}\\% < x \\leq {1:.0f}\\%$".
                                        format(levels[i - 1] * 100,
                                               levels[i] * 100))
                            else:
                                if i == 0:
                                    labels.append("$x \\leq %.3g$" %
                                                  levels[i])
                                elif i == len(levels):
                                    labels.append("$x > %.3g$" %
                                                  levels[i - 1])
                                else:
                                    labels.append("$%.3g < x \\leq %.3g$" %
                                                  (levels[i - 1], levels[i]))
                        else:
                            if contour_unit == 'fraction':
                                labels.append("{0:.0%}".format(levels[i]))
                            else:
                                labels.append(
                                    "%.3g %s" %
                                    (levels[i], utils.mathtext(contour_unit)))
                    ax = plt.gca()

                    # Reverse order
                    # handles, labels = ax.get_legend_handles_labels()

                    if contour_unit != 'fraction' and not contour.get('hatch'):
                        contour_title = "%s (%s)" % \
                            (contour_name, utils.mathtext(contour_unit))
                    else:
                        contour_title = contour_name
                    leg = ax.legend(handles[::-1], labels[::-1],
                                    loc='lower left', fontsize='medium',
                                    frameon=True, framealpha=0.75,
                                    title=contour_title)
                    leg.get_title().set_fontsize('medium')
                    if not contour.get('hatch'):
                        for legobj in leg.legendHandles:
                            legobj.set_linewidth(3)

        # Map Info
        m.drawmapboundary(fill_color=(0.3, 0.3, 0.3))
        m.drawcoastlines(linewidth=0.5)
        m.fillcontinents(color='grey', lake_color='dimgrey')
        if np.amax(target_lat) - np.amin(target_lat) < 1:
            parallels = [target_lat.mean()]
        elif np.amax(target_lat) - np.amin(target_lat) < 25:
            parallels = np.round(
                np.arange(np.amin(target_lat),
                          np.amax(target_lat),
                          round(np.amax(target_lat) - np.amin(target_lat)) / 5)
            )
        else:
            parallels = np.arange(
                round(np.amin(target_lat), -1),
                round(np.amax(target_lat), -1),
                5)
        if np.amax(target_lon) - np.amin(target_lon) < 0.5:
            meridians = [target_lon.mean()]
        elif np.amax(target_lon) - np.amin(target_lon) < 25:
            meridians = np.round(
                np.arange(np.amin(target_lon),
                          np.amax(target_lon),
                          round(np.amax(target_lon) - np.amin(target_lon)) / 5)
            )
        else:
            meridians = np.arange(
                round(np.amin(target_lon), -1),
                round(np.amax(target_lon), -1),
                10)
        m.drawparallels(parallels, labels=[1, 0, 0, 0], color=(0, 0, 0, 0.5))
        m.drawmeridians(
            meridians, labels=[0, 0, 0, 1], color=(0, 0, 0, 0.5), latmax=85)

        quantum = query.get('dataset_quantum')
        if quantum == 'month':
            dformat = "%B %Y"
        elif quantum == 'day':
            dformat = "%d %B %Y"
        elif quantum == 'hour':
            dformat = "%H:%M %d %B %Y"
        else:
            if 'monthly' in get_dataset_url(dataset_name):
                dformat = "%B %Y"
            else:
                dformat = "%d %B %Y"

        area_title = ""
        if area:
            area_title = "\n".join(
                wrap(", ".join(names), 60)
            ) + "\n"

        title = "%s %s %s, %s" % (
            area_title,
            variable_name.title(),
            depth_label,
            timestamp.strftime(dformat)
        )
        plt.title(title.strip())
        ax = plt.gca()
        divider = make_axes_locatable(plt.gca())
        cax = divider.append_axes("right", size="5%", pad=0.05)
        bar = plt.colorbar(c, cax=cax)
        bar.set_label("%s (%s)" % (variable_name.title(),
                                   utils.mathtext(variable_unit)))

        fig.tight_layout(pad=3, w_pad=4)

        # Output the plot
        buf = StringIO()
        try:
            plt.savefig(buf, format=filetype, dpi='figure')
            plt.close(fig)
            return (buf.getvalue(), mime, filename)
        finally:
            buf.close()
