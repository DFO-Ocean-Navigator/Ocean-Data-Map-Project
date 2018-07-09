# Script to rotate velocities to cardinal directions (East/North)
# Note: The velocities MUST be unstaggeted so that xvel/yvel are in the same location, that is unstaggered to the T grid.
# The angle in angle_file represents the angle between x gridlines on T grid and East (degrees CCW from E)

# Usage: bash rotate_velocities.sh angle_file xvel_file yvel_file xvel_name yvel_name outfile varkeep vector_type
# angle_file - netcdf file with rotation angle (variables cos_alpha, sin_alpha)
# xvel_file - netcdf file with model x velocity
# yvel_file - netcdf file with model y velocity
# outfile - name of file for saving output
# varkeep - list of variables to keep in new file (typically coordinates)
# attributes_to_delete - list of arrtributes to delete
# Author: Nancy Soontiens, March 2018

SCRIPTNAME=$0
# Array of vector pairs - x vector name,y vector name,type
# All possible pairs should be listed jere
VECTOR_PAIRS=("vozocrtx vomecrty ocean"
	      "itzocrtx itmecrty ice"
	      "iicevelu iicevelv ice"
	      "sozotaux sometauy windstress"
	      "u_wind v_wind wind"
	      "vozo_unstag vome_unstag ocean"
	      "sozo_unstag some_unstag windstress"
	      "iocestru iocestrv icewindstress"
	      "iicestru iicestrv airicestress"
	     )	  
COMMENT="DERIVED PRODUCT - created with script ${SCRIPTNAME}"

grid=$1
xvel_file=$2
yvel_file=$3
outfile=$4
varkeep=$5
attributes_to_remove=$6

echo "Rotating $xvel_file. Saving in $outfile."

for vector in "${VECTOR_PAIRS[@]}"; do 
  a=( $vector )
  xvel_name=${a[0]}
  yvel_name=${a[1]}
  vector_type=${a[2]}
  # Check that vector pair is present
  varx=$(ncdump -h $xvel_file)
  if grep -q $xvel_name <<< "$varx"; then
    echo "Rotating $vector_type: $xvel_name, $yvel_name"
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
    elif [[ "${vector_type}" = "windstress" ]]; then
	east="wind_stress_east"
	north="wind_stress_north"
	comment="wind stress"
    elif [[ "${vector_type}" = "icewindstress" ]]; then
	east="iwind_stress_east"
	north="iwind_stress_north"
	comment="ice model wind stress"
    elif [[ "${vector_type}" = "airicestress" ]]; then
	east="air_ice_stress_east"
	north="air_ice_stress_north"
	comment="air ice stress"
    else
      echo "Invalid vector_type ${vector_type}. Choose from windstress, wind, ice, ocean"
      exit
    fi
    # Add rotated velocities to list of variables to keep
    keep="${varkeep},${east},${north}"
    # Save to temporary file for now, append later
    dirname=$(dirname $outfile)
    basename=$(basename $outfile)
    tmp_file=$dirname/tmp_$basename
    cp $xvel_file $tmp_file
    # Append yvel_file if needed
    if [ "${xvel_file}" != "${yvel_file}" ]; then
      ncks -h -A $yvel_file $tmp_file
    fi
    # Check that vectors have _FillValue, if not create from missing_value
    vars=$(ncdump -h $tmp_file)
    if grep -q "${xvel_name}:_FillValue" <<< "${vars}"; then
      echo "_FillValue identified for ${xvel_name}."
    else
      echo "No _FillValue for ${xvel_name}. Substituting with missing_value."
      fillx=$(grep -Po "${xvel_name}:missing_value = \K.*(?=f ;)" <<< "${vars}") 
      ncatted -h -a _FillValue,${xvel_name},o,f,$fillx $tmp_file
    fi
    if grep -q "${yvel_name}:_FillValue" <<< "${vars}"; then
      echo "_FillValue identified for ${yvel_name}"
    else
      echo "No _FillValue for ${yvel_name}. Substituting with missing_value."
      filly=$(grep -Po "${yvel_name}:missing_value = \K.*(?=f ;)" <<< "${vars}")
      ncatted -h -a _FillValue,${yvel_name},o,f,$filly $tmp_file
    fi
    # Start rotation
    ncks -h -A -v sin_alpha,cos_alpha $grid $tmp_file
    ncap2 -h \
          -s "${east}=${xvel_name}*cos_alpha-${yvel_name}*sin_alpha" \
          -s "${north}=${xvel_name}*sin_alpha + ${yvel_name}*cos_alpha" \
          -O $tmp_file $tmp_file
    ncks -O -h -v $keep $tmp_file $tmp_file
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
  fi
done

if [[ -e $outfile ]]; then
   # Deflation
   ncks -4 -L4 -O $outfile $outfile
   # Modify global attributes
   ncatted -h -a comment,global,o,c,"${COMMENT}" $outfile
   for att in $attributes_to_remove; do
       ncatted -h -a $att,global,d,, $outfile
   done
fi
