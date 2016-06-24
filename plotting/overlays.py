from netCDF4 import Dataset
import pyresample
from pyresample.utils import wrap_longitudes
import numpy as np
from scipy.ndimage.filters import gaussian_filter
import hashlib
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from cachetools import LRUCache
import threading
from oceannavigator import app
from pykml import parser
import shapely.geometry
import os
import werkzeug.utils
from matplotlib.bezier import concatenate_paths
from matplotlib.patches import PathPatch
import textwrap

_bathymetry_cache = LRUCache(maxsize=256 * 1024 * 1024, getsizeof=len)


def bathymetry(basemap, target_lat, target_lon, blur=None):
    CACHE_DIR = app.config['CACHE_DIR']
    BATHYMETRY_FILE = app.config['BATHYMETRY_FILE']

    if basemap is None:
        fname = str(np.median(target_lat)) + "," + str(np.median(target_lon))
    else:
        fname = basemap.filename

    hashed = hashlib.sha1(fname +
                          str(target_lat.shape) +
                          str(target_lon.shape)
                          ).hexdigest()
    if _bathymetry_cache.get(hashed) is None:
        try:
            data = np.load(CACHE_DIR + "/" + hashed + ".npy")
        except:
            with Dataset(BATHYMETRY_FILE, 'r') as ds:
                lat = ds.variables['y']
                lon = ds.variables['x']
                z = ds.variables['z']

                def lat_index(v):
                    return int(round((v - lat[0]) * 60.0))

                def lon_index(v):
                    return int(round((v - lon[0]) * 60.0))

                lon_idx_min = target_lon.argmin()
                lon_idx_max = target_lon.argmax()

                target_lon = wrap_longitudes(target_lon)

                minlat = lat_index(np.amin(target_lat))
                maxlat = lat_index(np.amax(target_lat))

                minlon = lon_index(target_lon.ravel()[lon_idx_min])
                maxlon = lon_index(target_lon.ravel()[lon_idx_max])

                if minlon > maxlon:
                    in_lon = np.concatenate((lon[minlon:], lon[0:maxlon]))
                    in_data = np.concatenate((z[minlat:maxlat, minlon:],
                                              z[minlat:maxlat, 0:maxlon]), 1)
                else:
                    in_lon = lon[minlon:maxlon]
                    in_data = z[minlat:maxlat, minlon:maxlon]

                res = in_data.transpose() * -1

                lats, lons = np.meshgrid(lat[minlat:maxlat], in_lon)

            orig_def = pyresample.geometry.SwathDefinition(
                lons=lons, lats=lats)
            target_def = pyresample.geometry.SwathDefinition(
                lons=target_lon.astype(np.float64),
                lats=target_lat.astype(np.float64))

            data = pyresample.kd_tree.resample_nearest(
                orig_def, res,
                target_def,
                radius_of_influence=500000,
                fill_value=None,
                nprocs=4)

            def do_save(filename, data):
                np.save(filename, data.filled())

            t = threading.Thread(
                target=do_save, args=(CACHE_DIR + "/" + hashed, data))
            t.daemon = True
            t.start()

        _bathymetry_cache[hashed] = data
    else:
        data = _bathymetry_cache[hashed]

    if blur is not None:
        try:
            return gaussian_filter(data, sigma=float(blur))
        except:
            return data
    else:
        return data


def _parse_coords(basemap, coordinates):
    coords = []
    coords_txt = coordinates
    for point_txt in coords_txt.text.split():
        lonlat = point_txt.split(",")
        coords.append((float(lonlat[0]), float(lonlat[1])))

    coords = np.array(coords)
    mx, my = basemap(coords.transpose()[0], coords.transpose()[1])
    map_coords = zip(mx, my)
    return map_coords


def list_overlays():
    KML_DIR = app.config['OVERLAY_KML_DIR']

    overlays = []
    for f in os.listdir(KML_DIR):
        if not f.endswith(".kml"):
            continue

        name = parser.parse(
            os.path.join(KML_DIR, f)).getroot().Document.Folder.name
        overlays.append({
            'id': os.path.basename(f),
            'value': name.text.encode("utf-8")
        })
    return overlays


def list_overlays_in_file(filename):
    KML_DIR = app.config['OVERLAY_KML_DIR']

    fp = os.path.join(KML_DIR, werkzeug.utils.secure_filename(filename))
    doc = parser.parse(fp)

    overlays = []
    for place in doc.getroot().Document.Folder.Placemark:
        name = place.name.text.encode("utf-8")
        overlays.append({'id': name, 'value': name})
    return overlays


def draw_overlay(basemap, kmlfile, **kwargs):
    KML_DIR = app.config['OVERLAY_KML_DIR']

    doc = parser.parse(os.path.join(KML_DIR,
                                    werkzeug.utils.secure_filename(kmlfile)))

    nsmap = {"k": doc.getroot().nsmap[None]}
    num_places = len(doc.getroot().Document.Folder.Placemark)
    for idx, place in enumerate(doc.getroot().Document.Folder.Placemark):
        polys = []
        filter_name = kwargs.get('name')
        name = place.name.text.encode("utf-8")
        if filter_name is not None:
            if isinstance(filter_name, basestring) and \
               filter_name != name:
                continue
            elif name not in filter_name:
                continue

        for c in place.iterfind('.//k:outerBoundaryIs//k:LinearRing', nsmap):
            map_coords = _parse_coords(basemap, c.coordinates)

            if bool(kwargs.get('label')) or \
                'labelcolor' in kwargs or \
                    'labelalpha' in kwargs:
                labelcolor = kwargs.get('labelcolor')
                if labelcolor == 'rnd':
                    labelcolor = plt.get_cmap('prism')(float(idx) / num_places)
                shape = shapely.geometry.Polygon(map_coords)
                wrappedname = '\n'.join(textwrap.wrap(name, 15))
                plt.annotate(
                    xy=(shape.centroid.x, shape.centroid.y),
                    s=wrappedname,
                    ha='center', va='center', size=10,
                    color=labelcolor,
                    alpha=kwargs.get('labelalpha'))

            polys.append(Polygon(map_coords))

        for c in place.iterfind('.//k:innerBoundaryIs//k:LinearRing', nsmap):
            map_coords = _parse_coords(basemap, c.coordinates)
            polys.append(Polygon(map_coords))

        paths = []
        for poly in polys:
            paths.append(poly.get_path())
        path = concatenate_paths(paths)

        if kwargs.get('facecolor') == 'rnd':
            facecolor = plt.get_cmap('prism')(float(idx) / num_places)
        else:
            facecolor = kwargs.get('facecolor')

        if kwargs.get('edgecolor') == 'rnd':
            edgecolor = plt.get_cmap('prism')(float(idx) / num_places)
        else:
            edgecolor = kwargs.get('edgecolor')
        poly = PathPatch(path,
                         fill='facecolor' in kwargs,
                         facecolor=facecolor,
                         edgecolor=edgecolor,
                         alpha=kwargs.get('alpha'),
                         linewidth=kwargs.get('linewidth')
                         )
        plt.gca().add_patch(poly)
