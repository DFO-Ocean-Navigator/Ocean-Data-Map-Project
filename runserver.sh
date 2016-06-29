#!/bin/sh
gunicorn -w 12 -t 90 --graceful-timeout 90 --preload -b 0.0.0.0:5050 --reload oceannavigator:app

