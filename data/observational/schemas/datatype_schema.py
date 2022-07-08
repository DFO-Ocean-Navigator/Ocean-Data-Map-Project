from pydantic import BaseModel


class DataTypeSchema(BaseModel):
    key: str
    name: str
    unit: str

    class Config:
        orm_mode = True
