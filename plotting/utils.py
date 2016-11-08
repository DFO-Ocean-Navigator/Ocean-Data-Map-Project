import numpy as np
import re
import inspect
import datetime


def get_filename(dataset_name, extension):
    st = inspect.stack()

    outname = [
        st[1][1].split('/')[-1].split('.')[0],
        st[1][3],
    ]
    outname.append(dataset_name)
    outname.append(datetime.datetime.now().isoformat())

    return "%s.%s" % ("_".join(outname), extension)


def get_mimetype(filetype):
    if filetype == 'png':
        mime = 'image/png'
    elif filetype == 'svg':
        mime = 'image/svg+xml'
    elif filetype == 'pdf':
        mime = 'application/pdf'
    elif filetype == 'ps':
        mime = 'application/postscript'
    elif filetype == 'tif':
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


def normalize_scale(data, name, unit):
    vmin = np.amin(data)
    vmax = np.amax(data)

    if re.search("free surface", name, re.IGNORECASE) or \
        re.search("surface height", name, re.IGNORECASE) or \
        re.search("velocity", name, re.IGNORECASE) or \
            re.search("wind", name, re.IGNORECASE):
        vmin = min(vmin, -vmax)
        vmax = max(vmax, -vmin)

    if unit == 'fraction':
        vmin = 0
        vmax = 1

    return vmin, vmax


def mathtext(text):
    if text in ['Celsius', 'degree_Celsius']:
        text = u'\u00b0C'
    if re.search(r"[/_\^\\]", text):
        return "$%s$" % text
    else:
        return text
