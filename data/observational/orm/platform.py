import enum
from types import MappingProxyType
from typing import Dict

from sqlalchemy import Column, Enum, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.schema import ForeignKey

from data.observational import Base


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(Integer, primary_key=True)

    class Type(enum.Enum):
        drifter = 0
        argo = 1
        glider = 2
        mission = 3
        animal = 4

    type = Column(Enum(Type), nullable=False)
    unique_id = Column(String(128), unique=True)
    _meta = relationship(
        "PlatformMetadata", back_populates="platform", cascade="all, delete-orphan"
    )
    stations = relationship(
        "Station", back_populates="platform", cascade="all, delete-orphan"
    )

    def get_meta(self) -> Dict[str, str]:
        return MappingProxyType({pm.key: pm.value for pm in self._meta})

    def set_meta(self, meta: Dict[str, str]):
        self._meta = [PlatformMetadata(key=k, value=v) for k, v in meta.items()]

    attrs = property(get_meta, set_meta)

    def __repr__(self):
        return f"Platform(id={self.id})"


class PlatformMetadata(Base):
    __tablename__ = "platform_metadata"

    platform_id = Column(Integer, ForeignKey("platforms.id"), primary_key=True)
    key = Column(String(64), primary_key=True)
    value = Column(String(256))

    platform = relationship(
        "Platform",
        back_populates="_meta",
        cascade="all, delete-orphan",
        single_parent=True,
    )

    def __repr__(self):
        return (
            "PlatformMetadata("
            f'key="{self.key}", value="{self.value}", '
            f"platform_id={self.platform_id}"
            ")"
        )
