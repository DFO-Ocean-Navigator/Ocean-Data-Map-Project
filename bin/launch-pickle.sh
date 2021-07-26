#!/usr/bin/env bash

source ${HOME}/tools/conf/ocean-navigator-env.sh
conda activate navigator
python ${HOME}/Ocean-Data-Map-Project/scripts/generate_class4_list.py --config ${HOME}/Ocean-Data-Map-Project/oceannavigator/oceannavigator.cfg
