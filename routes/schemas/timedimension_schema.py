from marshmallow import Schema, fields


class TimedimensionSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/timedimension/?dataset=...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    """

    dataset = fields.Str(required=True)
    
