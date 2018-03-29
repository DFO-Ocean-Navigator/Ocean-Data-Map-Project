# Script to rotate velocities to cardinal directions (East/North)
# Note: The velocities MUST be unstaggeted so that xvel/yvel are in the same location, that is unstaggered to the T grid.
# The angle in angle_file represents the angle between x gridlines on T grid and East (degrees CCW from E)

# Usage: bash rotate_velocities.sh angle_file xvel_file yvel_file xvel_name yvel_name outfile varkeep vector_type
# angle_file - netcdf file with rotation angle (variables cos_alpha, sin_alpha)
# xvel_file - netcdf file with model x velocity
# yvel_file - netcdf file with model y velocity
# xvel_name - name of model x velocity in xvel_file
# yvel_name - name of model y velocity in yvel_file
# outfile - name of file for saving output
# varkeep - list of variables to keep in new file (typically coordinates)
# vector_type - type of vector to rotate (ocean, ice, or wind)

# Author: Nancy Soontiens, March 2018

grid=$1
xvel_file=$2
yvel_file=$3
xvel_name=$4
yvel_name=$5
outfile=$6
varkeep=$7
vector_type=$8

# Create new vairables names based on vector_type
if [[ "${vector_type}" = "ocean" ]]; then
    east="east_vel"
    north="north_vel"
    comment="ocean current"
elif [[ "${vector_type}" = "ice" ]]; then
    east="ice_east_vel"
    north="ice_north_vel"
    comment="ice velocity"
elif [[ "${vector_type}" = "wind" ]]; then
    east="wind_east_vel"
    north="wind_north_vel"
    comment="wind"
else
    echo "Invalid vector_type ${vector_type}. Choose from wind, ice, ocean"
    exit
fi

# Add rotated velocities to list of variables to keep
varkeep="${varkeep},${east},${north}"

# Save to temporary file for now, append later
dirname=$(dirname $outfile)
basename=$(basename $outfile)
tmp_file=$dirname/tmp_$basename

cp $xvel_file $tmp_file
if [ "${xvel_file}" != "${yvel_file}" ]; then
  ncks -h -A $yvel_file $tmp_file
fi
ncks -h -A -v sin_alpha,cos_alpha $grid $tmp_file
ncap2 -h \
      -s "${east}=${xvel_name}*cos_alpha-${yvel_name}*sin_alpha" \
      -s "${north}=${xvel_name}*sin_alpha + ${yvel_name}*cos_alpha" \
      -O $tmp_file $tmp_file
ncks -O -h -v $varkeep $tmp_file $tmp_file
# Update metadeta
ncatted -O -h \
	-a long_name,${east},o,c,"${comment} in eastward direction" \
	-a standard_name,${east},o,c,"${comment} eastward" \
	-a short_name,${east},o,c,"${east}" \
	-a long_name,${north},o,c,"${comment} in northward direction" \
	-a standard_name,${north},o,c,"${comment} northward" \
	-a short_name,${north},o,c,"${north}"\
	$tmp_file
# Append to previous file if it exists
if [[ -e $outfile ]]; then
    ncks -h -A $tmp_file $outfile
    rm -f $tmp_file
else
    mv $tmp_file $outfile
fi    
# Deflation
ncks -4 -L4 -O $outfile $outfile
