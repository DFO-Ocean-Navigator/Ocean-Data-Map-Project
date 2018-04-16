# Script to rotate giops daily files
# Note: Only giops daily and monthly need to be rotated
# Nancy Soontiens, March 2018
# Usage bash roated_giops_daily.sh YYYYMM logfile

date=$1
LOGFILE=$2

# GIOPS specific variables and directories
GRID=/data/hdd/grids/giops/grid_angle.nc
VARKEEP="nav_lon,nav_lat,time_counter,deptht"
# Global attributes to remove
ATTS_TO_REMOVE="history history_of_appended_files"
# Directory structure
BASEDIR=/data/hdd/giops/daily/
FILES=$BASEDIR/${date}/*.nc
outsubdir=rotated

for f in $FILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $f .nc)
    dirname=$(dirname $f)
    subdir=$(basename $dirname)
    savedir=$BASEDIR/$subdir/$outsubdir
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
