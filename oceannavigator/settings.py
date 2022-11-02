import os
from functools import lru_cache
from typing import List

from pydantic import BaseSettings


class Settings(BaseSettings):
    api_v2_route: str = "/api/v2"
    openapi_route: str = "/api/v2/openapi.json"

    git_hash: str = ""
    git_tag: str = ""

    bathymetry_file: str = ""
    cache_dir: str = ""
    class4_fname_pattern: str = ""
    class4_op_path: str = ""
    class4_rao_path: str = ""
    dask_multiprocessing_context: str = ""
    dask_num_workers: int = 4
    dask_scheduler: str = ""
    dataset_config_file: str = ""
    debug: bool = False
    drifter_agg_url: str = ""
    drifter_catalog_url: str = ""
    drifter_url: str = ""
    etopo_file: str = ""
    log_level: str = "DEBUG"
    observation_agg_url: str = ""
    overlay_kml_dir: str = ""
    sentry_env: str = ""
    sentry_traces_rate: int = 0
    shape_file_dir: str = ""
    sqlalchemy_database_uri: str = ""
    sqlalchemy_echo: bool = False
    sqlalchemy_pool_recycle: int = 50
    sqlalchemy_track_modifications: bool = False
    tile_cache_dir: str = ""

    backend_cors_origins_str: str = ""  # Should be a comma-separated list of origins

    @property
    def backend_cors_origins(self) -> List[str]:
        return [x.strip() for x in self.backend_cors_origins_str.split(",") if x]

    class Config:
        case_sentive: bool = False
        env_prefix: str = "onav_"
        env_file: str = os.environ.get(
            "ONAV_ENV_FILE", "oceannavigator/configs/default.env"
        )
        env_file_encoding: str = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # reads variables from environment
