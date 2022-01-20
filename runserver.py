#!/usr/bin/env python

from oceannavigator import create_app


app = create_app()

app.run(host='0.0.0.0', port=5000)  # , processes=4)
