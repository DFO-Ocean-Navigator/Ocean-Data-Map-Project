from datetime import datetime

from pydantic import BaseModel


class StationSchema(BaseModel):
    id: int
    name: str
    platform_id: int
    time: datetime
    latitude: float
    longitude: float

    class Config:
        from_attributes = True
