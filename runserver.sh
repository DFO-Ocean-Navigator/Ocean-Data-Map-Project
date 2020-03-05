#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

[[ x"$1" == x"" ]] && PORT=5000 || PORT=$1
gunicorn -w 4 -t 90 --graceful-timeout 90 --preload -b 0.0.0.0:$((PORT)) --reload "oceannavigator:create_app()" $2
