pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        echo 'Building...'
      }
    }
    stage('Test') {
      steps {
        echo 'Testing...'
        sh '''
python Ocean-Data-Map-Project/tests/test_nemo.py'''
      }
    }
  }
}