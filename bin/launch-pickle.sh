#!/usr/bin/env bash

if [ -e /opt/config/etc/profile.d/ocean-navigator.sh ] ; then 

    . /opt/config/etc/profile.d/ocean-navigator.sh
    python /opt/Ocean-Data-Map-Project/scripts/generate_class4_list.py --config /opt/Ocean-Data-Map-Project/oceannavigator/oceannavigator.cfg

else

    . ${HOME}/.bashrc
    python ${HOME}/Ocean-Data-Map-Project/scripts/generate_class4_list.py --config ${HOME}/Ocean-Data-Map-Project/oceannavigator/oceannavigator.cfg

fi
