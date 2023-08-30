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
RUN checksum=$(curl -sSL --compressed "https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/SHASUMS256.txt" | grep "node-v${NODE_VERSION}-linux-x64-musl.tar.xz" | cut -d' ' -f1) \
    && curl -fsSLO --compressed "https://unofficial-builds.nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64-musl.tar.xz"; \
    echo "$checksum  node-v$NODE_VERSION-linux-x64-musl.tar.xz" | sha256sum -c - \
      && tar -xJf "node-v$NODE_VERSION-linux-x64-musl.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
      && ln -sf /usr/local/bin/node /usr/local/bin/nodejs \
      && rm -f "node-v$NODE_VERSION-linux-x64-musl.tar.xz" \
      && node --version \
      && npm --version

# install python dependencies
COPY requirements.txt requirements.txt
RUN pip install -U pip && pip install  -r requirements.txt

# install frontend dependencies
COPY package.json package.json
COPY package-lock.json package-lock.json
RUN npm install
