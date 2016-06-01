#!env python

from flask import Flask, Response, request
app = Flask(__name__, static_url_path='', static_folder='static')
app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))
app.config.from_pyfile('oceannavigator.cfg', silent=False)
app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)

import oceannavigator.views
