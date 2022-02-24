import flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(uri, echo=False):
    if flask.has_request_context():
        raise RuntimeError("Do not call this from inside the Flask application")

    app = flask.Flask("CMDLINE")
    app.config["SQLALCHEMY_DATABASE_URI"] = uri
    app.config["SQLALCHEMY_ECHO"] = echo
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.app_context().push()
    db.init_app(app)

def create_tables():
    db.create_all()


from .orm.datatype import DataType
from .orm.platform import Platform, PlatformMetadata
from .orm.sample import Sample
from .orm.station import Station
