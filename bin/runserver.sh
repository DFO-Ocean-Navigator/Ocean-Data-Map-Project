#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

[[ x"$1" == x"" ]] && PORT=5000 || PORT=$1

if [ ! -e /usr/bin/bc ] ; then
    NUMBER_PROCS=$(awk /^processor/'{processor++} END {print processor}' < /proc/cpuinfo)
else
    NUMBER_PROCS=$(echo "$(awk /^processor/'{processor++} END {print processor}' < /proc/cpuinfo) * 2" | bc)
fi

gunicorn -w $((NUMBER_PROCS)) -t 300 --graceful-timeout 300 --preload -b 0.0.0.0:$((PORT)) --reload "oceannavigator:create_app()" $2
