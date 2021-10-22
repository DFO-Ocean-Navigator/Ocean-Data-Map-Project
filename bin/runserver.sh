#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

# Docs: https://docs.gunicorn.org/en/stable/configure.html

[[ "$1" == "" ]] && PORT=5000 || PORT=$1

NUMBER_WORKERS=$(nproc)
WORKER_THREADS="2"
WORKER_CLASS="gthread"

GUNICORN_WORKER_OPTS=" -w ${NUMBER_WORKERS} --threads --work-class=${WORKER_THREADS} ${WORKER_CLASS} "

GUNICORN_TIMING_OPTS=" -t 300 --graceful-timeout 300 "

LOG_DIRECTORY=" ${HOME}/var "
[ ! -d ${LOG_DIRECTORY} ] && mkdir -p ${LOG_DIRECTORY}

LOG_FILE=" ${LOG_DIRECTORY}/gunicorn.log"


if [ ! -d ${HOME}/certs ] ; then
    GUNICORN_OPTS=" --log-file ${LOG_FILE} "
else
    GUNICORN_OPTS=" --cerfile ${HOME}/certs/self-signed.crt --key-file ${HOME}/priv/self-signed.key --log-file ${LOG_FILE} "
fi

gunicorn ${GUNICORN_WORKER_OPTS} ${GUNICORN_TIMING_OPTS} ${GUNICORN_OPTS} --preload -b 0.0.0.0:$((PORT)) --reload "oceannavigator:create_app()" $2 --daemon
echo $! > ${HOME}/gunicorn.pid
