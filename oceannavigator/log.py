###############################################################################
# Utility routines for logging
#
# Author: Clyde Clements
# Created: 2017-08-04 09:42:05 -0230
###############################################################################

import logging
import logging.handlers

import numpy as np
import pandas as pd
import xarray as xr

# Global variables.
__all__ = ['log_level', 'initialize_logging', 'shutdown_logging']

# Format of messages to send to the console.
console_fmt = logging.Formatter('%(message)s')
# Format of messages to send to a log file.
file_fmt = logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s', '%Y-%m-%d %H:%M:%S'
)

first_import = True
logging_initialized = False

# Our logger.
logger = logging.getLogger('drifter')
logger.propagate = False


# Logging information can be sent to two places: a log file and the console
# (more specifically sys.stderr). The log file records all information; that
# is, from the DEBUG level and up. By default, the console records information
# at level INFO and higher, though this can be changed by a command-line
# option.

log_level = dict(
    debug=logging.DEBUG,
    info=logging.INFO,
    warning=logging.WARNING,
    error=logging.ERROR,
    critical=logging.CRITICAL
)

default_log_level = logging.ERROR

# We need to be able to start logging as soon as possible, even before
# command-line arguments are parsed. But we won't know what level of logging to
# send to the console nor what log file to use until after those arguments have
# been parsed. Therefore, we initially set up a memory handler to buffer all
# log messages. Once the user-specified settings have been checked, we flush
# the in-memory log messages to the log file and the console.
#
# Note that a memory handler requires a specified capacity, flush log level,
# and target handler. The log messages will be flushed to the target handler if
# either the capacity is exceeded or when an event of at least the flush level
# severity is seen.
if first_import:
    # We assume that we are the first ones to call the logging module.
    console_hdlr = logging.StreamHandler()
    console_hdlr.setFormatter(console_fmt)
    console_hdlr.setLevel(logging.DEBUG)
    # Maximum number of log messages bufferred in memory before it is flushed
    # to the console handler.
    mem_hdlr_capacity = 5000
    mem_hdlr = logging.handlers.MemoryHandler(mem_hdlr_capacity,
                                              logging.ERROR, console_hdlr)
    mem_hdlr.setLevel(logging.DEBUG)
    logger.addHandler(mem_hdlr)
    logger.setLevel(logging.DEBUG)
    first_import = False


def initialize_logging(filename=None, level=default_log_level):
    """Initialize logging.

    If ``filename`` is specified, send log messages to that file; otherwise,
    send them to the default log file.
    """
    global mem_hdlr, console_hdlr, file_fmt, logger
    global logging_initialized

    if logging_initialized:
        return

    # Set up logging to the console. The handler for this has already been
    # created; we only need to adjust the log level.
    console_hdlr.setLevel(level)
    logger.addHandler(console_hdlr)
    if filename:
        # Set up logging to a log file.
        logfile_hdlr = logging.FileHandler(filename, 'w')
        logfile_hdlr.setFormatter(file_fmt)
        logfile_hdlr.setLevel(logging.DEBUG)
        logger.addHandler(logfile_hdlr)

    if mem_hdlr is not None:
        # Closing the memory handler will cause its contents to be flushed.
        # We set its target to the root logger, which will then call all of its
        # associated handlers.
        mem_hdlr.setTarget(logging.getLogger())
        logger.removeHandler(mem_hdlr)
        mem_hdlr.close()
        mem_hdlr = None

    logging_initialized = True


def shutdown_logging():
    global mem_hdlr
    if mem_hdlr is not None:
        # This indicates the initialization process has not been performed; do
        # it now.
        initialize_logging()
    logging.shutdown()


def load_mesh(
        filename  # type: str
):  # type: (...) -> xarray.Dataset
    logger.info('Loading mesh from file %s ...', filename)
    with xr.open_dataset(filename, cache=False, decode_times=False) as ds:
        ds.load()
        return ds


def load_ariane_trajectories(
        filename  # type: str
):  # type: (...) -> xarray.Dataset
    logger.info('Loading Ariane trajectories from file %s ...', filename)
    with xr.open_dataset(filename) as ds:
        ds.load()
        return ds


def date_filter(
        ds,                      # type: xarray.Dataset
        date_coord='data_date',  # type: str
        start_date=None,         # type: datetime.datetime
        end_date=None            # type: datetime.datetime
):  # type(...) -> xarray.Dataset
    if start_date is None and end_date is None:
        return ds

    # Convert data dates to datetime type.
    data_date = pd.to_datetime(ds[date_coord].values)

    # Determine indices within start-time and end-time range.
    if start_date:
        start_idx = np.where(data_date >= start_date)[0].min()
    else:
        start_idx = 0
    if end_date:
        end_idx = np.where(data_date <= end_date)[0].max()
    else:
        end_idx = len(ds[date_coord])

    # Extract data with indices determined above.
    ds = ds.isel(data_date=slice(start_idx, end_idx + 1))
    return ds


def load_drifter_track(filename, transform_func=None, **kwargs):
    logger.info('Loading drifter data from file %s ...', filename)

    with xr.open_dataset(filename) as ds:
        if transform_func is not None:
            ds = transform_func(ds, **kwargs)
        ds.load()
        return ds
