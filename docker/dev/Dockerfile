# build Ocean Navigator runtime image
FROM docker.io/library/alpine:3.18

ENV PYTHONUNBUFFERED 1
ENV NODE_VERSION=12.22.1

# install runtime requirements
COPY requirements.apk requirements.apk
RUN apk -U add $(cat requirements.apk)

# install build requirements
RUN apk -U add build-base curl proj-dev gdal-dev geos-dev hdf5-dev netcdf-dev openblas-dev freetype-dev python3-dev py3-numpy-dev py3-pip -t .build-deps

# install unofficial node-musl build
RUN curl -fsSLO --compressed "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64-musl.tar.xz"; \
    echo "CHECKSUM_x64  node-v$NODE_VERSION-linux-x64-musl.tar.xz" | sha256sum -c - \
      && tar -xJf "node-v$NODE_VERSION-linux-x64-musl.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
      && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
      && rm -f "node-v$NODE_VERSION-linux-x64-musl.tar.xz" \
      && node --version \
      && npm --version

# install python dependencies
COPY requirements.txt requirements.txt
RUN pip install -U pip && pip install  -r requirements.txt
