#!env python

from flask import Flask, Response, request
app = Flask(__name__, static_url_path='', static_folder='static')
app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))

import oceannavigator.views
