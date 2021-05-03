import xarray as xr
from data.utils import trunc

from geojson import Feature, FeatureCollection, Point


def data_array_to_geojson(data_array: xr.DataArray, lat_key: str, lon_key: str) -> FeatureCollection:
    """
    Converts a given xarray.DataArray, along with lat and lon keys to a geojson.FeatureCollection (subclass of dict).

    A FeatureCollection is really just a list of geojson.Feature classes.
    Each Feature contains a geojson.Point, and a `properties` dict which holds arbitrary attributes
    of interest for a Point. In the case of this function, each Feature has the following properties:

    * The data value corresponding to a lat/lon pair (e.g. salinity or temperature)
    * A copy of the `attribs` field held in the data_array (yes there's lots of duplication...blame the geojson spec).

    Important notes:

    * All data values are truncated to 3 decimal places.

    Parameters:
        * data_array -- A 2D field (i.e. lat/lon only...time and depth dims should be sliced out).
        * lat_key -- Key of the latitude coordinate (e.g. "latitude").
        * lon_key -- Key of the longitude coordinate (e.g. "longitude").

    Returns:
        FeatureCollection -- the transformed collection of geojson features.
    """

    if data_array.ndim != 2:
        raise ValueError(f"Data is not a 2D field: {data_array.shape}")


    # Need to ensure that data values are 64-bit floats (i.e. Python builtin float) because
    # that's the only type of float that json will serialize without a custom serializer.
    # Floats from netCDF4 datasets are often 32-bit.
    data = trunc(data_array).astype(float)

    attribs = { 
        'units': data_array.attrs['units'],
        'long_name': data_array.attrs['long_name'],
        'short_name': data_array.attrs['short_name']
     }

    # Convert coord variables to list so that each value is auto-converted to a python float
    points = (Point(t) for t in zip(data_array[lat_key].data.tolist(), data_array[lon_key].data.tolist()))
    features = [Feature(
        geometry=pt,
        properties={**attribs, **{'data': data[i, i].item()}}) # Call .item() cuz the scalar values are wrapped in some kind of array
        for i, pt in enumerate(points)
    ]
    return FeatureCollection(features)
