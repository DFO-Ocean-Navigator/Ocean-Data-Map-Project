# build Ocean Navigator runtime image
FROM docker.io/library/node:18-alpine

ENV PYTHONUNBUFFERED 1

# install runtime requirements
COPY requirements.apk requirements.apk
RUN apk -U add $(cat requirements.apk)

# install build requirements
RUN apk -U add build-base curl proj-dev gdal-dev geos-dev hdf5-dev netcdf-dev openblas-dev freetype-dev python3-dev py3-numpy-dev py3-pip -t .build-deps

# install python dependencies
COPY requirements.txt requirements.txt
RUN pip install -U pip && pip install  -r requirements.txt
