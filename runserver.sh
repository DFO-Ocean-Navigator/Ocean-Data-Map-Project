#!/usr/bin/env bash

gunicorn -w 12 -t 90 --graceful-timeout 90 --preload -b 0.0.0.0:5000 --reload "oceannavigator:create_app()" $1
