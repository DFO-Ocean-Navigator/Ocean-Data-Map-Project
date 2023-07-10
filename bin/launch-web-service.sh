#!/usr/bin/env bash

CODE_VER=$(git status | head -1 | awk '{print $NF}')
$(sed -i "s/CODE_VERSION/$CODE_VER/g" oceannavigator/frontend/index.html)

HOST_IP=$(hostname -I | awk '{print $1}')

PORT=8443

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
exec bash runserver.sh $PORT 
