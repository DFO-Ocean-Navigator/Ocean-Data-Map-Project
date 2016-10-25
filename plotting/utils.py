import numpy as np
import re


def get_filename(url, locations, variable, units, timestamp, depthstr,
                 extension):
    outname = []
    outname.append("_".join(url.split('/')[-3:-1]))
    if isinstance(variable, list):
        outname.append(",".join([str(x) for x in variable]))
    else:
        outname.append(variable)
    outname.append(units)
    if isinstance(locations, list):
        for l in locations:
            outname.append(",".join(["%0.4f" % x for x in l]))
    elif locations is not None:
        outname.append(locations)
    if isinstance(timestamp, list) and len(timestamp) > 0:
        outname.append(timestamp[0].strftime("%Y%m%d%H%M%S"))
        outname.append(timestamp[-1].strftime("%Y%m%d%H%M%S"))
    elif timestamp is not None:
        outname.append(timestamp.strftime("%Y%m%d%H%M%S"))
    if depthstr is not None:
        outname.append(depthstr)

    return "%s.%s" % ("_".join([str(x) for x in outname]), extension)


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
