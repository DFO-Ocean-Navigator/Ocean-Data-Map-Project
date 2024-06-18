# build Ocean Navigator development image
#FROM image-registry.openshift-image-registry.svc:5000/ssc-hpco-ocnav-test/onav-runtime:latest
FROM onav-runtime:latest

USER anaconda

ENV PYTHONUNBUFFERED 1
ENV NVM_DIR /home/anaconda/.nvm
ENV NODE_VERSION=20.12.2
ENV BASH_ENV=/home/anaconda/.bashrc
SHELL ["/bin/bash", "-c"]

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

COPY --chown=anaconda:anaconda . /main

WORKDIR /main/oceannavigator/frontend
RUN npm install && npm run build

WORKDIR /main
RUN chmod -R o+rwX /main

CMD bash -c 'conda activate navigator; hypercorn -w $(nproc) --graceful-timeout 5 -b 0.0.0.0:8443 "oceannavigator:create_app()"'
