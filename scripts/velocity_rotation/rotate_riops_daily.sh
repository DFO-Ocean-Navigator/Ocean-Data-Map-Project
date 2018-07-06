# Script to rotate riops daily files
# Nancy Soontiens, March 2018

# Usage: bash rotate_riops_daily.sh YYYYMM logfile

# Read arguments
date=$1
LOGFILE=$2
# Script will append messages to the logfile

# RIOPS specific variables and gridfile
GRID=/data/hdd/grids/riops/grid_angle.nc
VARKEEP="latitude,longitude"
# Global attributes to remove
ATTS_TO_REMOVE="institution source product_version contact history"
# Directory structure
OUT=/data/hdd/riops/riops_daily/rotated/
FILES=/data/hdd/riops/riops_daily/${date}*.nc

for f in $FILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $f .nc)
    savedir=$OUT
    if [[ ! -e $savedir ]] ; then
	mkdir -p $savedir
    fi
    savefile=$savedir/${basename}_cardinal_velocity.nc
    echo "Rotating velocity from $f. Saving to $savefile" >> $LOGFILE
    if [[ ! -e $savefile ]] ; then
        bash rotate_velocity.sh \
        $GRID \
        $xvel \
        $yvel \
        $savefile \
        $VARKEEP  \
        "$ATTS_TO_REMOVE"
    else
        echo "File $savefile already exists and therefore creation has been skipped" >> $LOGFILE
    fi
done
