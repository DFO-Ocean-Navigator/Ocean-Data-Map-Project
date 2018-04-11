# Script to rotate riops forecast files
# Can subsitude for riops_daily and monthly where approriate
# Nancy Soontiens, March 2018
# Usage: bash rotate_riops_forecast.sh YYYYMM LOGFILE

SCRIPTNAME=$0
# Read from command line
date=$1
LOGFILE=$2

# RIOPS specific variables and directories
GRID=/data/hdd/grids/riops/grid_angle.nc
VAR3D="latitude,longitude,time,depth"
VAR2D="latitude,longitude,time"
TYPE_OCEAN='ocean'
XVELN='vozocrtx'
YVELN='vomecrty'
TYPE_ICE='ice'
ICEXVELN='itzocrtx'
ICEYVELN='itmecrty'

# Global attributes to modify
ATTS_TO_REMOVE="institution source product_version contact history"
COMMENT="DERIVED PRODUCT - created with script ${SCRIPTNAME}"

# Directory structure
OUT=/data/hdd/riops/riopsf/rotated/
FILES=/data/hdd/riops/riopsf/${date}*.nc

for f in $FILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $f .nc)
    savedir=$OUT
    if [[ $basename = *"2D"* ]]; then
	varkeep=$VAR2D
    else
	varkeep=$VAR3D
    fi
    if [[ ! -e $savedir ]] ; then
	mkdir -p $savedir
    fi
    # Ocean current first
    savefile=$savedir/${basename}_cardinal_velocity.nc
    echo "Rotating ocean current from $f. Saving to $savefile" >> $LOGFILE
    bash rotate_velocity.sh \
	 $GRID \
	 $xvel \
	 $yvel \
	 $XVELN \
	 $YVELN \
	 $savefile \
	 $varkeep \
	 $TYPE_OCEAN
    # Ice velocity next
    if [[ $basename = *"2D"* ]]; then
	# Add ice to same file
	savefile=$savedir/${basename}_cardinal_velocity.nc
	echo "Rotating ice velocity from $f. Saving to $savefile" >> $LOGFILE
	bash rotate_velocity.sh \
	     $GRID \
	     $xvel \
	     $yvel \
	     $ICEXVELN \
	     $ICEYVELN \
	     $savefile \
	     $varkeep \
	     $TYPE_ICE
    fi
    # Modify global attributes
    ncatted -h \
	    -a comment,global,o,c,"${COMMENT}" \
	    $savefile
    for att in $ATTS_TO_REMOVE; do
	ncatted -h -a $att,global,d,, $savefile
    done
done
