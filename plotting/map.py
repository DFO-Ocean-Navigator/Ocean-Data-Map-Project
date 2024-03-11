import copy
import os
import tempfile
from textwrap import wrap

import cartopy.crs as ccrs
import cartopy.img_transform as cimg_transform
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import FuncNorm
from matplotlib.patches import PathPatch, Polygon
from matplotlib.path import Path
from osgeo import gdal, osr
from shapely.geometry import LinearRing, MultiPolygon, Point
from shapely.geometry import Polygon as Poly
from shapely.ops import cascaded_union

import plotting.basemap as basemap
import plotting.colormap as colormap
import plotting.overlays as overlays
import plotting.utils as utils
from data import open_dataset
from oceannavigator import DatasetConfig
from plotting.plotter import Plotter
from utils.errors import ClientError
from utils.misc import list_areas


class MapPlotter(Plotter):
    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "map"
        self.plot_projection = None
        self.pc_projection = ccrs.PlateCarree()

        super().__init__(dataset_name, query, **kwargs)

    def parse_query(self, query):
        super().parse_query(query)

        if len(self.variables) > 1:
            raise ClientError(
                f"MapPlotter only supports 1 variable. \
                    Received multiple: {self.variables}"
            )

        self.projection = query.get("projection")

        self.area = query.get("area")

        names = []
        centroids = []
        all_rings = []
        data = None
        for idx, a in enumerate(self.area):
            if isinstance(a, str):

                sp = a.split("/", 1)
                if data is None:
                    data = list_areas(sp[0], simplify=False)

                b = [x for x in data if x.get("key") == a]
                a = b[0]
                self.area[idx] = a
            else:
                self.points = copy.deepcopy(np.array(a["polygons"]))
                a["polygons"] = self.points.tolist()
                a["name"] = " "

            rings = [LinearRing(po) for po in a["polygons"]]
            if len(rings) > 1:
                u = cascaded_union(rings)
            else:
                u = rings[0]

            all_rings.append(u)
            if a.get("name"):
                names.append(a.get("name"))
                centroids.append(u.centroid)
        nc = sorted(zip(names, centroids))
        self.names = [n for (n, c) in nc]
        self.centroids = [c for (n, c) in nc]
        data = None

        if len(all_rings) > 1:
            combined = cascaded_union(all_rings)
        else:
            combined = all_rings[0]

        self.combined_area = combined
        combined = combined.envelope

        self.centroid = list(combined.centroid.coords)[0]
        self.bounds = combined.bounds

        self.show_bathymetry = bool(query.get("bathymetry"))
        self.show_area = bool(query.get("showarea"))

        self.quiver = query.get("quiver")

        self.contour = query.get("contour")

    def __load_quiver(self) -> bool:
        return (
            self.quiver is not None
            and self.quiver["variable"]
            and self.quiver["variable"] != "none"
        )

    def __load_contour(self) -> bool:
        return (
            self.contour is not None
            and self.contour["variable"]
            and self.contour["variable"] != "none"
        )

    def __apply_poly_mask(self, data: np.ma.MaskedArray) -> np.ma.MaskedArray:
        area = self.area[0]
        polys = []
        for co in area["polygons"] + area["innerrings"]:
            polys.append(np.array(co))

        path = Path(polys[0])

        points = [
            (lat, lon)
            for lat, lon in zip(np.ravel(self.latitude), np.ravel(self.longitude))
        ]
        inside_points = path.contains_points(points)
        inside_points = np.reshape(inside_points, data.shape)

        mask = data.mask + ~inside_points
        return data.data[~mask]

    def load_data(self):

        width_scale = 1.25
        height_scale = 1.25

        if self.projection == "EPSG:32661":  # north pole projection
            near_pole, covers_pole = self.pole_proximity(self.points[0])
            blat = min(self.bounds[0], self.bounds[2])
            blat = 5 * np.floor(blat / 5)

            if self.centroid[0] > 80 or near_pole or covers_pole:
                self.plot_projection = ccrs.Stereographic(
                    central_latitude=self.centroid[0],
                    central_longitude=self.centroid[1],
                )
                width_scale = 1.5
            else:
                self.plot_projection = ccrs.LambertConformal(
                    central_latitude=self.centroid[0],
                    central_longitude=self.centroid[1],
                )
        elif self.projection == "EPSG:3031":  # south pole projection
            near_pole, covers_pole = self.pole_proximity(self.points[0])
            blat = max(self.bounds[0], self.bounds[2])
            blat = 5 * np.ceil(blat / 5)
            # is centerered close to the south pole
            if (
                (self.centroid[0] < -80 or self.bounds[1] < -80 or self.bounds[3] < -80)
                or covers_pole
            ) or near_pole:
                self.plot_projection = ccrs.Stereographic(
                    central_latitude=self.centroid[0],
                    central_longitude=self.centroid[1],
                )
                width_scale = 1.5
            else:
                self.plot_projection = ccrs.LambertConformal(
                    central_latitude=self.centroid[0],
                    central_longitude=self.centroid[1],
                )

        elif abs(self.centroid[1] - self.bounds[1]) > 90:

            if abs(self.bounds[3] - self.bounds[1]) > 360:
                raise ClientError(
                    ( # gettext(
                        "You have requested an area that exceeds the width \
                        of the world. Thinking big is good but plots need to \
                        be less than 360 deg wide."
                    )
                )
            self.plot_projection = ccrs.Mercator(central_longitude=self.centroid[1])

        else:
            self.plot_projection = ccrs.LambertConformal(
                central_latitude=self.centroid[0], central_longitude=self.centroid[1]
            )

        proj_bounds = self.plot_projection.transform_points(
            self.pc_projection,
            np.array([self.bounds[1], self.bounds[3]]),
            np.array([self.bounds[0], self.bounds[2]]),
        )
        proj_size = np.diff(proj_bounds, axis=0)

        width = proj_size[0][0] * width_scale
        height = proj_size[0][1] * height_scale

        aspect_ratio = height / width
        if aspect_ratio < 1:
            gridx = 500
            gridy = int(500 * aspect_ratio)
        else:
            gridy = 500
            gridx = int(500 / aspect_ratio)

        self.plot_res = basemap.get_resolution(height, width)

        x_grid, y_grid, self.plot_extent = cimg_transform.mesh_projection(
            self.plot_projection,
            gridx,
            gridy,
            x_extents=(-width / 2, width / 2),
            y_extents=(-height / 2, height / 2),
        )

        latlon_grid = self.pc_projection.transform_points(
            self.plot_projection, x_grid, y_grid
        )

        self.longitude = latlon_grid[:, :, 0]
        self.latitude = latlon_grid[:, :, 1]

        variables_to_load = self.variables[
            :
        ]  # we don't want to change self,variables so copy it

        if self.__load_contour():
            variables_to_load.append(self.contour["variable"])
        if self.__load_quiver():
            variables_to_load.append(self.quiver["variable"])

        with open_dataset(
            self.dataset_config, variable=variables_to_load, timestamp=self.time
        ) as dataset:

            self.variable_unit = self.get_variable_units(dataset, self.variables)[0]
            self.variable_name = self.get_variable_names(dataset, self.variables)[0]

            if self.cmap is None:
                self.cmap = colormap.find_colormap(self.variable_name)

            if self.depth == "bottom":
                depth_value_map = "Bottom"
            else:
                self.depth = np.clip(int(self.depth), 0, len(dataset.depths) - 1)
                depth_value = dataset.depths[self.depth]
                depth_value_map = depth_value

            data = []
            var = dataset.variables[self.variables[0]]
            if self.filetype in ["csv", "odv", "txt"]:
                d, depth_value_map = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    self.variables[0],
                    self.interp,
                    self.radius,
                    self.neighbours,
                    return_depth=True,
                )
            else:
                d = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    self.variables[0],
                    self.interp,
                    self.radius,
                    self.neighbours,
                )

            data.append(d)
            if self.filetype not in ["csv", "odv", "txt"]:
                if len(var.dimensions) == 3:
                    self.depth_label = ""
                elif self.depth == "bottom":
                    self.depth_label = " at Bottom"
                else:
                    self.depth_label = (
                        " at " + str(int(np.round(depth_value_map))) + " m"
                    )

            self.data = data[0]

            quiver_data = []
            # Store the quiver data on the same grid as the main variable. This
            # will only be used for CSV export.
            quiver_data_fullgrid = []

            if self.__load_quiver():
                var = dataset.variables[self.quiver["variable"]]
                quiver_unit = self.dataset_config.variable[var].unit
                quiver_x_var = self.dataset_config.variable[var].east_vector_component
                quiver_y_var = self.dataset_config.variable[var].north_vector_component
                quiver_x, quiver_y, _ = cimg_transform.mesh_projection(
                    self.plot_projection,
                    50,
                    50,
                    self.plot_extent[:2],
                    self.plot_extent[2:],
                )
                quiver_coords = self.pc_projection.transform_points(
                    self.plot_projection, quiver_x, quiver_y
                )
                quiver_lon = quiver_coords[:, :, 0]
                quiver_lat = quiver_coords[:, :, 1]

                x_vals = dataset.get_area(
                    np.array([quiver_lat, quiver_lon]),
                    self.depth,
                    self.time,
                    quiver_x_var,
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                quiver_data.append(x_vals)

                y_vals = dataset.get_area(
                    np.array([quiver_lat, quiver_lon]),
                    self.depth,
                    self.time,
                    quiver_y_var,
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                quiver_data.append(y_vals)

                mag_data = dataset.get_area(
                    np.array([quiver_lat, quiver_lon]),
                    self.depth,
                    self.time,
                    self.quiver["variable"],
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                self.quiver_magnitude = mag_data

                # Get the quiver data on the same grid as the main
                # variable.
                x_vals = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    quiver_x_var,
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                quiver_data_fullgrid.append(x_vals)

                y_vals = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    quiver_y_var,
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                quiver_data_fullgrid.append(y_vals)

                self.quiver_name = self.get_variable_names(
                    dataset, [self.quiver["variable"]]
                )[0]
                self.quiver_longitude = quiver_lon
                self.quiver_latitude = quiver_lat
                self.quiver_unit = quiver_unit
            self.quiver_data = quiver_data
            self.quiver_data_fullgrid = quiver_data_fullgrid

            if all([dataset.variables[v].is_surface_only() for v in variables_to_load]):
                self.depth = 0

            contour_data = []
            if self.__load_contour():
                d = dataset.get_area(
                    np.array([self.latitude, self.longitude]),
                    self.depth,
                    self.time,
                    self.contour["variable"],
                    self.interp,
                    self.radius,
                    self.neighbours,
                )
                vc = self.dataset_config.variable[self.contour["variable"]]
                contour_unit = vc.unit
                contour_name = vc.name
                contour_data.append(d)
                self.contour_unit = contour_unit
                self.contour_name = contour_name

            self.contour_data = contour_data

            self.timestamp = dataset.nc_data.timestamp_to_iso_8601(self.time)

        if self.compare:
            self.variable_name += " Difference"
            compare_config = DatasetConfig(self.compare["dataset"])
            with open_dataset(
                compare_config,
                variable=self.compare["variables"],
                timestamp=self.compare["time"],
            ) as dataset:
                data = []
                for v in self.compare["variables"]:
                    var = dataset.variables[v]
                    d = dataset.get_area(
                        np.array([self.latitude, self.longitude]),
                        self.compare["depth"],
                        self.compare["time"],
                        v,
                        self.interp,
                        self.radius,
                        self.neighbours,
                    )
                    data.append(d)

                data = data[0]

                self.data -= data
        # Load bathymetry data
        self.bathymetry = overlays.bathymetry(self.latitude, self.longitude, blur=2)

        if self.depth != "bottom" and self.depth != 0:
            if quiver_data:
                quiver_bathymetry = overlays.bathymetry(quiver_lat, quiver_lon)

            self.data[np.where(self.bathymetry < depth_value_map)] = np.ma.masked
            for d in self.quiver_data:
                d[np.where(quiver_bathymetry < depth_value)] = np.ma.masked
            for d in self.contour_data:
                d[np.where(self.bathymetry < depth_value_map)] = np.ma.masked

        if self.area and self.filetype in ["csv", "odv", "txt", "geotiff"]:
            area_polys = []
            for a in self.area:
                rings = [LinearRing(p) for p in a["polygons"]]
                innerrings = [LinearRing(p) for p in a["innerrings"]]

                polygons = []
                for r in rings:
                    inners = []
                    for ir in innerrings:
                        if r.contains(ir):
                            inners.append(ir)

                    polygons.append(Poly(r, inners))

                area_polys.append(MultiPolygon(polygons))

            points = [
                Point(p) for p in zip(self.latitude.ravel(), self.longitude.ravel())
            ]

            indicies = []
            for a in area_polys:
                indicies.append(
                    np.where(list(map(lambda p, poly=a: poly.contains(p), points)))[0]
                )

            indicies = np.unique(np.array(indicies).ravel())
            newmask = np.ones(self.data.shape, dtype=bool)
            newmask[np.unravel_index(indicies, newmask.shape)] = False
            self.data.mask |= newmask

        self.depth_value_map = depth_value_map

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.3f" % x)
        data = float_to_str(self.data.ravel()[::5])
        station = ["%06d" % x for x in range(1, len(data) + 1)]

        latitude = self.latitude.ravel()[::5]
        longitude = self.longitude.ravel()[::5]
        time = np.repeat(self.timestamp, data.shape[0])
        depth = self.depth_value_map.ravel()[::5]

        return super(MapPlotter, self).odv_ascii(
            self.dataset_name,
            [self.variable_name],
            [self.variable_unit],
            station,
            latitude,
            longitude,
            depth,
            time,
            data,
        )

    def csv(self):
        # If the user has selected the display of quiver data in the browser,
        # then also export that data in the CSV file.
        have_quiver = self.__load_quiver()

        header = [
            ["Dataset", self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()],
        ]

        columns = [
            "Latitude",
            "Longitude",
            "Depth (m)",
            "%s (%s)" % (self.variable_name, self.variable_unit),
        ]
        data_in = self.data.ravel()[::5]
        if have_quiver:
            # Include bearing information in the exported data, as per user
            # requests.
            columns.extend(
                [
                    "%s X (%s)" % (self.quiver_name, self.quiver_unit),
                    "%s Y (%s)" % (self.quiver_name, self.quiver_unit),
                    "Bearing (degrees clockwise positive from North)",
                ]
            )
            quiver_data_in = (
                self.quiver_data_fullgrid[0].ravel()[::5],
                self.quiver_data_fullgrid[1].ravel()[::5],
            )
            bearing = np.arctan2(
                self.quiver_data_fullgrid[1].ravel()[::5],
                self.quiver_data_fullgrid[0].ravel()[::5],
            )
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi

        latitude = self.latitude.ravel()[::5]
        longitude = self.longitude.ravel()[::5]
        depth = self.depth_value_map.ravel()[::5]

        data = []
        for idx in range(0, len(latitude)):
            if np.ma.is_masked(data_in[idx]):
                continue

            entry = [
                "%0.4f" % latitude[idx],
                "%0.4f" % longitude[idx],
                "%0.1f" % depth[idx],
                "%0.3f" % data_in[idx],
            ]
            if have_quiver:
                entry.extend(
                    [
                        "%0.3f" % quiver_data_in[0][idx],
                        "%0.3f" % quiver_data_in[1][idx],
                        "%0.3f" % bearing[idx],
                    ]
                )
            data.append(entry)

        return super(MapPlotter, self).csv(header, columns, data)

    def stats_csv(self):
        # If the user has selected the display of quiver data in the browser,
        # then also export that data in the CSV file.
        have_quiver = self.__load_quiver()

        header = [
            ["Dataset", self.dataset_name],
            ["Timestamp", self.timestamp.isoformat()],
        ]

        columns = [
            "Statistic",
            "%s (%s)" % (self.variable_name, self.variable_unit),
        ]

        masked_data = self.__apply_poly_mask(self.data)

        if have_quiver:
            # Include bearing information in the exported data, as per user
            # requests.
            columns.extend(
                [
                    "%s X (%s)" % (self.quiver_name, self.quiver_unit),
                    "%s Y (%s)" % (self.quiver_name, self.quiver_unit),
                    "Bearing (degrees clockwise positive from North)",
                ]
            )

            masked_quiver_ew = self.__apply_poly_mask(self.quiver_data_fullgrid[0])
            masked_quiver_ns = self.__apply_poly_mask(self.quiver_data_fullgrid[1])

            bearing = np.arctan2(
                masked_quiver_ew.ravel(),
                masked_quiver_ns.ravel(),
            )
            bearing = np.pi / 2.0 - bearing
            bearing[bearing < 0] += 2 * np.pi
            bearing *= 180.0 / np.pi

            stats_data = np.stack(
                (
                    masked_data.ravel(),
                    masked_quiver_ew.ravel(),
                    masked_quiver_ns.ravel(),
                    bearing.ravel(),
                )
            ).T
        else:
            stats_data = np.expand_dims(masked_data, 1)

        data = [
            ["Min"] + np.nanmin(stats_data, axis=0).tolist(),
            ["Max"] + np.nanmax(stats_data, axis=0).tolist(),
            ["Mean"] + np.nanmean(stats_data, axis=0).tolist(),
            ["Standard Deviation"] + np.nanstd(stats_data, axis=0).tolist(),
        ]

        return super(MapPlotter, self).csv(header, columns, data)

    def pole_proximity(self, points):
        near_pole, covers_pole, quad1, quad2, quad3, quad4 = (
            False,
            False,
            False,
            False,
            False,
            False,
        )
        for p in points:
            if abs(p[0]) > 80:
                near_pole = True
            if -180 <= p[1] <= -90:
                quad1 = True
            elif -90 <= p[1] <= 0:
                quad2 = True
            elif 0 <= p[1] <= 90:
                quad3 = True
            elif 90 <= p[1] <= 180:
                quad4 = True
            if quad1 and quad2 and quad3 and quad4:
                covers_pole = True

        return near_pole, covers_pole

    def plot(self):

        if self.filetype == "geotiff":
            f, fname = tempfile.mkstemp()
            os.close(f)

            driver = gdal.GetDriverByName("GTiff")
            outRaster = driver.Create(
                fname,
                self.latitude.shape[1],
                self.longitude.shape[0],
                1,
                gdal.GDT_Float64,
            )
            x = np.array([self.longitude[0, 0], self.longitude[-1, -1]])
            y = np.array([self.latitude[0, 0], self.latitude[-1, -1]])
            outRasterSRS = osr.SpatialReference()

            pts = self.plot_projection.transform_points(self.pc_projection, x, y)
            x = pts[:, 0]
            y = pts[:, 1]
            outRasterSRS.ImportFromProj4(self.plot_projection.proj4_init)

            pixelWidth = (x[-1] - x[0]) / self.longitude.shape[0]
            pixelHeight = (y[-1] - y[0]) / self.latitude.shape[0]
            outRaster.SetGeoTransform((x[0], pixelWidth, 0, y[0], 0, pixelHeight))

            outband = outRaster.GetRasterBand(1)
            d = self.data.astype(np.float64)
            ndv = d.fill_value
            outband.WriteArray(d.filled(ndv))
            outband.SetNoDataValue(ndv)
            outRaster.SetProjection(outRasterSRS.ExportToWkt())
            outband.FlushCache()
            outRaster = None

            with open(fname, "r", encoding="latin-1") as f:
                buf = f.read()
            os.remove(fname)

            return (buf, self.mime, self.filename.replace(".geotiff", ".tif"))
        # Figure size
        figuresize = list(map(float, self.size.split("x")))
        fig, map_plot = basemap.load_map(
            self.plot_projection,
            self.plot_extent,
            figuresize,
            self.dpi,
            self.plot_res,
        )

        ax = plt.gca()

        if self.scale:
            vmin = self.scale[0]
            vmax = self.scale[1]
        else:
            vmin, vmax = utils.normalize_scale(
                self.data, self.dataset_config.variable[f"{self.variables[0]}"]
            )

        c = map_plot.imshow(
            self.data,
            vmin=vmin,
            vmax=vmax,
            cmap=self.cmap,
            extent=self.plot_extent,
            transform=self.plot_projection,
            origin="lower",
            zorder=0,
        )

        if len(self.quiver_data) == 2:
            qx, qy = self.quiver_data
            qx, qy = self.plot_projection.transform_vectors(
                self.pc_projection, self.quiver_longitude, self.quiver_latitude, qx, qy
            )
            pts = self.plot_projection.transform_points(
                self.pc_projection, self.quiver_longitude, self.quiver_latitude
            )
            x = pts[:, :, 0]
            y = pts[:, :, 1]

            qx = np.ma.masked_where(np.ma.getmask(self.quiver_data[0]), qx)
            qy = np.ma.masked_where(np.ma.getmask(self.quiver_data[1]), qy)

            if self.quiver["magnitude"] != "length":
                qx = qx / self.quiver_magnitude
                qy = qy / self.quiver_magnitude
                qscale = 50
            else:
                qscale = None

            if self.quiver["magnitude"] == "color":
                if (
                    self.quiver["colormap"] is None
                    or self.quiver["colormap"] == "default"
                ):
                    qcmap = colormap.colormaps.get("speed")
                else:
                    qcmap = colormap.colormaps.get(self.quiver["colormap"])
                q = map_plot.quiver(
                    x,
                    y,
                    qx,
                    qy,
                    self.quiver_magnitude,
                    width=0.0035,
                    headaxislength=4,
                    headlength=4,
                    scale=qscale,
                    pivot="mid",
                    cmap=qcmap,
                    transform=self.plot_projection,
                )
            else:
                q = map_plot.quiver(
                    x,
                    y,
                    qx,
                    qy,
                    width=0.0025,
                    headaxislength=4,
                    headlength=4,
                    scale=qscale,
                    pivot="mid",
                    transform=self.plot_projection,
                    zorder=6,
                )

            if self.quiver["magnitude"] == "length":
                unit_length = np.mean(self.quiver_magnitude) * 2
                unit_length = np.round(
                    unit_length, -int(np.floor(np.log10(unit_length)))
                )
                if unit_length >= 1:
                    unit_length = int(unit_length)

                plt.quiverkey(
                    q,
                    0.65,
                    0.01,
                    unit_length,
                    self.quiver_name.title()
                    + " "
                    + str(unit_length)
                    + " "
                    + utils.mathtext(self.quiver_unit),
                    coordinates="figure",
                    labelpos="E",
                )

        if self.show_bathymetry:
            # Plot bathymetry on top
            cs = map_plot.contour(
                self.longitude,
                self.latitude,
                self.bathymetry,
                linewidths=0.5,
                norm=FuncNorm(
                    (lambda x: np.log10(x), lambda x: 10**x), vmin=1, vmax=6000
                ),
                cmap="Greys",
                levels=[100, 200, 500, 1000, 2000, 3000, 4000, 5000, 6000],
                transform=self.pc_projection,
                zorder=4,
            )
            plt.clabel(cs, fontsize="x-large", fmt="%1.0fm")

        if self.area and self.show_area:
            for a in self.area:
                polys = []
                for co in a["polygons"] + a["innerrings"]:
                    coords = np.array(co).transpose()
                    coords_transform = self.plot_projection.transform_points(
                        self.pc_projection, coords[1], coords[0]
                    )
                    mx = coords_transform[:, 0]
                    my = coords_transform[:, 1]
                    map_coords = list(zip(mx, my))
                    polys.append(Polygon(map_coords))

                paths = []
                for poly in polys:
                    paths.append(poly.get_path())
                path = Path.make_compound_path(*paths)

                for ec, lw in zip(["w", "k"], [5, 3]):
                    poly = PathPatch(
                        path,
                        fill=None,
                        edgecolor=ec,
                        linewidth=lw,
                        transform=self.plot_projection,
                        zorder=3,
                    )
                    map_plot.add_patch(poly)

            if self.names is not None and len(self.names) > 1:
                for idx, name in enumerate(self.names):
                    pts = self.plot_projection.transform_points(
                        self.pc_projection, self.centroids[idx].x, self.centroids[idx].y
                    )
                    x = pts[:, 0]
                    y = pts[:, 1]
                    plt.annotate(
                        xy=(x, y),
                        s=name,
                        ha="center",
                        va="center",
                        size=12,
                        # weight='bold'
                    )

        if len(self.contour_data) > 0:
            if self.contour_data[0].min() != self.contour_data[0].max():
                cmin, cmax = utils.normalize_scale(
                    self.contour_data[0],
                    self.dataset_config.variable[self.contour["variable"]],
                )
                levels = None
                if (
                    self.contour.get("levels") is not None
                    and self.contour["levels"] != "auto"
                    and self.contour["levels"] != ""
                ):
                    try:
                        levels = list(
                            set(
                                [
                                    float(xx)
                                    for xx in self.contour["levels"].split(",")
                                    if xx.strip()
                                ]
                            )
                        )
                        levels.sort()
                    except ValueError:
                        pass

                if levels is None:
                    levels = np.linspace(cmin, cmax, 5)
                cmap = self.contour["colormap"]
                if cmap is not None:
                    cmap = colormap.colormaps.get(cmap)
                    if cmap is None:
                        cmap = colormap.find_colormap(self.contour_name)

                if not self.contour.get("hatch"):
                    contours = map_plot.contour(
                        self.longitude,
                        self.latitude,
                        self.contour_data[0],
                        linewidths=2,
                        levels=levels,
                        cmap=cmap,
                        transform=self.pc_projection,
                        zorder=5,
                    )
                else:
                    hatches = ["//", "xx", "\\\\", "--", "||", "..", "oo", "**"]
                    if len(levels) + 1 < len(hatches):
                        hatches = hatches[0 : len(levels) + 2]
                    map_plot.contour(
                        self.longitude,
                        self.latitude,
                        self.contour_data[0],
                        linewidths=1,
                        levels=levels,
                        colors="k",
                        transform=self.pc_projection,
                        zorder=5,
                    )
                    contours = map_plot.contourf(
                        self.longitude,
                        self.latitude,
                        self.contour_data[0],
                        colors=["none"],
                        levels=levels,
                        hatches=hatches,
                        vmin=cmin,
                        vmax=cmax,
                        extend="both",
                        transform=self.pc_projection,
                        zorder=5,
                    )

                if self.contour["legend"]:
                    handles, lab = contours.legend_elements()
                    labels = []
                    for i, _ in enumerate(lab):
                        if self.contour.get("hatch"):
                            if self.contour_unit == "fraction":
                                if i == 0:
                                    labels.append(
                                        "$x \\leq {0: .0f}\\%$".format(levels[i] * 100)
                                    )
                                elif i == len(levels):
                                    labels.append(
                                        "$x > {0: .0f}\\%$".format(levels[i - 1] * 100)
                                    )
                                else:
                                    labels.append(
                                        "${0:.0f}\\% < x \\leq {1:.0f}\\%$".format(
                                            levels[i - 1] * 100, levels[i] * 100
                                        )
                                    )
                            else:
                                if i == 0:
                                    labels.append("$x \\leq %.3g$" % levels[i])
                                elif i == len(levels):
                                    labels.append("$x > %.3g$" % levels[i - 1])
                                else:
                                    labels.append(
                                        "$%.3g < x \\leq %.3g$"
                                        % (levels[i - 1], levels[i])
                                    )
                        else:
                            if self.contour_unit == "fraction":
                                labels.append("{0:.0%}".format(levels[i]))
                            else:
                                labels.append(
                                    "%.3g %s"
                                    % (levels[i], utils.mathtext(self.contour_unit))
                                )

                    ax = plt.gca()

                    if self.contour_unit != "fraction" and not self.contour.get(
                        "hatch"
                    ):
                        contour_title = "%s (%s)" % (
                            self.contour_name,
                            utils.mathtext(self.contour_unit),
                        )
                    else:
                        contour_title = self.contour_name

                    leg = ax.legend(
                        handles[::-1],
                        labels[::-1],
                        loc="lower left",
                        fontsize="medium",
                        frameon=True,
                        framealpha=0.75,
                        title=contour_title,
                    )
                    leg.get_title().set_fontsize("medium")
                    if not self.contour.get("hatch"):
                        for legobj in leg.legendHandles:
                            legobj.set_linewidth(3)

        title = self.plotTitle

        var_unit = utils.mathtext(self.variable_unit)
        if self.plotTitle is None or self.plotTitle == "":
            area_title = "\n".join(wrap(", ".join(self.names), 60)) + "\n"

            title = "%s %s %s, %s" % (
                area_title,
                self.variable_name.title(),
                self.depth_label,
                self.date_formatter(self.timestamp),
            )
        plt.title(title.strip())
        axpos = map_plot.get_position()
        pos_x = axpos.x0 + axpos.width + 0.01
        pos_y = axpos.y0
        cax = fig.add_axes([pos_x, pos_y, 0.03, axpos.height])
        bar = plt.colorbar(c, cax=cax)
        bar.set_label(
            f"{self.variable_name.title()} ({var_unit})",
            fontsize=14,
        )

        if (
            self.quiver is not None
            and self.quiver["variable"] != ""
            and self.quiver["variable"] != "none"
            and self.quiver["magnitude"] == "color"
        ):
            pos_x = axpos.x0
            pos_y = axpos.y0 - 0.05
            bax = fig.add_axes([pos_x, pos_y, axpos.width, 0.03])
            qbar = plt.colorbar(q, orientation="horizontal", cax=bax)
            qbar.set_label(
                self.quiver_name.title() + " " + utils.mathtext(self.quiver_unit),
                fontsize=14,
            )
            y_offset = -0.25
        else:
            y_offset = -0.1

        masked_data = self.__apply_poly_mask(self.data)

        ax.text(
            0,
            y_offset,
            self.get_stats_str(masked_data, var_unit),
            fontsize=14,
            transform=map_plot.transAxes,
        )

        return super(MapPlotter, self).plot(fig)
