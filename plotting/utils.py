def get_filename(url, location, variable, units, timestamp, depthstr,
                 extension):
    outname = []
    outname.append("_".join(url.split('/')[-3:-1]))
    if isinstance(variable, list):
        outname.append(",".join([str(x) for x in variable]))
    else:
        outname.append(variable)
    outname.append(units)
    if isinstance(location, list):
        outname.append(",".join(["%0.4f" % x for x in location[0]]))
        outname.append(",".join(["%0.4f" % x for x in location[1]]))
    elif location is not None:
        outname.append(location)
    if isinstance(timestamp, list):
        for t in timestamp:
            outname.append(t.strftime("%Y%m%d%H%M%S"))
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
