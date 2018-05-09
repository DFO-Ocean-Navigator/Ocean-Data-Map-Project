# Script to rotate glorys V4 climatology files
# The procedure is much different from the others because the velocities must
# be unstaggered first.
# Nancy Soontiens, March 2018

#Usage: bash rotate_glorys_climatology.sh LOGFILE

# Read arguments
LOGFILE=$1

# GLORYS specific variables and directories
GRID=/data/hdd/grids/glorys/grid_angle_V4.nc
VARKEEP="nav_lon,nav_lat"
XVELN=vozocrtx
YVELN=vomecrty
XSTRN=sozotaux
YSTRN=sometauy

ATTS_TO_REMOVE="history history_of_appended_files"

# Unstaggering
U_UNSTAG_SCRIPT=glorys_unstag.in.U
V_UNSTAG_SCRIPT=glorys_unstag.in.V
USTR_UNSTAG_SCRIPT=glorys_unstag.in.Ustress
VSTR_UNSTAG_SCRIPT=glorys_unstag.in.Vstress
# Unstaggered velocity names as defined in U_UNSTAG_SCRIPT, V_UNSTAG_SCRIPT
XVELN_UNSTAG=vozo_unstag
YVELN_UNSTAG=vome_unstag
XSTRN_UNSTAG=sozo_unstag
YSTRN_UNSTAG=some_unstag
ULAT=nav_lat
VLAT=nav_lat
TLAT=nav_lat
ULON=nav_lon
VLON=nav_lon
TLON=nav_lon

# Directory stucture
OUT=/data/hdd/climatology/glorys/v4/rotated/
FILES=/data/hdd/climatology/glorys/v4/*gridU.nc
ICEFILES=/data/hdd/climatology/glorys/v4/*icemod.nc

# Ocean files first
for Ufile in $FILES; do
    # unstagger first
    tmpdir=$OUT/tmp
    if [[ ! -e $tmpdir ]]; then
	mkdir -p $tmpdir
    fi
    basename=$(basename $Ufile)
    tmpfile_U=$(echo $tmpdir/$basename | sed "s/gridU/unstag_U/")
    tmpfile_V=$(echo $tmpdir/$basename | sed "s/gridU/unstag_V/")
    tmpfile=$(echo $tmpdir/$basename | sed "s/gridU/unstag/")
    Vfile=$(echo $Ufile | sed "s/gridU/gridV/")
    Tfile=$(echo $Ufile | sed "s/gridU/gridT/")
    # unstagger
    ncap2 -h -S $U_UNSTAG_SCRIPT $Ufile $tmpfile_U
    ncap2 -A -h -S $USTR_UNSTAG_SCRIPT $Ufile $tmpfile_U
    ncap2 -h -S $V_UNSTAG_SCRIPT $Vfile $tmpfile_V
    ncap2 -A -h -S $VSTR_UNSTAG_SCRIPT $Vfile $tmpfile_V 
    # Remove coordinates for U/V and replace with coordinates for T
    ncks -h -O -x -v $ULAT,$ULON,$XVELN,$XSTRN $tmpfile_U $tmpfile_U
    ncks -h -A -v $TLAT,$TLON $Tfile $tmpfile_U
    ncks -h -O -x -v $VLAT,$VLON,$YVELN,$YSTRN $tmpfile_V $tmpfile_V
    ncks -h -A -v $TLAT,$TLON $Tfile $tmpfile_V
    # combine u and v files
    mv $tmpfile_U $tmpfile
    ncks -A $tmpfile_V $tmpfile
    rm -f $tmpfile_V
    # update metadata
    ncatted -h \
        -a short_name,$XVELN_UNSTAG,d,, \
	-a short_name,$YVELN_UNSTAG,d,, \
	-a short_name,$XSTRN_UNSTAG,d,, \
	-a short_name,$YSTRN_UNSTAG,d,, \
	$tmpfile
    # Now rotate
    xvel=$tmpfile
    yvel=$tmpfile
    basename=$(basename $xvel .nc)
    basename=$(echo $basename | sed "s/unstag//")
    savefile=$OUT/${basename}cardinal_velocity.nc
    echo "Rotating ocean current in ${Ufile}. Saving in ${savefile}" >> $LOGFILE
    bash rotate_velocity.sh \
	 $GRID \
	 $xvel \
	 $yvel \
	 $savefile \
	 $VARKEEP \
	 "$ATTS_TO_REMOVE"
done
# Ice files next
# NOTE: Assuming that GLORYS needs rotated ice velocities. Metadata on both ice
# velocity and water velocity is confusing.
# Also assuming ice velocity doesn't need to be unstaggered. Same coordinates as
# ice concentration  
for f in $ICEFILES; do
    xvel=$f
    yvel=$f
    basename=$(basename $xvel .nc)
    basename=$(echo $basename | sed "s/icemod//")
    savefile=$OUT/${basename}ice_cardinal_velocity.nc
    echo "Rotating ice velocity in ${f}. Saving in ${savefile}" >> $LOGFILE
    bash rotate_velocity.sh \
	 $GRID \
	 $xvel \
	 $yvel \
	 $savefile \
	 $VARKEEP \
	 "$ATTS_TO_REMOVE"
done

rm -rf $tmpdir
