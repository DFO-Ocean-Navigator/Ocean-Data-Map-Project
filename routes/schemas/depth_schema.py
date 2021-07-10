from marshmallow import Schema, fields

class DepthSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/depth?...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    * variable: variable key (e.g. votemper)
    """

    dataset = fields.Str(required=True)
    variable = fields.Str(required=True)
    all = fields.Str(required=False)
