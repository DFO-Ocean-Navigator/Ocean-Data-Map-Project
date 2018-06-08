#!/usr/bin/env bash
/opt/tools/miniconda3/bin/gunicorn -w 12 -t 90 --graceful-timeout 90 --preload -b 0.0.0.0:5000 --reload oceannavigator:app $1
