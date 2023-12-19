import logging
import pathlib

import dask
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import Mount
from fastapi.staticfiles import StaticFiles
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

from oceannavigator.dataset_config import DatasetConfig

from .settings import get_settings


def configure_logger(log_level: str) -> None:
    logger = logging.getLogger("Ocean_Navigator")
    logger.setLevel(log_level)

    formatter = logging.Formatter(
        "[%(asctime)s] [%(process)d] [%(levelname)s] "
        "%(message)s (%(filename)s:%(lineno)d)"
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


def add_routes(app: FastAPI) -> None:
    from routes.api_v2_0 import router as v2_router

    app.include_router(v2_router)


def configure_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(KeyError)
    async def resource_not_found_handler(request: Request, exception) -> JSONResponse:
        return JSONResponse(status_code=404, content={"message": str(exception)})


def create_app() -> FastAPI:
    get_settings.cache_clear()
    settings = get_settings()

    configure_logger(settings.log_level)

    DatasetConfig._get_dataset_config.cache_clear()
    DatasetConfig._get_dataset_config()

    pathlib.Path('oceannavigator/frontend/public').mkdir(parents=True, exist_ok=True)

    routes = [
        Mount(
            "/public",
            app=StaticFiles(directory="oceannavigator/frontend/public", html=True),
            name="public",
        ),
    ]

    app = FastAPI(debug=settings.debug, routes=routes)

    app.add_middleware(GZipMiddleware)

    configure_sentry(app)
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
