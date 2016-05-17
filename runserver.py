from oceannavigator import app

# app.config.update(
#     DEBUG=True,
#     THREDDS_SERVER="http://localhost:8080/thredds/",
#     CACHE_DIR="/tmp"
# )
app.config.from_pyfile('oceannavigator.cfg', silent=False)
app.config.from_envvar('OCEANNAVIGATOR_SETTINGS', silent=True)
app.run(host='0.0.0.0')
