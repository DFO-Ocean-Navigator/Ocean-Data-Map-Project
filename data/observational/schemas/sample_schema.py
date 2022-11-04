from pydantic import BaseModel


class SampleSchema(BaseModel):
    id: int
    datatype_key: str
    value: float
    depth: float
    station_id: int

    class Config:
        orm_mode = True
