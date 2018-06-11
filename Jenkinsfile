pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        echo 'Building...'
        ws(dir: '/home/jenkins/build') {
          sh '''#!/usr/bin/env bash

build_dir=/home/jenkins/build/
frontend_dir=$build_dir/oceannavigator/frontend

npm --prefix $frontend_dir install
npm --prefix $frontend_dir run build'''
        }

      }
    }
  }
}