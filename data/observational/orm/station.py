from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.schema import ForeignKey, Index

from data.observational import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True)
    name = Column(String(256), nullable=True)
    platform_id = Column(
        Integer, ForeignKey("platforms.id"), nullable=False, index=True
    )
    platform = relationship(
        "Platform",
        back_populates="stations",
        cascade="all, delete-orphan",
        single_parent=True,
    )
    samples = relationship(
        "Sample", back_populates="station", cascade="all, delete-orphan"
    )
    time = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    def __init__(self, **kwargs):
        super(Station, self).__init__(**kwargs)
        if self.latitude > 90 or self.latitude < -90:
            raise ValueError(f"Latitude {self.latitude} out of range (-90,90)")

        if self.longitude > 540 or self.longitude < -540:
            raise ValueError(f"Longitude {self.longitude} out of range (-540,540)")

    def __repr__(self):
        return (
            f"Station(id={self.id}, name={self.name}, time={self.time}, "
            f"latitude={self.latitude}, longitude={self.longitude}, "
            f"platform_id={self.platform_id})"
        )


Index("idx_t_lat_lon", Station.time, Station.latitude, Station.longitude)
