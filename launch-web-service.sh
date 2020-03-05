#!/usr/bin/env bash
HOST_IP=$(ip addr show | grep -E "e(th|np)" | grep inet | awk '{print $2}' | sed -e 's/\/[0-9]*//')

PORT=5000

nc -zv 0.0.0.0 $PORT > /dev/null 2>&1
RES=$?

while  [ $((RES)) -eq 0 ] ; do
	PORT=$((PORT+1))
	nc -zv 0.0.0.0 $PORT > /dev/null 2>&1
	RES=$?
done

echo " "
echo "Use the following IP in your URL ${HOST_IP}:$((PORT))"
echo " "
echo "This will log information from the application to the screen and the logfile."
exec bash runserver.sh $PORT &> >(tee -a ${HOME}/launch-on-web-service.log)
