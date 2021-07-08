from marshmallow import Schema, fields

class TimestampsSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/timestamps?...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    * variable: variable key (e.g. votemper)
    """

    dataset = fields.Str(required=True)
    variable = fields.Str(required=True)
