pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        echo 'Building...'
        ws(dir: '/home/jenkins/build') {
          git(url: 'https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project.git', branch: 'dev')
          sh '''#!/usr/bin/env bash

build_dir=/home/jenkins/build/
frontend_dir=$build_dir/Ocean-Data-Map-Project/oceannavigator/frontend

npm --prefex $frontend_dir install
npm --prefix $frontend_dir run build'''
        }

      }
    }
  }
}