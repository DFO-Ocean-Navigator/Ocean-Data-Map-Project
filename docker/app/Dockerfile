# build Ocean Navigator app image

FROM ocnav-runtime:latest

ENV PYTHONUNBUFFERED 1
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 12.22.1
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH
ENV HOME /home/ocnav

RUN nvm use default

# configure container
RUN mkdir -p /home/ocnav
WORKDIR /home/ocnav
COPY docker/app/entrypoint /entrypoint
COPY docker/app/runsever.sh bin
CMD ''
ENTRYPOINT '["/bin/sh", "bin/runserver.sh", "5000"]' 

# install source
COPY . /home/ocnav

# build frontend
WORKDIR /home/ocnav/oceannavigator/frontend
RUN npm install yarn && \
    yarn install --global-folder $HOME/.cache && \
    yarn build && \
    rm -rf node_modules

