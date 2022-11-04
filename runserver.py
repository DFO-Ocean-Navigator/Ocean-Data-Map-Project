#!/usr/bin/env python

import asyncio

from hypercorn.asyncio import serve
from hypercorn.config import Config

from oceannavigator import create_app

config = Config()
config.bind = ["0.0.0.0:5000"]
config.accesslog = "-"
config.errorlog = "-"
config.use_reloader = True

app = create_app()

asyncio.run(serve(app, config), debug=True)
