#!/bin/bash

# Array of JavaScript files to run
js_files=(
  "areaConfig.js"
  "lineConfig.js"
  "pointConfig.js"
  "observationConfig.js"
  "compairDatasetConfig.js"
)

# Loop through each file and run with xvfb-run
for file in "${js_files[@]}"; do
  echo "Running $file..."
  xvfb-run -a node "$file"
  if [ $? -ne 0 ]; then
    echo "Error running $file"
    exit 1
  fi
  echo "$file completed successfully"
done

echo "All files executed successfully"
