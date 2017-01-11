#!env python

from flask import Flask, request
from flask_compress import Compress
from flask.ext.babel import Babel

app = Flask(__name__, static_url_path='', static_folder='frontend')
app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))
app.config.from_pyfile('oceannavigator.cfg', silent=False)
app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)

Compress(app)

babel = Babel(app)

import oceannavigator.views


@babel.localeselector
def get_locale():
    return request.accept_languages.best_match(['en', 'fr'])
