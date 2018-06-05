#!env python

from flask import Flask, request, send_file
from flask_compress import Compress
from flask_babel import Babel
from sys import argv

app = Flask(__name__, static_url_path='', static_folder='frontend')
app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))
app.config.from_pyfile('oceannavigator.cfg', silent=False)
app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)

datasetConfig = argv[-1]
if 'datasetConfig' in datasetConfig:
    app.config['datasetConfig'] = datasetConfig
else:
    app.config['datasetConfig'] = "datasetconfig.json"
    
Compress(app)

babel = Babel(app)

import oceannavigator.views


@babel.localeselector
def get_locale():
    return request.accept_languages.best_match(['en', 'fr'])


@app.route('/public/')
def public_index():
    res = send_file('frontend/public/index.html')
    return res
