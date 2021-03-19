import numpy as np
import xarray as xr
from data.utils import trunc

from geojson import Feature, FeatureCollection, Point


class WrongNumberOfDimensionsError(ValueError):
    pass


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

    dictionary = data_array.to_dict()
    data = trunc(np.array(dictionary['data']).squeeze())
    attributes = dictionary['attrs']

    if len(data.shape) != 2:
        raise WrongNumberOfDimensionsError(
            f"Data is not a 2D field: {data.shape}")

    points = [Point(t) for t in list(zip(
        dictionary['coords'][lat_key]['data'],
        dictionary['coords'][lon_key]['data']
    ))]

    num_lats = len(list(dictionary['coords'][lat_key]['data']))
    features = [Feature(
        geometry=points[i],
        properties={**attributes, **{'data': data[i, i]}}
    ) for i in range(num_lats)]

    return FeatureCollection(features)
