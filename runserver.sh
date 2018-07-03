#!/usr/bin/env bash

# Usage: ./runserver.sh <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

gunicorn -w 12 -t 90 --graceful-timeout 90 --preload -b 0.0.0.0:5000 --reload "oceannavigator:create_app()" $1
