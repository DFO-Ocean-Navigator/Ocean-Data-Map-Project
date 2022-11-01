#!/usr/bin/env bash

# Usage: ./runserver.sh <port> <optional_dataset_config_file.json>
# <optional_dataset_config_file.json>:  Specify a non-default dataset config file to load the Navigator with.
#                                       Argument not required.

[[ "$1" == "" ]] && PORT=5000 || PORT=$1

export ONAV_GIT_HASH="$(git rev-parse HEAD)"
export ONAV_GIT_TAG="$(git describe --tags --abbrev=0)"

CERT_DIR=${HOME}/onav-cloud/etc/ssl

# https://pgjones.gitlab.io/hypercorn/how_to_guides/configuring.html#configuration-options
screen -A -d -m -S HYPERCORN hypercorn --keyfile $CERT_DIR/private/nginx-selfsigned.key --certfile $CERT_DIR/certs/nginx-selfsigned.crt -w $(nproc) --graceful-timeout 5 -b 0.0.0.0:$((PORT)) "oceannavigator:create_app()" --access-logfile ${HOME}/hypercorn/access.log --error-logfile ${HOME}/hypercorn/error.log
