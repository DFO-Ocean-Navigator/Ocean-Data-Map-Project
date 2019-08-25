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

                py=/opt/tools/miniconda3/envs/navigator/bin/python

                $py -m unittest tests/test_geo.py
                $py -m unittest tests/test_nemo.py
                $py -m unittest tests/test_merc.py
                $py -m unittest tests/test_fvcom.py
                $py -m unittest tests/test_oceannavigator_cfg.py
                $py -m unittest tests/test_datasetconfig.py
                $py -m unittest tests/test_sqlite_database.py
                $py -m unittest tests/test_data_open_dataset.py
                $py -m unittest tests/test_api_v_1_0.py
                $py -m unittest tests/test_calculated_data.py
                $py -m unittest tests/test_calculated_parser.py
                $py -m unittest tests/test_variable.py
                $py -m unittest tests/test_variable_list.py
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
