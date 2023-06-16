#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.
WORKER_THREADS=1

[[ "$1" == "" ]] && PORT=5000 || PORT=$1

#gunicorn -w $(nproc) --threads $((WORKER_THREADS)) --worker-class=gthread -t 300 --graceful-timeout 300 --preload -b 0.0.0.0:$((PORT)) "oceannavigator:create_app()" $2
hypercorn -w $(nproc) --graceful-timeout 5 -b 0.0.0.0:$((PORT)) "oceannavigator:create_app()"
