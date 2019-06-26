pipeline {
  agent any
  stages {
    stage('Build') {
      steps {
        slackSend(color: '#FFFF00', message: "STARTED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.BUILD_URL})")
        echo 'Pulling...'+env.BRANCH_NAME
        checkout scm
        echo 'Building Javascript files'
        sh '''
                #!/usr/bin/env bash

                frontend_dir=${WORKSPACE}/oceannavigator/frontend

                npm --prefix $frontend_dir install
                npm --prefix $frontend_dir run build
            '''
        echo 'Running Python tests'
        sh '''
                #!/usr/bin/env bash

                TEST=/opt/tools/miniconda3/envs/navigator/bin/python -m unittest

<<<<<<< HEAD
                $py -m unittest tests/test_geo.py
                $py -m unittest tests/test_nemo.py
                $py -m unittest tests/test_api_v1_0_plot_line.py
                $py -m unittest tests/test_oceannavigator_cfg.py
                $py -m unittest tests/test_datasetconfig.py
=======
                $TEST tests/test_geo.py
                $TEST tests/test_nemo.py
                $TEST tests/test_api_v1_0_plot_line.py
                $TEST tests/test_stats.py
                $TEST tests/test_oceannavigator_cfg.py
                $TEST tests/test_datasetconfig.py
>>>>>>> a2930567418445d2901ab9dd235d2b4fb8a4a71a
           '''
      }
    }
  }
  post {
    success {
      slackSend(color: '#00FF00', message: "SUCCESSFUL: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.BUILD_URL})")

    }

    failure {
      slackSend(color: '#FF0000', message: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.BUILD_URL})")

    }

  }
}
