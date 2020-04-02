#!/bin/bash
#
# Author: Clyde Clements
# Created: 2018-03-12
#
# Usage:
#   ./install_pyenv.sh dir_name
#   ./install_pyenv.sh -e env_name
#
# This script creates a Python environment containing all dependencies required
# for the drift utilities. The environment can be set up in one of two ways:
#
# - As a new environment using "conda create" command. This assumes that you
#   already have Anaconda or Miniconda installed.
# - As a fresh install in which Miniconda will be downloaded and installed.

new_env="no"
while [[ $# > 0 ]]
do
  case "$1" in
    -h|-help|--help)
      echo "Usage:"
      echo "  $(basename $0) dir_name"
      echo "  $(basename $0) -e env_name"
      exit 2
      ;;
    -e)
      new_env="yes"
      ;;
    *)
      break
      ;;
  esac
  shift
done

if [[ $# -ne 1 ]]; then
  echo "Usage:"
  echo "  $(basename $0) dir_name"
  echo "  $(basename $0) -e env_name"
  echo "where dir_name is the name of the directory in which to install the"
  echo "Python environment or env_name is the name of the conda environment to"
  echo "create."
  exit 1
fi

pyenv="$1"

if [[ ! -z "$PYTHONPATH" ]]; then
  unset PYTHONPATH
fi

#if [[ $new_env == "yes" ]]; then
#  conda create --yes -n $pyenv python=3.6
#  source activate $pyenv
#  conda config --append channels conda-forge --env
#else
#  if [[ ! -f ./Miniconda3-4.4.10-Linux-x86_64.sh ]]; then
#    curl -O https://repo.continuum.io/miniconda/Miniconda3-4.4.10-Linux-x86_64.sh
#  fi
#  /bin/bash ./Miniconda3-4.4.10-Linux-x86_64.sh -b -p $pyenv
#  export PATH=$pyenv/bin:$PATH
#  conda config --append channels conda-forge --system
#fi
#/home/samuel/Downloads/Miniconda3-4.4.10-Linux-x86_64.sh -b -p $pyenv

export PATH=$pyenv/bin:$PATH
conda config --append channels conda-forge --system
conda update --yes --name base conda
conda install --yes \
  python=3.6 \
  matplotlib=2.0.2 numpy=1.12.1 pandas=0.20.2 scipy=0.19.0 \
  basemap=1.2.0 basemap-data-hires=1.1.0 \
  libnetcdf=4.4.1 netcdf4=1.2.4 hdf4=4.2.12 hdf5=1.8.17 xarray=0.9.6 \
  f90nml=0.21 geopy=1.11.0 seawater=3.3.4 \
  pykdtree=1.2.2 pyyaml=3.12 python-dateutil=2.6.0 \
  docutils
pip install defopt==4.0.1
pip install imageio
pip install pyautogui
pip install opencv-python
pip install slack
pip install slackclient

