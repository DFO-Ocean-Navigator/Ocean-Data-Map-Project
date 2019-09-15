#!/usr/bin/env python

import itertools
import re
import sqlite3
from typing import List

from data.variable import Variable
from data.variable_list import VariableList


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

    def __flatten_list(self, some_list: list) -> list:
        return list(itertools.chain(*some_list))

    def get_netcdf_files(self, timestamp: list, variable: list) -> List[str]:
        """Retrieves the netCDF files that are mapped to the given timestamp(s) and variable.

        Arguments:
            * timestamp {list} -- List of raw netCDF time indices (e.g. 2195510400)
            * variable {list} -- List of the variables of interest (e.g. votemper)

        Returns:
            * [list] -- List of netCDF file paths corresponding to given timestamp(s) and variable.
        """

        file_list = []

        query = """
        SELECT
            filepath
        FROM
            TimestampVariableFilepath tvf
            JOIN Filepaths fp ON tvf.filepath_id = fp.id
            JOIN Variables v ON tvf.variable_id = v.id
            JOIN Timestamps t ON tvf.timestamp_id = t.id
        WHERE
            variable = ?
            AND timestamp = ?;
        """

        for ts in timestamp:
            for v in variable:
                self.c.execute(query, (v, ts))
                file_list.append(self.__flatten_list(self.c.fetchall()))

        # funky way to remove duplicates from the list: https://stackoverflow.com/a/7961390/2231969
        return list(set(self.__flatten_list(file_list)))

    def get_variable_dims(self, variable: str) -> List[str]:
        """Retrieves the given variables dimensions.

        Arguments:
            * variable: Key of the variable of interest (e.g. votemper)

        Returns:
            * [list] -- List of dimension names for the given variable.
            * None if variable argument is empty.
        """

        if not variable:
            return None

        self.c.execute(
            """
            SELECT
                name
            FROM
                VarsDims vd
                JOIN Variables v ON vd.variable_id = v.id
                JOIN Dimensions d ON vd.dim_id = d.id
            WHERE
                variable = ?;
            """, (variable, )
        )

        return self.__flatten_list(self.c.fetchall())

    def get_variable_units(self, variable: str) -> List[str]:
        """Retrieves the units for a given variable name.

        Arguments:
            * variable: Key of the variable of interest (e.g. votemper)

        Returns:
            * str -- String containing the variable units. Empty string is
            returned if variable has no units.
            * None if variable argument is empty.

        """

        if not variable:
            return None

        self.c.execute(
            """
            SELECT
                units
            FROM
                Variables
            WHERE
                variable = ?;

            """, (variable, )
        )

        result = self.__flatten_list(self.c.fetchall())

        return result[0] if result else ""

    def get_timestamps(self, variable: str) -> List[str]:
        """Retrieves all timestamps for a given variable from the open database sorted in ascending order.

        Arguments:
            * variable: Key of the variable of interest (e.g. votemper)

        Returns:
            * [list] -- List of all raw netCDF timestamps for this database. Your problem to convert them to Datetime objects.
            * None if variable string is empty
        """

        if not variable:
            return None

        self.c.execute(
            """
            SELECT
                timestamp
            FROM
                TimestampVariableFilepath tvf
                JOIN Timestamps ts ON tvf.timestamp_id = ts.id
                JOIN Variables v ON tvf.variable_id = v.id
            WHERE
                variable = ?
            ORDER BY
                timestamp ASC;

            """, (variable, )
        )

        return self.__flatten_list(self.c.fetchall())

    def get_latest_timestamp(self, variable: str) -> int:
        """Returns the latest raw timestamp value for a given variable.

        Arguments:
            variable {str} -- Key of the variable of interest (e.g. votemper)

        Returns:
            int -- Most recent timestamp value.
        """

        if not variable:
            return None

        self.c.execute(
            """
            SELECT
                MAX(timestamp)
            FROM
                TimestampVariableFilepath tvf
                JOIN Variables v ON tvf.variable_id = v.id
                JOIN Timestamps t ON tvf.timestamp_id = t.id
            WHERE
                variable = ?;
            """, (variable, )
        )

        return self.__flatten_list(self.c.fetchall())[0]

    def get_earliest_timestamp(self, variable: str) -> int:
        """Returns the earliest raw timestamp value for a given variable.

        Arguments:
            variable {str} -- Key of the variable of interest (e.g. votemper)

        Returns:
            int -- Earliest timestamp value.
        """

        if not variable:
            return None

        self.c.execute(
            """
            SELECT
                MIN(timestamp)
            FROM
                TimestampVariableFilepath tvf
                JOIN Variables v ON tvf.variable_id = v.id
                JOIN Timestamps t ON tvf.timestamp_id = t.id
            WHERE
                variable = ?;
            """, (variable, )
        )

        return self.__flatten_list(self.c.fetchall())[0]

    def get_timestamp_range(self, starttime: int, endtime: int, variable: str) -> List[int]:
        """Retrieves all raw timestamps in the interval [starttime, endtime] for a variable.

        Arguments:
            starttime {int} -- Starting timestamp
            endtime {int} -- Ending timestamp
            variable {str} -- Variable of intereste (e.g. votemper)

        Returns:
            [list] -- List of all timestamps in the given interval.
        """

        self.c.execute(
            """
            SELECT DISTINCT
                timestamp
            FROM
                TimestampVariableFilepath tvf
                JOIN Variables v ON tvf.variable_id = v.id
                JOIN Timestamps t ON tvf.timestamp_id = t.id
            WHERE
                variable = ?
                AND timestamp BETWEEN ?
                and ?;

            """, (variable[0] if isinstance(variable, list) else variable, starttime, endtime, )
        )

        return self.__flatten_list(self.c.fetchall())

    def get_all_variables(self) -> VariableList:
        """Retrieves all variables from the open database (including depth, time, etc.)

        Returns:
            [list] -- List of all variable names for this database.
        """

        self.c.execute(
            "SELECT variable, units, longName, validMin, validMax FROM Variables")

        result = self.c.fetchall()

        l = [self.__build_variable_wrapper(v) for v in result]

        return VariableList(l)

    def get_data_variables(self) -> VariableList:
        """Retrieves all data variables from the open database (i.e. depth, time, etc. are filtered out).

        Returns:
            [VariableList] -- VariableList of all data variable names.
        """

        all_vars = self.get_all_variables()

        regex = re.compile(r'^(.)*(time|depth|lat|lon|polar|^x|^y)+(.)*$')

        result = list(filter(lambda i: not regex.match(i.key), all_vars))

        return VariableList(result)

    def __build_variable_wrapper(self, var_result: list) -> Variable:
        """Builds a Variable object from a given row list.

        Arguments:
            var_result {list} -- A row from the Variable table in the sqlite database.

        Returns:
            [Variable] -- constructed Variable object.
        """

        # Look at the SELECT statement in get_all_variables to see the order of values
        name = var_result[0]
        units = var_result[1] if var_result[1] else None
        long_name = var_result[2] if var_result[2] else name
        valid_min = var_result[3] if var_result[3] != 1.17549e-38 else None
        valid_max = var_result[4] if var_result[4] != 3.40282e+38 else None

        return Variable(name, long_name, units, self.get_variable_dims(name), valid_min, valid_max)
