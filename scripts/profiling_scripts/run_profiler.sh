#!/bin/bash

# --url: the url of the Navigator instance that's being profiled
# --config: the path of configuration file
# --csv: the path of csv file for output data (Optional, one will be created if not provided)
# --prof: the path to the directory containing server profiling results (Optional, requires running script on server with Navigator, or remote access to /profiler_results)
# --id: a unique user identifer for output file names 
# -a: the number of attempts to reach each end point allowed 
# -t: the maxium time to wait for a response from each endpoint

url="https://navigator.oceansdata.ca"                           
config="api_profiling_config.json"
prof_path=""
max_time=120
max_attempts=1
user_id="$(whoami)-$(hostname)-$(hostname -I | awk '{print $1}')"
csv_path="${user_id}_profiling_results.csv"

python api_profiling_driver.py --url $url --config $config --csv $csv_path --id $user_id -a $max_attempts -t $max_time

ssh -i ${HOME}/onav-cloud/.ssh/id_ed25519 profiler@trinity.ent.dfo-mpo.ca " [ ! -d $(date +%Y%m%d) ] && mkdir $(date +%Y%m%d)"
scp -i ${HOME}/onav-cloud/.ssh/id_ed25519 $(find . -name "*.csv") $(find . -name "*.log") profiler@trinity.ent.dfo-mpo.ca:$(date +%Y%m%d)
