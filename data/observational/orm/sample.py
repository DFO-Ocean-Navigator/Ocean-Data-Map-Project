from data.observational import db

class Sample(db.Model):
    __tablename__ = 'samples'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    datatype_key = db.Column(db.String(64), db.ForeignKey('datatypes.key'))
    value = db.Column(db.Float)
    depth = db.Column(db.Float)
    station_id = db.Column(db.Integer, db.ForeignKey('stations.id'))

    station = db.relationship("Station", back_populates='samples',
                              cascade="all, delete-orphan", single_parent=True)
    datatype = db.relationship("DataType")

    def __repr__(self):
        return (
            f'Sample('
            f'depth={self.depth}, datatype="{self.datatype}", '
            f'value={self.value})'
        )

db.Index('idx_dt_st', Sample.datatype_key, Sample.station_id)
