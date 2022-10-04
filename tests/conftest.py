import os

try:
    from .temp_env_vars import ENV_VARS_TO_SUSPEND, TEMP_ENV_VARS
except ImportError:
    TEMP_ENV_VARS = {}
    ENV_VARS_TO_SUSPEND = []

"""
The following should be a part of a fixture however the TestClient app gets
initialized with the default.env settings before a fixture can be called.
"""

old_environ = dict(os.environ)
os.environ.update(TEMP_ENV_VARS)

for env_var in ENV_VARS_TO_SUSPEND:
    os.environ.pop(env_var, default=None)
