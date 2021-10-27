import numpy as np
from flask_babel import gettext

from data import open_dataset
from data.sqlite_database import SQLiteDatabase
from plotting.point import PointPlotter
from utils.errors import ClientError
from oceannavigator.dataset_config import DatasetConfig


class ProfilePlotter(PointPlotter):

    def __init__(self, dataset_name: str, query: str, **kwargs):
        self.plottype: str = "profile"
        super(ProfilePlotter, self).__init__(dataset_name, query, **kwargs)

    def load_data(self):

        with open_dataset(self.dataset_config, variable=self.variables, timestamp=self.starttime, endtime=self.endtime) as ds: 

            try:
                self.load_misc(ds, self.variables)
            except IndexError as e:
                raise ClientError(gettext("The selected variable(s) were not found in the dataset. \
                Most likely, this variable is a derived product from existing dataset variables. \
                Please select another variable. ") + str(e))

            point_data, point_depths = self.get_data(
                ds, self.variables, self.time)

            print(point_data)

            self.iso_timestamp = ds.nc_data.timestamp_to_iso_8601(self.time)

        self.data = self.subtract_other(point_data)
        self.depths = point_depths

    def odv_ascii(self):
        float_to_str = np.vectorize(lambda x: "%0.1f" % x)
        data = float_to_str(self.data)

        station = np.repeat(self.names, len(self.depths))
        points = np.array(self.points)
        latitude = np.repeat(points[:, 0], len(self.depths))
        longitude = np.repeat(points[:, 1], len(self.depths))
        time = np.repeat(self.iso_timestamp, data.shape[0])
        depth = self.depths[:, 0, :]

        return super(ProfilePlotter, self).odv_ascii(
            self.dataset_name,
            self.variable_names,
            self.variable_units,
            station,
            latitude,
            longitude,
            depth,
            time,
            data
        )

    def csv(self):
        header = [
            ['Dataset', self.dataset_name],
        ]

        columns = [
            "Time",
            "Latitude",
            "Longitude",
            "Depth",
        ] + ["%s (%s)" % x for x in zip(self.variable_names, self.variable_units)]
        data = []

        timestamp = self.iso_timestamp
        if not isinstance(timestamp, list):
            timestamp = [timestamp]
        
         # for each timestamp
        for t in range(len(timestamp)):
            # For each point
            for p in range(0, self.data.shape[1]):
                # For each depth
                for d in range(0, self.data.shape[3]):
                    print(self.depths[t, p, 0, d])
                    if self.data[t, p, :, d].mask.all():
                        print('masked')
                        continue
                    entry = [
                        timestamp[t].isoformat(),
                        "%0.4f" % self.points[p][0],
                        "%0.4f" % self.points[p][1],
                        "%0.1f" % self.depths[t, p, 0, d],
                    ] + ["%0.1f" % x for x in self.data[t, p, :, d]]
                    data.append(entry)

        return super(ProfilePlotter, self).csv(header, columns, data)

    def plot(self):
        data = np.ma.compressed(self.data).tolist()

        return (data, self.mime, self.filename)