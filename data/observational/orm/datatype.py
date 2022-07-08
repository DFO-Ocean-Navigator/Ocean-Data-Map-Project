from sqlalchemy import Column, String

from data.observational import Base


class DataType(Base):
    __tablename__ = "datatypes"

    key = Column(String(64), primary_key=True)
    name = Column(String(256))
    unit = Column(String(256))

    def __repr__(self):
        return f'DataType(key="{self.key}", name="{self.name}", ' f'unit="{self.unit}")'
