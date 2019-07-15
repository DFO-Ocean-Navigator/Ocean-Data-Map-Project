import json
from io import BytesIO, StringIO
import re
import base64
import pytz
import hashlib
import routes.routes_impl
from data import open_dataset
from oceannavigator import DatasetConfig

def time_query_conversion(dataset, index):
    """
    API Format: /api/timestamps/?dataset=' '

    dataset : Dataset to extract data - Can be found using /api/datasets

    Finds all data timestamps available for a specific dataset
    """

    
    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        try:
            date = ds.timestamps[index]
            return date.replace(tzinfo=pytz.UTC).isoformat()
        except IndexError:
            return ClientError("Timestamp does not exist")


def generatePython(url):
    