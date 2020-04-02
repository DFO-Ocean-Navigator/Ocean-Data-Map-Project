from types import MappingProxyType
from typing import Dict, List
import enum

from data.observational import db

class Platform(db.Model):
    __tablename__ = 'platforms'

    id = db.Column(db.Integer, primary_key=True)
    class Type(enum.Enum):
        drifter = 0
        argo = 1
        glider = 2
        mission = 3
        animal = 4

    type = db.Column(db.Enum(Type), nullable=False)
    unique_id = db.Column(db.String(128), unique=True)
    _meta = db.relationship("PlatformMetadata", back_populates='platform', cascade="all, delete-orphan")
    stations = db.relationship("Station", back_populates='platform', cascade="all, delete-orphan")

    def get_meta(self) -> Dict[str, str]:
        return MappingProxyType({pm.key: pm.value for pm in self._meta})

    def set_meta(self, meta: Dict[str, str]):
        self._meta = [PlatformMetadata(key=k, value=v) for k, v in meta.items()]

    attrs = property(get_meta, set_meta)

    def __repr__(self):
        return f"Platform(id={self.id})"


class PlatformMetadata(db.Model):
    __tablename__ = 'platform_metadata'

    platform_id = db.Column(db.Integer, db.ForeignKey('platforms.id'), primary_key=True)
    key = db.Column(db.String(64), primary_key=True)
    value = db.Column(db.String(256))

    platform = db.relationship("Platform", back_populates='_meta',
                               cascade="all, delete-orphan", single_parent=True)

    def __repr__(self):
        return (
            'PlatformMetadata('
            f'key="{self.key}", value="{self.value}", '
            f'platform_id={self.platform_id}'
            ')'
        )
