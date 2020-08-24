#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

[[ x"$1" == x"" ]] && PORT=5000 || PORT=$1

if [ ! -e /usr/bin/nproc ] ; then

    if [ ! -e /usr/bin/bc ] ; then
        NUMBER_WORKERS=$(awk /^processor/'{processor++} END {print processor}' < /proc/cpuinfo)
        WORKER_THREADS=${NUMBER_WORKERS}
    else
        NUMBER_WORKERS=$(echo "($(awk /^processor/'{processor++} END {print processor}' < /proc/cpuinfo) * 2)+1" | bc)
    fi

else 

    if [ ! -e /usr/bin/bc ] ; then
        NUMBER_WORKERS=$(nproc)
        WORKER_THREADS=${NUMBER_WORKERS}
    else
        NUMBER_WORKERS=$(echo "($(nproc) * 2)+1" | bc)
        WORKER_THREADS=$(echo "(${NUMBER_WORKERS} *2 )" | bc)
    fi

fi

gunicorn -w $((NUMBER_WORKERS)) --threads $((WORKER_THREADS)) --worker-class=gthread --worker-tmp-dir /dev/shm -t 300 --graceful-timeout 300 --preload -b 0.0.0.0:$((PORT)) --reload "oceannavigator:create_app()" $2
