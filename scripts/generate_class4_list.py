"""
Generate an index of Class 4 files and save it as a Python pickle cache file.

This script generates an index of Class 4 files by globbing the Class 4 storage tree
in search of GIOPS Class 4 profile files. It is intended to be run from a cron job
and its output cache file used from within the Ocean Navigator code.
"""

import argparse
import datetime
import fcntl
import logging
import pickle
import sys
import time
from pathlib import Path

logging.basicConfig(format="%(message)s", level=logging.INFO)
log = logging.getLogger()


def list_class4_files(class4_path, pattern):
    files = {f for f in Path(class4_path).glob(pattern)}
    result = [
        {
            "name": datetime.datetime.strptime(
                class4_id.split("_")[1], "%Y%m%d"
            ).strftime("%Y-%m-%d"),
            "id": class4_id,
        }
        for class4_id in sorted((f.stem for f in files), reverse=True)
    ]
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config",
        dest="config_file",
        required=True,
        type=argparse.FileType("rb"),
        help="Name of Ocean Navigator configuration file.",
    )
    opts = parser.parse_args()

    config = {}
    log.info(
        f"Attempting to load Ocean Navigator configuration\
             from file {opts.config_file.name}..."
    )
    try:
        exec(compile(opts.config_file.read(), opts.config_file.name, "exec"), config)
    except IOError:
        log.error(f"Error: Unable to load configuration file {opts.config_file.name}.")
        sys.exit(1)

    if 'ONAV_CLASS4_OP_PATH' not in config:
        log.error("Error: ONAV_CLASS4_OP_PATH entry not found in config file.")
        sys.exit(1)

    if 'ONAV_CLASS4_RAO_PATH' not in config:
        log.error("Error: ONAV_CLASS4_RAO_PATH entry not found in config file.")
        sys.exit(1)

    if "ONAV_CACHE_DIR" not in config:
        log.error("Cache directory specification not found in configuration file")
        sys.exit(1)

    class4_paths = [config['ONAV_CLASS4_OP_PATH'], config['ONAV_CLASS4_RAO_PATH']]
    output_files = ["class4_OP_files.pickle", "class4_RAO_files.pickle"]
    pattern = ["**/**/*GIOPS*profile.nc", "**/**/*SAM2_OLA.nc"]

    for path, file, pattern in zip(class4_paths, output_files, pattern):
        log.info(f"Generating list of Class4 files from {path}...")
        class4_files = list_class4_files(path, pattern)

        output_file_name = Path(config["ONAV_CACHE_DIR"], file)
        try:
            output_file = open(output_file_name, "wb")
        except IOError:
            log.error(f"Unable to open output file {output_file_name}")
            sys.exit(1)

        log.info(f"Obtaining exclusive lock on output file {output_file_name }...")
        # Make at most "max_tries" attempts to acquire the lock.
        num_tries, max_tries = 0, 10
        attempt_lock, lock_acquired = True, False
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
            log.error(f"Unable to acquire lock on output file {output_file_name}")
            sys.exit(1)

        log.info("Writing list of Class4 files to output file ...")
        pickle.dump(class4_files, output_file)

        log.info("Releasing lock on output file ...")
        try:
            fcntl.lockf(output_file, fcntl.LOCK_UN)
        except IOError:
            log.error(f"Unable to release lock on output file {output_file_name}")
            sys.exit(1)
        finally:
            output_file.close()
    log.info("Finished.")


if __name__ == "__main__":
    main()
