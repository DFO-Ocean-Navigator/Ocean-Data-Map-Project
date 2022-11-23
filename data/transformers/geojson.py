import numpy as np
import xarray as xr
from geojson import Feature, FeatureCollection, Point

from data.utils import trunc


async def data_array_to_geojson(
    data_array: xr.DataArray,
    bearings: xr.DataArray,
    lat_var: xr.DataArray,
    lon_var: xr.DataArray,
    scale: list,
) -> FeatureCollection:
    """
    Converts a given xarray.DataArray, along with lat and lon keys to a
    geojson.FeatureCollection (subclass of dict).

    A FeatureCollection is really just a list of geojson.Feature classes.
    Each Feature contains a geojson.Point, and a `properties` dict which holds
    arbitrary attributes of interest for a Point. In the case of this function,
    each Feature has the following properties:

    * The data value corresponding to a lat/lon pair (e.g. salinity or temperature)
    * A copy of the `attribs` field held in the data_array (yes there's lots of
    duplication...blame the geojson spec).

    Important notes:

    * All data values are truncated to 3 decimal places.
    * NaN values are not added to the returned FeatureCollection...they are skipped.

    Parameters:
        * data_array -- A 2D field (i.e. lat/lon only...time and depth dims should be
                        sliced out).
        * lat_key -- Key of the latitude coordinate (e.g. "latitude").
        * lon_key -- Key of the longitude coordinate (e.g. "longitude").

    Returns:
        FeatureCollection -- the subclassed `dict` with transformed collection of
        geojson features.
    """

    if data_array.ndim != 2:
        raise ValueError(f"Data is not a 2D field: {data_array.shape}")

    # Need to ensure that data values are 64-bit floats (i.e. Python builtin float)
    # because that's the only type of float that json will serialize without a custom
    # serializer. Floats from netCDF4 datasets are often 32-bit.
    data = trunc(data_array).astype(float).values

    if bearings is not None:
        bearings = trunc(bearings).astype(float).values

    units_key = next((s for s in data_array.attrs.keys() if "units" in s), None)

    name_key = "long_name"
    if "long_name" not in data_array.attrs.keys():
        name_key = next((s for s in data_array.attrs.keys() if "name" in s), None)

    attribs = {
        "units": data_array.attrs[units_key],
        "name": data_array.attrs[name_key],
    }

    def enumerate_nd_array(array: np.ndarray):
        it = np.nditer(array, flags=["multi_index"], op_flags=["readonly"])
        while not it.finished:
            yield it[0], it.multi_index
            it.iternext()

    if bearings is not None:
        scale_data = np.ceil(10 * (data - scale[0]) / scale[1])
        scale_data[scale_data > 9] = 9
        scale_data[scale_data < 0] = 0
    else:
        scale_data = np.full(data.shape, 2)

    features = []
    for elem, multi_idx in enumerate_nd_array(data):
        if np.isnan(elem):
            continue

        p = Point(
            (
                ((lon_var[multi_idx[1]].item() + 180.0) % 360.0) - 180.0,
                lat_var[multi_idx[0]].item(),
            )
        )

        props = {**attribs, "data": elem.item()}

        if bearings is not None:
            if np.isnan(bearings[multi_idx].item()):
                continue
            props["bearing"] = bearings[multi_idx].item()
        props["scale"] = int(scale_data[multi_idx])

        features.append(Feature(geometry=p, properties=props))

    return FeatureCollection(features)
