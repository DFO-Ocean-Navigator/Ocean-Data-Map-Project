from data.observational import db

class DataType(db.Model):
    __tablename__ = 'datatypes'

    key = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(256))
    unit = db.Column(db.String(256))

    def __repr__(self):
        return (
            f'DataType(key="{self.key}", name="{self.name}", '
            f'unit="{self.unit}")'
        )
