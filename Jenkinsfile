pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        echo 'Pulling...'+env.BRANCH_NAME
        echo "CURRENT DIR:"+pwd()
        ws(dir: '/home/jenkins/build') {
          echo 'Pulling...'+env.BRANCH_NAME
          echo "CURRENT DIR:"+pwd()
          echo 'Building Javascript files'
          sh '''
                #!/usr/bin/env bash

                build_dir=/home/jenkins/build/
                frontend_dir=$build_dir/oceannavigator/frontend

                npm --prefix $frontend_dir install
                npm --prefix $frontend_dir run build
              '''
          echo 'Running Python tests'
          sh '''
                #!/usr/bin/env bash

                py=/opt/tools/miniconda3/bin/python

                $py -m unittest tests/test_geo.py
                $py -m unittest tests/test_nemo.py
              '''
        }

      }
    }
  }
}