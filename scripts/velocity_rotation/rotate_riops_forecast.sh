# Script to rotate riops forecast files
# Can subsitude for riops_daily and monthly where approriate
# Nancy Soontiens, March 2018
# Usage: bash rotate_riops_forecast.sh YYYYMM LOGFILE

SCRIPTNAME=`realpath $0`
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


OUT=/data/hdd/riops/riopsf/rotated
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
    ncatted -h \
	    -a comment,global,o,c,"created with script ${SCRIPTNAME}" \
	    $savefile
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
	ncatted -h \
		-a comment,global,o,c,"created with script ${SCRIPTNAME}" \
		$savefile
    fi
done
