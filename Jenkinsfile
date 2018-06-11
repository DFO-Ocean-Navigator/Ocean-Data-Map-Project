pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        ws(dir: '/home/jenkins/build') {
          echo 'Building Javascript files'
          sh '''#!/usr/bin/env bash

build_dir=/home/jenkins/build/
frontend_dir=$build_dir/oceannavigator/frontend

npm --prefix $frontend_dir install
npm --prefix $frontend_dir run build'''
          echo 'Running Python tests'
        }

      }
    }
  }
}