import logging
import os
import tempfile
from sys import argv

import dask
import sentry_sdk
from data.observational import db
from flask import Flask, request, send_file
from flask_babel import Babel
from flask_compress import Compress
from sentry_sdk.integrations.flask import FlaskIntegration
from utils.ascii_terminal_colors import ASCIITerminalColors
from werkzeug.middleware.profiler import ProfilerMiddleware

# Although DatasetConfig is not used in this module, this import is absolutely necessary
# because it is how the rest of the app gets access to DatasetConfig
from .dataset_config import DatasetConfig

babel = Babel()

def config_blueprints(app) -> None:
    from routes.api_v1_0 import bp_v1_0
    app.register_blueprint(bp_v1_0)

def config_dask(app) -> None:
    dask.config.set(scheduler=app.config.get('DASK_SCHEDULER', 'processes'))
    dask.config.set(num_workers=app.config.get('DASK_NUM_WORKERS', 4))
    dask.config.set({"multiprocessing.context": app.config.get('DASK_MULTIPROCESSING_CONTEXT', 'spawn') })

def create_app(testing: bool = False):
    # Sentry DSN URL will be read from SENTRY_DSN environment variable
    sentry_sdk.init(
        integrations=[FlaskIntegration()],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE", 0)),
        environment=os.getenv("SENTRY_ENV"),
    )
    app = Flask(__name__, static_url_path='', static_folder='frontend')
    app.add_url_rule('/', 'root', lambda: app.send_static_file('index.html'))
    app.config.from_pyfile('oceannavigator.cfg', silent=False)
    app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)
    app.testing = testing

    if app.config.get('WSGI_PROFILING'):
        if not os.path.isdir('./profiler_results'):
            os.mkdir('./profiler_results')
        app.wsgi_app = ProfilerMiddleware(app.wsgi_app, stream=None, restrictions=[10], profile_dir='./profiler_results')

    if testing:
        # Override cache dirs when testing
        # to avoid test files being cached
        # in production cache
        cache_dir = tempfile.mkdtemp()
        tile_dir = tempfile.mkdtemp()
        app.config.update(
            CACHE_DIR=cache_dir,
            TILE_CACHE_DIR=tile_dir
        )
        print(f"{ASCIITerminalColors.WARNING}[Warning] -- Cached files will NOT be cleaned after tests complete: {cache_dir} AND {tile_dir}{ASCIITerminalColors.ENDC}")

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

    config_dask(app)

    config_blueprints(app)

    Compress(app)

    babel.init_app(app)

    return app

@babel.localeselector
def get_locale():
    return request.accept_languages.best_match(['en', 'fr'])
    