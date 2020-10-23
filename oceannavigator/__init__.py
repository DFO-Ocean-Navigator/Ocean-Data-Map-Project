#!/usr/bin/env python

import logging

from flask import Flask, request, send_file
from flask_compress import Compress
from flask_babel import Babel
from sys import argv
from .dataset_config import DatasetConfig
from data.observational import db

babel = Babel()

def config_blueprints(app):
    from routes.api_v1_0 import bp_v1_0
    app.register_blueprint(bp_v1_0)

def create_app(testing = False):
    app = Flask(__name__, static_url_path='', static_folder='frontend')
    app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))
    app.config.from_pyfile('oceannavigator.cfg', silent=False)
    app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)
    app.testing = testing
    # Customize Flask debug logger message format
    app.logger.handlers[0].setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s in [%(pathname)s:%(lineno)d]: %(message)s',
        datefmt="%Y-%m-%d %H:%M:%S"))
    db.init_app(app)

    datasetConfig = argv[-1]
    if '.json' in datasetConfig:
        app.config['datasetConfig'] = datasetConfig
    else:
        app.config['datasetConfig'] = "datasetconfig.json"

    @app.route('/public/')
    def public_index():
        res = send_file('frontend/public/index.html')
        return res

    config_blueprints(app)

    Compress(app)

    babel.init_app(app)

    return app

@babel.localeselector
def get_locale():
    return request.accept_languages.best_match(['en', 'fr'])
