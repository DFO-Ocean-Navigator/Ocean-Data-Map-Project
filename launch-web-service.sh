#!/usr/bin/env bash
echo "This will log information from the application to the screen and the logfile."
exec bash runserver.sh &> >(tee -a /home/buildadm/launch-web-service.log)
