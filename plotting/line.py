import geopy
from flask_babel import gettext

from plotting.plotter import Plotter


class LinePlotter(Plotter):

    def parse_query(self, query):
        super(LinePlotter, self).parse_query(query)

        points = query.get('path')
        if points is None or len(points) == 0:
            points = [
                '47 N 52.8317 W',
                '47 N 42 W'
            ]

        self.points = points

        surface = query.get('surfacevariable')
        if surface is not None and (surface == '' or surface == 'none'):
            surface = None

        self.surface = surface

        name = query.get('name')
        if name is None or name == '':
            p0 = geopy.Point(points[0])
            p1 = geopy.Point(points[-1])
            name = gettext("(%0.4f N, %0.4f W) to (%0.4f N, %0.4f W)") % (
                p0.latitude, p0.longitude,
                p1.latitude, p1.longitude,
            )

        self.name = name
