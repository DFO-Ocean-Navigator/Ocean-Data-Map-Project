import datetime
import math
from enum import Enum
from typing import Callable, Dict, List, Optional, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session, joinedload

from . import DataType, Platform, PlatformMetadata, Sample, Station, engine

EARTH_RADIUS = 6371.01


def __db_funcs() -> Dict[str, Callable]:
    """
    Mapping of dialect-specific database functions
    """
    dialect = engine.dialect.name
    funcs = {}
    if dialect == "sqlite":
        funcs = {
            "year": lambda v: func.strftime("%Y", v),
            "month": lambda v: func.strftime("%Y%m", v),
            "week": lambda v: func.strftime("%Y%W", v),
            "day": lambda v: func.strftime("%Y%j", v),
            "hour": lambda v: func.strftime("%Y%j%H", v),
            "minute": lambda v: func.strftime("%Y%j%H%M", v),
            "avgtime": lambda v: func.datetime(
                func.avg(func.strftime("%s", v)), "unixepoch"
            ),
        }
    elif dialect == "mysql" or dialect == "mariadb":
        funcs = {
            "year": lambda v: func.date_format(v, "%Y"),
            "month": lambda v: func.date_format(v, "%Y%m"),
            "week": lambda v: func.date_format(v, "%Y%U"),
            "day": lambda v: func.date_format(v, "%Y%j"),
            "hour": lambda v: func.date_format(v, "%Y%j%H"),
            "minute": lambda v: func.date_format(v, "%Y%j%H%M"),
            "avgtime": lambda v: func.from_unixtime(func.avg(func.unix_timestamp(v))),
        }
    else:
        raise RuntimeError(f"Dialect {engine.dialect} is unknown")

    return funcs


def get_platforms(
    session: Session,
    minlat: Optional[float] = None,
    maxlat: Optional[float] = None,
    minlon: Optional[float] = None,
    maxlon: Optional[float] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[float] = None,
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
    platform_types: Optional[List[Platform.Type]] = None,
    meta_key: Optional[str] = None,
    meta_value: Optional[str] = None,
) -> List[Platform]:
    """
    Gets a list of Platforms that have at least one station matching the query
    """
    query = session.query(Platform).join(Station)

    query = __add_platform_filters(
        query, platform_types=platform_types, meta_key=meta_key, meta_value=meta_value
    )

    if latitude and longitude and radius:
        minlat, maxlat, minlon, maxlon = __get_bounding_latlon(
            latitude, longitude, radius
        )

    query = __add_station_filters(
        query,
        minlat=minlat,
        maxlat=maxlat,
        minlon=minlon,
        maxlon=maxlon,
        starttime=starttime,
        endtime=endtime,
    )

    if latitude and longitude and radius:
        radDist = radius / EARTH_RADIUS
        radLat = math.radians(latitude)
        radLon = math.radians(longitude)

        if engine.dialect.name == "sqlite":
            rc = engine.raw_connection()

            # SQLite doesn't do trig, so we'll add the functions via Python
            # It won't be as quick as doing the comparison in the database, but
            # SQLite should only be used for testing purposes
            rc.create_function("sin", 1, math.sin)
            rc.create_function("cos", 1, math.cos)
            rc.create_function("radians", 1, math.radians)
            rc.create_function("acos", 1, math.acos)

        query = query.filter(
            func.acos(
                (math.sin(radLat) * func.sin(func.radians(Station.latitude)))
                + (
                    math.cos(radLat)
                    * func.cos(func.radians(Station.latitude))
                    * func.cos(func.radians(Station.longitude) - radLon)
                )
            )
            <= radDist
        )

    return query.distinct().all()


def get_platform_tracks(
    session: Session,
    quantum: str = "hour",
    minlat: Optional[float] = None,
    maxlat: Optional[float] = None,
    minlon: Optional[float] = None,
    maxlon: Optional[float] = None,
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
    platform_types: Optional[List[Platform.Type]] = None,
    meta_key: Optional[str] = None,
    meta_value: Optional[str] = None,
    platforms: Optional[List[Platform]] = None,
) -> List[Tuple[int, Enum, float, float]]:
    """
    Gets a list of platform, platform_type, longitude, latitude tuples, given
    the optional query filters.
    """
    funcs = __db_funcs()
    query = session.query(
        Platform.id,
        Platform.type,
        func.avg(Station.longitude),
        func.avg(Station.latitude),
    ).join(Station)
    if quantum not in ["year", "month", "week", "day", "hour", "minute"]:
        raise ValueError(f"Quantum {quantum} is unknown")

    query = __add_platform_filters(
        query, platform_types=platform_types, meta_key=meta_key, meta_value=meta_value
    )

    if platforms:
        query = query.filter(Platform.id.in_([p.id for p in platforms]))

    query = __add_station_filters(
        query,
        minlat=minlat,
        maxlat=maxlat,
        minlon=minlon,
        maxlon=maxlon,
        starttime=starttime,
        endtime=endtime,
    )

    query = query.group_by(Platform.id, funcs[quantum](Station.time))

    return query.order_by(Platform.id, funcs[quantum](Station.time)).all()


