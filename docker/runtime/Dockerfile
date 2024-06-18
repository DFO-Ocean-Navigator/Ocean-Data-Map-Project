# build Ocean Navigator runtime image
FROM docker.io/datajoint/miniconda3

USER root

RUN apt-get update && apt-get -y install curl gnupg2

USER anaconda

ENV PYTHONUNBUFFERED 1
ENV NVM_DIR /home/anaconda/.nvm
ENV NODE_VERSION=20.12.2
ENV BASH_ENV=/home/anaconda/.bashrc
SHELL ["/bin/bash", "-c"]

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.39.3/install.sh | bash

RUN . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default

RUN curl https://raw.githubusercontent.com/tripougnif/Ocean-Data-Map-Project/docker-conda/config/conda/navigator-spec-file.txt > /tmp/navigator-spec-file.txt
RUN conda create --quiet --name navigator --file /tmp/navigator-spec-file.txt
RUN conda activate navigator && pip install pydantic-settings==2.1.0 python-dotenv==1.0.0 visvalingamwyatt==0.2.0

USER root
RUN apt-get -y remove curl gnupg2 && apt -y autoremove && \
	chmod -R 777 /home/anaconda && \
	chmod -R o+rX /opt/conda && \
	chmod -R o+rwX /main

USER anaconda
