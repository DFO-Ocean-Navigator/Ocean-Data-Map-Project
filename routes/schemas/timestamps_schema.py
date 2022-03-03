from marshmallow import EXCLUDE, Schema, fields


class TimestampsSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/timestamps?...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    * variable: variable key (e.g. votemper)
    """

    class Meta:
        unknown = EXCLUDE  # workaround for hidden "_" field being sent by jQuery

    dataset = fields.Str(required=True)
    variable = fields.Str(required=True)
