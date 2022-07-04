from sqlalchemy import Column, Float, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.schema import ForeignKey, Index

from data.observational import Base


class Sample(Base):
    __tablename__ = "samples"
    id = Column(Integer, primary_key=True, autoincrement=True)
    datatype_key = Column(String(64), ForeignKey("datatypes.key"))
    value = Column(Float)
    depth = Column(Float)
    station_id = Column(Integer, ForeignKey("stations.id"))

    station = relationship(
        "Station",
        back_populates="samples",
        cascade="all, delete-orphan",
        single_parent=True,
    )
    datatype = relationship("DataType")

    def __repr__(self):
        return (
            f"Sample("
            f'depth={self.depth}, datatype="{self.datatype}", '
            f"value={self.value})"
        )


Index("idx_dt_st", Sample.datatype_key, Sample.station_id)
