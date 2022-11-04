import enum

from pydantic import BaseModel


class PlatformSchema(BaseModel):
    id: int
    type: enum.Enum
    unique_id: str

    class Config:
        orm_mode = True


class PlatformMetadataSchema(BaseModel):
    platform_id: int
    key: str
    value: str

    class Config:
        orm_mode = True
