from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "mysql://nav-read:Z*E92oCqS9J9@10.118.169.18/navigator"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from .orm.datatype import DataType
# from .orm.platform import Platform, PlatformMetadata
# from .orm.sample import Sample
# from .orm.station import Station
