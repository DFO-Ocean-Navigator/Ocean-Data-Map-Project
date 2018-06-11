import numpy as np
import geopy
from geopy.distance import vincenty, VincentyDistance
import datetime

def bearing(lat0, lon0, lat1, lon1):
    lat0_rad = np.radians(lat0)
    lat1_rad = np.radians(lat1)
    diff_rad = np.radians(lon1 - lon0)
    x = np.cos(lat1_rad) * np.sin(diff_rad)
    y = np.cos(lat0_rad) * np.sin(lat1_rad) - np.sin(
        lat0_rad) * np.cos(lat1_rad) * np.cos(diff_rad)
    b = np.arctan2(x, y)
    return np.degrees(b)


def path_to_points(points, n=100, times=None):
    if times is None:
        times = [0] * len(points)

    if len(times) != len(points):
        if isinstance(times[0], datetime.datetime):
            times = times[0] + np.array([datetime.timedelta(0, d) for d in np.linspace(
                    0, (times[-1] - times[0]).total_seconds(), num=len(points))])
        else:
            times = np.linspace(times[0], times[-1], num=len(points))

    tuples = list(zip(points, points[1:], times, times[1:]))

    distance_between = []
    for pair in tuples:
        distance_between.append(vincenty(pair[0], pair[1]).km)

    total_distance = np.sum(distance_between)
    distance = []
    latitude = []
    longitude = []
    bearings = []
    output_time = []

    for index, pair in enumerate(tuples):
        n_pts = int(np.ceil(n * (distance_between[index] /
                                 total_distance)))
        n_pts = np.clip(n_pts, 2, n)
        p = list(map(geopy.Point, pair[0:2]))

        p_dist, p_lat, p_lon, b = points_between(p[0], p[1], n_pts)
        if len(distance) > 0:
            distance.extend(np.add(p_dist, distance[-1]))
        else:
            distance.extend(p_dist)

        latitude.extend(p_lat)
        longitude.extend(p_lon)
        bearings.extend([b] * len(p_dist))
        output_time.extend([
            pair[2] + i * (pair[3] - pair[2]) / (n_pts - 1)
            for i in range(0, n_pts)
        ])
    return distance, output_time, latitude, longitude, bearings


def points_between(start, end, numpoints, constantvalue=False):
    distance = []
    latitude = []
    longitude = []

    lat0 = start.latitude
    lon0 = start.longitude
    lat1 = end.latitude
    lon1 = end.longitude

    if constantvalue and np.isclose(lat0, lat1):
        latitude = np.ones(numpoints) * lat0
        longitude = np.linspace(lon0, lon1, num=numpoints)
        for lon in longitude:
            distance.append(vincenty(start, geopy.Point(lat0, lon)).km)
        if lon1 > lon0:
            b = 90
        else:
            b = -90
    elif constantvalue and np.isclose(lon0, lon1):
        latitude = np.linspace(lat0, lat1, num=numpoints)
        longitude = np.ones(numpoints) * lon0
        for lat in latitude:
            distance.append(vincenty(start, geopy.Point(lat, lon0)).km)
        if lat1 > lat0:
            b = 0
        else:
            b = 180
    else:
        total_distance = vincenty(start, end).km
        distance = np.linspace(0, total_distance, num=numpoints)
        b = bearing(lat0, lon0, lat1, lon1)

        for d in distance:
            p = VincentyDistance().destination(start, b, d)
            latitude.append(p.latitude)
            longitude.append(p.longitude)

    return list(map(np.array, [distance, latitude, longitude, b]))
