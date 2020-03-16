from data.observational import db

class Station(db.Model):
    __tablename__ = 'stations'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=True)
    platform_id = db.Column(db.Integer, db.ForeignKey('platforms.id'),
                            nullable=False, index=True)
    platform = db.relationship("Platform", back_populates='stations',
                               cascade="all, delete-orphan", single_parent=True)
    samples = db.relationship("Sample", back_populates='station', cascade="all, delete-orphan")
    time = db.Column(db.DateTime, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)

    def __init__(self, **kwargs):
        super(Station, self).__init__(**kwargs)
        if self.latitude > 90 or self.latitude < -90:
            raise ValueError(f"Latitude {self.latitude} out of range (-90,90)")

        if self.longitude > 180 or self.longitude < -180:
            raise ValueError(f"Longitude {self.longitude} out of range (-180,180)")


    def __repr__(self):
        return (
            f'Station(id={self.id}, name={self.name}, time={self.time}, '
            f'latitude={self.latitude}, longitude={self.longitude}, '
            f'platform_id={self.platform_id})'
        )

db.Index('idx_t_lat_lon', Station.time, Station.latitude, Station.longitude)
