from marshmallow import Schema, fields
from marshmallow.validate import OneOf, Range


class GetDataSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/data?...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    * variable: variable key (e.g. votemper)
    * time: time index (e.g. 0)
    * depth: depth index (e.g. 49)
    * geometry_type: the "shape" of the data being requested
    """

    dataset = fields.Str(required=True)
    variable = fields.Str(required=True)
    time = fields.Integer(required=True)
    depth = fields.Integer(required=True, validate=Range(min=0))
    geometry_type = fields.Str(
        required=True, validate=OneOf({"point", "line", "area"}))
