#!/usr/bin/env bash

source ${HOME}/onav-cloud/etc/ocean-navigator-env.sh
conda activate navigator
python ${HOME}/onav-cloud/Ocean-Data-Map-Project/scripts/generate_class4_list.py --config ${HOME}/onav-cloud/Ocean-Data-Map-Project/oceannavigator/configs/default.env