from marshmallow import Schema, fields
from marshmallow.validate import OneOf

class GenerateScriptSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/generatescript?...`
    endpoint.

    * query: URI encoded string for the API script
    * lang: target language (python or r)
    * scriptType: type of requested script (PLOT or CSV)
    """

    query = fields.Str(required=True)
    lang = fields.Str(required=True, validate=OneOf({"python", "r"}))
    scriptType = fields.Str(required=True, validate=OneOf({"PLOT", "CSV"}))