def get_platform_track(
    session: Session,
    platform: Platform,
    quantum: str = "hour",
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
) -> List[Tuple[float, float]]:
    """Gets the track traveled by an individual Platform

    :param session: Database Session object
    :param platform Platform: The Platform
    :param str quantum: The quantum for the data, one of (year, month, week,
    day, hour, minute)
    :param datetime.datetime starttime: The minimum time (optional)
    :param datetime.datetime endtime: The maximum time (optional)
    :return a list of latitude, longitude tuples
    """
    funcs = __db_funcs()
    query = session.query(
        func.avg(Station.longitude),
        func.avg(Station.latitude),
    ).filter_by(platform=platform)

    if quantum not in ["year", "month", "week", "day", "hour", "minute"]:
        raise ValueError(f"Quantum {quantum} is unknown")

    query = query.group_by(funcs[quantum](Station.time))

    if starttime:
        query = query.filter(Station.time >= starttime)

    if endtime:
        query = query.filter(Station.time <= endtime)

    return query.order_by(funcs[quantum](Station.time)).all()


def get_platform_variable_track(
    session: Session,
    platform: Platform,
    variable: str,
    quantum: str = "hour",
    depth_quantum: float = 1.0,
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
) -> List[Tuple[datetime.datetime, float, float, float, float]]:
    funcs = __db_funcs()

    query = (
        session.query(
            funcs["avgtime"](Station.time),
            func.avg(Station.latitude),
            func.avg(Station.longitude),
            func.round(Sample.depth / depth_quantum) * depth_quantum,
            func.avg(Sample.value),
        )
        .filter(Station.platform == platform, Sample.datatype_key == variable)
        .join(Station.samples)
    )

    if quantum not in ["year", "month", "week", "day", "hour", "minute"]:
        raise ValueError(f"Quantum {quantum} is unknown")

    query = query.order_by(Station.time).group_by(
        funcs[quantum](Station.time),
        func.round(Sample.depth / depth_quantum) * depth_quantum,
    )

    if starttime:
        query = query.filter(Station.time >= starttime)

    if endtime:
        query = query.filter(Station.time <= endtime)

    return query.all()


def __add_sample_filters(
    query,
    variable=None,
    mindepth=None,
    maxdepth=None,
):
    if variable:
        query = query.filter(Sample.datatype_key == variable)

    if mindepth:
        query = query.filter(Sample.depth >= mindepth)

    if maxdepth:
        query = query.filter(Sample.depth <= maxdepth)

    return query


def __add_platform_filters(
    query,
    platform_types=None,
    meta_key=None,
    meta_value=None,
):
    if platform_types:
        query = query.filter(Platform.type.in_(platform_types))

    # Joins to PlatformMetadata
    if meta_key is not None:
        query = query.join(PlatformMetadata).filter(
            and_(
                PlatformMetadata.key == meta_key,
                PlatformMetadata.value.ilike(f"%{meta_value}%"),
            )
        )

    return query


def __add_station_filters(
    query,
    minlat=None,
    maxlat=None,
    minlon=None,
    maxlon=None,
    starttime=None,
    endtime=None,
):
    if minlat:
        query = query.filter(Station.latitude >= minlat)

    if maxlat:
        query = query.filter(Station.latitude <= maxlat)

    if minlon:
        query = query.filter(Station.longitude >= minlon)

    if maxlon:
        query = query.filter(Station.longitude <= maxlon)

    if starttime:
        query = query.filter(Station.time >= starttime)

    if endtime:
        query = query.filter(Station.time <= endtime)

    return query


def __build_station_query(
    session=None,
    variable=None,
    mindepth=None,
    maxdepth=None,
    minlat=None,
    maxlat=None,
    minlon=None,
    maxlon=None,
    starttime=None,
    endtime=None,
    platform_types=None,
    meta_key=None,
    meta_value=None,
):
    query = session.query(Station)

    # Use index hint
    query = query.with_hint(Station, "USE INDEX (idx_stations_time)")

    # Joins to Sample
    if variable is not None or mindepth is not None or maxdepth is not None:
        query = __add_sample_filters(
            query.join(Sample), variable=variable, mindepth=mindepth, maxdepth=maxdepth
        )

    if minlat or maxlat or minlon or maxlon or starttime or endtime:
        query = __add_station_filters(
            query,
            minlat=minlat,
            maxlat=maxlat,
            minlon=minlon,
            maxlon=maxlon,
            starttime=starttime,
            endtime=endtime,
        )

    # Joins to Platform
    if platform_types:
        query = __add_platform_filters(
            query.join(Platform),
            platform_types=platform_types,
            meta_key=meta_key,
            meta_value=meta_value,
        )

    return query.distinct()


