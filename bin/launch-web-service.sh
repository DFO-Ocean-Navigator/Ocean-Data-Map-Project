#!/usr/bin/env bash

HOST_IP=$(hostname -I | awk '{print $1}')

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
echo "Logging information is being handled by GUNICORN."
exec bash runserver.sh $PORT 
