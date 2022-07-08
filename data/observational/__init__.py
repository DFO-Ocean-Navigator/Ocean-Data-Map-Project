from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from oceannavigator.settings import get_settings

settings = get_settings()

SQLALCHEMY_DATABASE_URL = settings.sqlalchemy_database_uri

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

from .orm.datatype import DataType
from .orm.platform import Platform, PlatformMetadata
from .orm.sample import Sample
from .orm.station import Station
from .schemas.datatype_schema import DataTypeSchema
from .schemas.platform_schema import PlatformMetadataSchema, PlatformSchema
from .schemas.sample_schema import SampleSchema
from .schemas.station_schema import StationSchema
