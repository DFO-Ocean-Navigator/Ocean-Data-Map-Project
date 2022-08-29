import logging

import dask
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import Mount
from fastapi.staticfiles import StaticFiles
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

from oceannavigator.dataset_config import DatasetConfig
from routes.api_v1_0 import router as v1_router

from .settings import get_settings

# from data.observational import db


def configure_logger(log_level: str) -> None:
    logger = logging.getLogger("Ocean_Navigator")
    logger.setLevel(log_level)

    formatter = logging.Formatter(
        "[%(asctime)s] [%(process)d] [%(levelname)s] %(message)s (%(filename)s:%(lineno)d)"
    )

    ch = logging.StreamHandler()
    ch.setLevel(log_level)
    ch.setFormatter(formatter)

    logger.addHandler(ch)


def configure_dask() -> None:
    settings = get_settings()
    dask.config.set(scheduler=settings.dask_scheduler)
    dask.config.set(num_workers=settings.dask_num_workers)
    dask.config.set({"multiprocessing.context": settings.dask_multiprocessing_context})


def configure_sentry(app: FastAPI) -> None:
    settings = get_settings()

    # Sentry DSN URL will be read from SENTRY_DSN environment variable
    sentry_sdk.init(
        traces_sample_rate=float(settings.sentry_traces_rate),
        environment=settings.sentry_env,
    )

    SentryAsgiMiddleware(app)


def configure_opentelemetry(app: FastAPI) -> None:
    FastAPIInstrumentor.instrument_app(app)


def add_routes(app: FastAPI) -> None:
    app.include_router(v1_router)


def configure_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(KeyError)
    async def resource_not_found_handler(request: Request, exception) -> JSONResponse:
        return JSONResponse(status_code=404, content={"message": str(exception)})


def create_app(testing: bool = False) -> FastAPI:
    get_settings.cache_clear()
    settings = get_settings()

    if testing:
        settings.dataset_config_file = (
            "/home/ubuntu/onav-cloud/Ocean-Data-Map-Project"
            "/tests/testdata/datasetconfigpatch.json"
        )

    configure_logger(settings.log_level)

    DatasetConfig._get_dataset_config.cache_clear()
    DatasetConfig._get_dataset_config()

    routes = [
        Mount(
            "/public",
            app=StaticFiles(directory="oceannavigator/frontend/public", html=True),
            name="public",
        ),
    ]

    app = FastAPI(debug=settings.debug, routes=routes)

    app.add_middleware(GZipMiddleware)

    # db.init_app(app)

    configure_sentry(app)
    configure_opentelemetry(app)
    configure_dask()
    configure_exception_handlers(app)

    add_routes(app)

    # We must mount the root page AFTER adding ALL other routes.
    # see: https://github.com/encode/starlette/issues/437#issuecomment-473598659
    # Yes, this function is discouraged but YOLO.
    app.mount(
        "/", StaticFiles(directory="oceannavigator/frontend/", html=True), name="root"
    )

    return app
