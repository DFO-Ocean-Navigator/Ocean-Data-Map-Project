import numpy as np
import re
import datetime
from mpl_toolkits.basemap import Basemap
from utils.errors import ClientError, ServerError

def get_filename(plot_type, dataset_name, extension):
    outname = [
        plot_type,
        dataset_name,
        datetime.datetime.now().isoformat()
    ]

    return "%s.%s" % ("_".join(map(str, outname)), extension)


def get_mimetype(filetype: str):
    if filetype == 'png':
        mime = 'image/png'
    elif filetype == 'jpeg':
        mime = 'image/jpeg'
    elif filetype == 'svg':
        mime = 'image/svg+xml'
    elif filetype == 'pdf':
        mime = 'application/pdf'
    elif filetype == 'ps':
        mime = 'application/postscript'
    elif filetype == 'tiff':
        mime = 'image/tiff'
    elif filetype == 'eps':
        mime = 'application/postscript'
    elif filetype == 'geotiff':
        mime = 'image/geotifffloat64'
    elif filetype == 'csv':
        mime = 'text/csv'
    elif filetype == 'odv':
        mime = 'text/plain'
        filetype = 'txt'
    else:
        filetype = 'png'
        mime = 'image/png'

    return (filetype, mime)


def normalize_scale(data, variable_config):
    vmin = np.amin(data)
    vmax = np.amax(data)

    if variable_config.is_zero_centered:
        vmax = max(abs(vmax), abs(vmin))
        vmin = -vmax

    if variable_config.unit == 'fraction':
        vmin = 0
        vmax = 1

    return vmin, vmax


def mathtext(text):
    if re.search(r"[Cc]elsius", text):
        text = re.sub(r"(degree[_ ])?[Cc]elsius", '\u00b0C', text)
    if re.search(r"[Kk]elvin", text):
        text = re.sub(r"(degree[_ ])?[Kk]elvin", '\u00b0K', text)
    if re.search(r"-[0-9]", text):
        text = re.sub(r" ([^- ])-1", r"/\1", text)
        text = re.sub(r" ([^- ])-([2-9][0-9]*)", r"/\1^\2", text)
        text = re.sub(r"([a-z]+)\^-([0-9]+)", r"/ \1^\2", text)
    if re.search(r"[/_\^\\]", text):
        return "$%s$" % text
    else:
        return text


# Plots point(s) on a map (called when "Show Location" is true)
def _map_plot(points, path=True, quiver=True):
    minlat = np.min(points[0, :])
    maxlat = np.max(points[0, :])
    minlon = np.min(points[1, :])
    maxlon = np.max(points[1, :])
    lat_d = max(maxlat - minlat, 20)
    lon_d = max(maxlon - minlon, 20)
    minlat -= lat_d / 3
    minlon -= lon_d / 3
    maxlat += lat_d / 3
    maxlon += lon_d / 3
    if minlat < -90:
        minlat = -90
    if maxlat > 90:
        maxlat = 90

    m = Basemap(
        llcrnrlon=minlon,
        llcrnrlat=minlat,
        urcrnrlon=maxlon,
        urcrnrlat=maxlat,
        lat_0=np.mean(points[0, :]),
        lon_0=np.mean(points[1, :]),
        resolution='c', projection='merc',
        rsphere=(6378137.00, 6356752.3142),
    )    

    if path:
        marker = ''
        if (np.round(points[1, :], 2) == np.round(points[1, 0], 2)).all() and \
                (np.round(points[0, :], 2) == np.round(points[0, 0], 2)).all():
            marker = '.'
        m.plot(points[1, :], points[0, :],
               latlon=True, color='r', linestyle='-', marker=marker)
        if quiver:
            qx, qy = m([points[1, -1]], [points[0, -1]])
            qu = points[1, -1] - points[1, -2]
            qv = points[0, -1] - points[0, -2]
            qmag = np.sqrt(qu ** 2 + qv ** 2)
            qu /= qmag
            qv /= qmag
            m.quiver(qx, qy, qu, qv,
                     pivot='tip',
                     scale=8,
                     width=0.25,
                     minlength=0.25,
                     color='r')
    else:
        for idx in range(0, points.shape[1]):
            m.plot(points[1, idx], points[0, idx], 'o', latlon=True, color='r')

    # Draw a realistic background "blue marble"
    try:
        m.bluemarble()
    
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
    except:
        raise ClientError("Plot is too close to pole. Changing your projection may solve this - Return to the main page, under settings, then Projection")


def point_plot(points):
    _map_plot(points, False)


def path_plot(points, quiver=True):
    _map_plot(points, True, quiver=quiver)


def _find_var(dataset, candidates):
    for c in candidates:
        if c in dataset.variables:
            return dataset.variables[c]

    return None


def get_time_var(dataset):
    return _find_var(dataset, [
        'time_counter',
        'time',
    ])


def get_latlon_vars(dataset):
    return (
        _find_var(dataset, ['nav_lat', 'latitude']),
        _find_var(dataset, ['nav_lon', 'longitude']),
    )

