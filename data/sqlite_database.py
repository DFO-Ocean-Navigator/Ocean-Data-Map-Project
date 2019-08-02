#!/usr/bin/env python

import itertools
import sqlite3


class SQLiteDatabase:
    """
    Wrapper around sqlite database access. Handles connections,
    errors, and provides convenience functions to query often-used
    fields in our databases. Also handles resource cleanup.
    Note: databases are opened in READ-ONLY mode to prevent
    accidental writes. If you *really* need writes, this is not the
    class you're looking for. The URL parameter is treated as a URI.
    """

    def __init__(self, url: str):
        self.url = url  # URL to sqlite database
        # URI for opening in read-only mode
        self.uri = 'file:{}?mode=ro'.format(url)
        self.conn = None  # sqlite connection handle
        self.c = None

    def __enter__(self):
        self.conn = sqlite3.connect(self.uri, uri=True)
        self.c = self.conn.cursor()

        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.conn.close()

    def __flatten_list(self, some_list: list):
        return list(itertools.chain(*some_list))

    def get_netcdf_files(self, **kwargs):
        """Retrieves the netCDF files that are mapped to the given timestamp(s) and/or (variable(s)).

        Arguments:
            * timestamp {list} -- List of raw netCDF time indices (e.g. 2195510400)

        Optional Arguments:
            * variable: If the dataset is determined to have a split variable layout (from DatasetConfig), 
                    this value should be provided to further narrow down the relevant file list.

        Returns:
            [list] -- List of netCDF file paths corresponding to given timestamp(s) (or variable(s))
        """

        file_list = []

        query = ""
        if 'variable' in kwargs:
            query = "SELECT filepath FROM Timestamps INNER JOIN Filepaths ON Filepaths.filepath_id = Timestamps.filepath_id INNER JOIN Variables ON Variables.variable_id = Timestamps.variable_id WHERE timestamp=? AND variable=?"

            for ts in kwargs['timestamp']:
                for variable in kwargs['variable']:
                    self.c.execute(query, (ts, variable, ))
                    file_list.append(self.__flatten_list(self.c.fetchall()))
        else:
            query = "SELECT filepath FROM Timestamps INNER JOIN Filepaths ON Filepaths.filepath_id = Timestamps.filepath_id WHERE timestamp=?"

            for ts in kwargs['timestamp']:
                self.c.execute(query, (ts, ))
                file_list.append(self.__flatten_list(self.c.fetchall()))

        return self.__flatten_list(file_list)

    def get_all_timestamps(self, **kwargs):
        """Retrieves all timestamps from the open database sorted in ascending order.

        Optional **kwargs:
        * variable: If the dataset is determined to have a split quantum (from DatasetConfig), this value should be
            a string corresponding to the variable of interest, since the underlying SQL query is different in 
            this case.

        Returns:
            [list] -- List of all raw netCDF timestamps for this database. Your problem to convert them to ISO.
        """

        if 'variable' in kwargs:
            self.c.execute(
                "SELECT timestamp FROM Timestamps INNER JOIN Variables ON Variables.variable_id = Timestamps.variable_id WHERE variable=? ORDER BY timestamp ASC", (kwargs["variable"], ))
        else:
            self.c.execute(
                "SELECT timestamp FROM Timestamps ORDER BY timestamp ASC")

        return self.__flatten_list(self.c.fetchall())

    def get_all_variables(self):
        """Retrieves all variables from the open database.

        Returns:
            [list] -- list of all variable names for this database.
        """

        self.c.execute("SELECT variable FROM Variables")

        return self.__flatten_list(self.c.fetchall())
