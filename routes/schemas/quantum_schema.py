from marshmallow import Schema, fields

class QuantumSchema(Schema):
    """
    Defines the schema for the `/api/v1.0/quantum?...`
    endpoint.

    * dataset: dataset key (e.g. giops_day)
    """

    dataset = fields.Str(required=True)
