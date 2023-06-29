# build Ocean Navigator runtime image
FROM docker.io/library/alpine

ENV PYTHONUNBUFFERED 1
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 12.22.1

# install runtime requirements
COPY requirements.apk requirements.apk
RUN apk -U add $(cat requirements.apk)

# install build requirements
RUN apk -U add build-base curl proj-dev gdal-dev geos-dev hdf5-dev netcdf-dev openblas-dev freetype-dev python3-dev py3-numpy-dev py3-pip -t .build-deps

# install nvm and set nodejs default version
RUN mkdir -p /usr/local/nvm && \
    curl https://raw.githubusercontent.com/creationix/nvm/v0.39.3/install.sh | bash && \
    source $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION

# install python dependencies
COPY requirements.txt requirements.txt
RUN pip install  -r requirements.txt

# remove build requirements
RUN apk del .build-deps
RUN apk cache clean
RUN rm -r /root/.cache
