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


def generatePython(url, scriptType):
    if "class4id" in url:
        var = "class4id"
    elif "drifter" in url:
        var = "drifter"
    else:
        var = "variable"
    query = url
    print(query)

    if "true" in query:
        query = query.replace("true", "1")
    if "false" in query:
        query = query.replace("false", "0")
    if "null"  in query:
        query = query.replace("null", "None")

    with open("plotting/python" + scriptType + "template.txt", 'r') as file:
        template = str(file.read())

        if scriptType == "PLOT":
            template = template.format(q = query, var = var)
        else:
            template = template.format(q = query)
        print(template)
        finalScript = BytesIO()
        finalScript.write(bytes(template,'utf-8'))
        finalScript.seek(0)
        return finalScript


def generateR(url, scriptType):
    return None