#!/usr/bin/env python

"""
Generate a list of Class 4 files and save it to a cache file.

Author: Clyde Clements
Created: 2017-10-02

This script generates the list of Class 4 files by crawling the THREDDS URL of
the associated catalog. It is intended to be run from a cron job and its output
cache file used from within the Ocean Navigator code.
"""

import argparse
import datetime
import fcntl
import logging
import os.path
import sys
import time
try:
    import cPickle as pickle
except ImportError:
    import pickle

from ftplib import FTP


logging.basicConfig(format='%(message)s', level=logging.INFO)
log = logging.getLogger()


def list_class4_files(class4_ftp_url):
    ftpSite = FTP(class4_ftp_url)
    ftpSite.login("anonymous","anonymous")
    thisYear = datetime.datetime.now().year
    files = []
    result = []
    for i in range(2011, thisYear + 1):
        fullList = ftpSite.nlst("/class4/" + str(i))
        for filename in fullList:
            if ("_GIOPS_" in filename) and ("profile.nc" in filename):
                files.append(filename[13:-3])
    for names in files:
        value = names
        date = datetime.datetime.strptime(value.split("_")[1], "%Y%m%d")
        result.append({
            'name': date.strftime("%Y-%m-%d"),
            'id': value
        })

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', dest='config_file', required=True,
                        type=argparse.FileType('rb'),
                        help='Name of Ocean Navigator configuration file')
    opts = parser.parse_args()

    config = {}
    log.info('Loading Ocean Navigator configuration from file %s ...',
             opts.config_file.name)
    try:
        exec(compile(opts.config_file.read(), opts.config_file.name, 'exec'),
             config)
    except IOError:
        log.error('Unable to load configuration file %s',
                  opts.config_file.name)
        sys.exit(1)

    if 'CLASS4_FTP' not in config:
        log.error(('FTP server for Class4 files not found in configuration '
                   'file'))
        sys.exit(1)

    if 'CACHE_DIR' not in config:
        log.error(('Cache directory specification not found in configuration '
                   'file'))
        sys.exit(1)

    log.info('Generating list of Class4 files from FTP site %s ...',
             config['CLASS4_FTP'])
    class4_files = list_class4_files(config['CLASS4_FTP'])

    output_file_name = os.path.join(config['CACHE_DIR'], 'class4_files.pickle')
    try:
        output_file = open(output_file_name, 'wb')
    except IOError:
        log.error('Unable to open output file %s', output_file_name)
        sys.exit(1)

    log.info('Obtaining exclusive lock on output file %s ...',
             output_file_name)
    # Make at most "max_tries" attempts to acquire the lock.
    max_tries = 10
    num_tries = 0
    attempt_lock = True
    while attempt_lock:
        try:
            fcntl.lockf(output_file, fcntl.LOCK_EX)
        except IOError:
            num_tries += 1
            if num_tries == max_tries:
                lock_acquired = False
                attempt_lock = False
            else:
                time.sleep(1)
        else:
            lock_acquired = True
            attempt_lock = False

    if not lock_acquired:
        log.error('Unable to acquire lock on output file %s', output_file_name)
        sys.exit(1)

    log.info('Writing list of Class4 files to output file ...')
    try:
        pickle.dump(class4_files, output_file)
    except Exception:
        log.error('Unable to dump to output file %s', output_file_name)
        sys.exit(1)

    log.info('Releasing lock on output file ...')
    try:
        fcntl.lockf(output_file, fcntl.LOCK_UN)
    except IOError:
        log.error('Unable to release lock on output file %s', output_file_name)
        sys.exit(1)
    finally:
        output_file.close()
    log.info('Finished.')


if __name__ == '__main__':
    main()
