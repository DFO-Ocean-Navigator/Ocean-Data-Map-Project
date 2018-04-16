# Script to rotate giops monthly files
# Note: Only giops daily and monthly need to be rotated
# Nancy Soontiens, March 2018
# Usage bash rotate_giops_monthly.sh YYYYMM logfile

date=$1
LOGFILE=$2

# GIOPS specific variables and directories
GRID=/data/hdd/grids/giops/grid_angle.nc
VARKEEP="nav_lon,nav_lat,time_counter,deptht"
# Global attributes to remove
ATTS_TO_REMOVE="history"
# Directory structure
BASEDIR=/data/hdd/giops/monthly/
FILES=$BASEDIR/giops_${date}*.nc
outsubdir=rotated

for f in $FILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $f .nc)
    savedir=$BASEDIR/$outsubdir
    if [[ ! -e $savedir ]] ; then
	mkdir -p $savedir
    fi
    savefile=$savedir/${basename}_cardinal_velocity.nc
    echo "Rotating velocity from $f. Saving to $savefile" >> $LOGFILE
    bash rotate_velocity.sh \
	 $GRID \
	 $xvel \
	 $yvel \
	 $savefile \
	 $VARKEEP \
	 "$ATTS_TO_REMOVE"
done
