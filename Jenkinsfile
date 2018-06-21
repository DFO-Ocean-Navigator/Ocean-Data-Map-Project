pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        ws(dir: '/home/jenkins/build') {
          echo 'Setting Python Environment variables'
          sh '''#!/usr/bin/env bash

# https://unix.stackexchange.com/a/217626/236950
# Check if Miniconda path is set. If not, set it.
[[ ":$PATH:" != *":/opt/tools/miniconda3/bin/:"* ]] && PATH="/opt/tools/miniconda3/bin/:${PATH}"
'''
          echo 'Building Javascript files'
          sh '''#!/usr/bin/env bash

build_dir=/home/jenkins/build/
frontend_dir=$build_dir/oceannavigator/frontend

npm --prefix $frontend_dir install
npm --prefix $frontend_dir run build'''
          echo 'Running Python tests'
          sh '''#!/usr/bin/env bash

py=/opt/tools/miniconda3/bin/python

$py -m unittest tests/test_geo.py'''
        }

      }
    }
  }
}