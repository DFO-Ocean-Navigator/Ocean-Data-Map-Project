#!/bin/sh

# There should be a file called "drifter_login.sh" in this directory that
# defines USER and PASSWORD
. `dirname $0`/drifter_login.sh

cat << EOF | lftp 
open -u ${USER},${PASSWORD} ftp.joubeh.com
mirror --only-missing / /data/drifter/raw 
exit
EOF

/opt/tools/anaconda/2/4.2.0/bin/python `dirname $0`/drifter_process.py

cp /data/drifter/output/*.nc /data/drifter/done/