def get_stations(
    session: Session,
    variable: Optional[str] = None,
    mindepth: Optional[float] = None,
    maxdepth: Optional[float] = None,
    minlat: Optional[float] = None,
    maxlat: Optional[float] = None,
    minlon: Optional[float] = None,
    maxlon: Optional[float] = None,
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
    platform_types: Optional[List[Platform.Type]] = None,
    meta_key: Optional[str] = None,
    meta_value: Optional[str] = None,
) -> List[Station]:
    """
    Queries for stations, given the optional query filters.
    """
    return __build_station_query(
        session=session,
        variable=variable,
        mindepth=mindepth,
        maxdepth=maxdepth,
        minlat=minlat,
        maxlat=maxlat,
        minlon=minlon,
        maxlon=maxlon,
        starttime=starttime,
        endtime=endtime,
        platform_types=platform_types,
        meta_key=meta_key,
        meta_value=meta_value,
    ).all()


def get_station_time_range(session: Session):
    """
    Queries for the fist and last stations time values
    """

    query = session.query(
        func.min(Station.time),
        func.max(Station.time),
    )

    return query.one()


def __get_bounding_latlon(lat, lon, distance):
    # angular distance in radians on a great circle
    radDist = distance / EARTH_RADIUS

    minLat = math.radians(lat) - radDist
    maxLat = math.radians(lat) + radDist

    minLon = 0.0
    maxLon = 0.0
    if minLat > -math.pi / 2.0 and maxLat < math.pi / 2.0:
        deltaLon = math.asin(math.sin(radDist) / math.cos(math.radians(lat)))
        minLon = math.radians(lon) - deltaLon

        if minLon < -math.pi:
            minLon += 2.0 * math.pi

        maxLon = math.radians(lon) + deltaLon
        if maxLon > math.pi:
            maxLon -= 2.0 * math.pi
        else:
            # a pole is within the distance
            minLat = max(minLat, -math.pi / 2.0)
            maxLat = min(maxLat, math.pi / 2.0)
            minLon = -math.pi
            maxLon = math.pi

    return (
        math.degrees(minLat),
        math.degrees(maxLat),
        math.degrees(minLon),
        math.degrees(maxLon),
    )


def get_stations_radius(
    session: Session,
    latitude: float,
    longitude: float,
    radius: float,
    variable: Optional[str] = None,
    mindepth: Optional[float] = None,
    maxdepth: Optional[float] = None,
    starttime: Optional[datetime.datetime] = None,
    endtime: Optional[datetime.datetime] = None,
    platform_types: Optional[List[Platform.Type]] = None,
    meta_key: Optional[str] = None,
    meta_value: Optional[str] = None,
) -> List[Station]:
    """
    Queries for stations within a radius of the latitude, longitude
    """
    minLat, maxLat, minLon, maxLon = __get_bounding_latlon(latitude, longitude, radius)

    query = __build_station_query(
        session=session,
        minlat=minLat,
        maxlat=maxLat,
        minlon=minLon,
        maxlon=maxLon,
        variable=variable,
        mindepth=mindepth,
        maxdepth=maxdepth,
        starttime=starttime,
        endtime=endtime,
        platform_types=platform_types,
        meta_key=meta_key,
        meta_value=meta_value,
    )

    radDist = radius / EARTH_RADIUS
    radLat = math.radians(latitude)
    radLon = math.radians(longitude)

    if engine.dialect.name == "sqlite":
        rc = engine.raw_connection()

        # SQLite doesn't do trig, so we'll add the functions via Python
        # It won't be as quick as doing the comparison in the database, but
        # SQLite should only be used for testing purposes
        rc.create_function("sin", 1, math.sin)
        rc.create_function("cos", 1, math.cos)
        rc.create_function("radians", 1, math.radians)
        rc.create_function("acos", 1, math.acos)

    query = query.filter(
        func.acos(
            (math.sin(radLat) * func.sin(func.radians(Station.latitude)))
            + (
                math.cos(radLat)
                * func.cos(func.radians(Station.latitude))
                * func.cos(func.radians(Station.longitude) - radLon)
            )
        )
        <= radDist
    )

    return query.options(joinedload("platform")).all()


def get_meta_keys(session: Session, platform_types: List[str]) -> List[str]:
    """
    Queries for Platform Metadata keys, given a list of platform types
    """
    data = (
        session.query(PlatformMetadata.key)
        .distinct()
        .join(Platform)
        .filter(Platform.type.in_(platform_types))
        .order_by(PlatformMetadata.key)
        .all()
    )

    data = [item[0] for item in data]
    return data


def get_meta_values(session: Session, platform_types: List[str], key: str) -> List[str]:
    """
    Queries for Platform Metadata values, given a list of platform types and
    the key
    """
    query = (
        session.query(PlatformMetadata.value)
        .distinct()
        .join(Platform)
        .filter(Platform.type.in_(platform_types))
        .order_by(PlatformMetadata.value)
    )

    if key != "Any":
        query = query.filter(PlatformMetadata.key == key)

    data = [item[0] for item in query.all()]
    return data


def get_datatypes(session: Session) -> List[DataType]:
    """
    Queries all DataTypes in the database
    """
    datatypes = session.query(DataType).order_by(DataType.name).all()
    return datatypes
