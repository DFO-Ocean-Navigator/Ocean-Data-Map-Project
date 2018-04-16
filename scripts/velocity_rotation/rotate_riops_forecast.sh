# Script to rotate riops forecast files
# Can subsitude for riops_daily and monthly where approriate
# Nancy Soontiens, March 2018
# Usage: bash rotate_riops_forecast.sh YYYYMM LOGFILE

# Read from command line
date=$1
LOGFILE=$2

# RIOPS specific variables and directories
GRID=/data/hdd/grids/riops/grid_angle.nc
VARKEEP="latitude,longitude"

# Global attributes to modify
ATTS_TO_REMOVE="institution source product_version contact history"

# Directory structure
OUT=/data/hdd/riops/riopsf/rotated/
FILES=/data/hdd/riops/riopsf/${date}*.nc

for f in $FILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $f .nc)
    savedir=$OUT
    if [[ ! -e $savedir ]] ; then
	mkdir -p $savedir
    fi
    # Ocean current first
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
