from pydantic import BaseModel


class DataType(BaseModel):
    key: str
    name: str
    unit: str

    class Config:
        orm_mode = True
