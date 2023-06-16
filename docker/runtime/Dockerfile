# build Ocean Navigator runtime image
FROM alpine

ENV PYTHONUNBUFFERED 1
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 12.22.1

# install runtime requirements
RUN apk -U add $(cat ./docker/runtime/requirements.apk)

# install build requirements
RUN apk -U add build-base proj-dev gdal-dev geos-dev hdf5-dev netcdf-dev openblas-dev freetype-dev python3-dev py3-numpy-dev py3-pip -t .build-deps

# install python dependencies
RUN pip install  -r ./docker/runtime/requirements.txt

# remove build requirements
RUN apk del .build-deps
RUN apk cache clean
RUN rm -r /root/.cache
