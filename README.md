# Ocean Navigator

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/13f9b6c4f4b343e78806c82ee0ffce34)](https://www.codacy.com/project/oceandatamap/Ocean-Data-Map-Project/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=DFO-Ocean-Navigator/Ocean-Data-Map-Project&amp;utm_campaign=Badge_Grade_Dashboard)
[![CodeFactor](https://www.codefactor.io/repository/github/dfo-ocean-navigator/ocean-data-map-project/badge)](https://www.codefactor.io/repository/github/dfo-ocean-navigator/ocean-data-map-project)

## Contents
* Overview
* Development

---

## Overview

Ocean Navigator is a Data Visualization tool that enables users to discover and view 3D ocean model output quickly and easily.

The model outputs are stored as [NetCDF4](https://en.wikipedia.org/wiki/NetCDF) files. Our file management is now handled by an SQLite3 process that incrementally scans the files for a dataset, and updates a corresponding table so that the Python layer can only open the exact files required to perform computations; as opposed to the THREDDS aggregation approach which serves all the files in a dataset as a single netcdf file. The THREDDS approach was unable to scale to the sheer size of the datasets we deal with.

The server-side component of the Ocean Navigator is written in Python 3, using the Flask web API. Conceptually, it is broken down into three components:

-	Query Server

	This portion returns metadata about the selected dataset in JSON format. These queries include things like the list of variables in the dataset, the times covered, the list of depths for that dataset, etc.

	The other queries include things such as predefined areas (NAFO divisions, EBSAs, etc), and ocean drifter paths. The drifter paths are loaded from NetCDF files, but all the other queries are loaded from KML files.

-	Plotting

	This portion generates an image plot, which could be a map with surface fields (or fields at a particular depth), a transect through a defined part of the ocean, depth profiles of one or more points, etc. We use the matplotlib python module to generate the plots.

	Because the model grid rarely lines up with the map projection, and profiles and transects don't necessarily fall on model grid points, we employ some regridding and interpolation to generate these plots. For example, for a map plot, we select all the model points that fall within the area, plus some extra around the edges and regrid to a 500x500 grid that is evenly spaced over the projection area. An added benefit of this regridding is that we can directly compare across models with different grids. This allows us to calculate anomalies on the fly by comparing the model to a climatology. In theory, this would also allow for computing derived outputs from variables in different datasets with different native grids.

-	Tile Server

	This portion is really a special case of the plotting component. The tile server serves 256x256 pixel tiles at different resolutions and projections that can be used by the OpenLayers web mapping API. This portion doesn't use matplotlib, as the tiles don't have axis labels, titles, legends, etc. The same style of interpolation/regridding is done to generate the data for the images.

	The generated tiles are cached to disk after they are generated the first time, this allows the user request to bypass accessing the NetCDF files entirely on subsequent requests.

The user interface is written in Javascript using the React framework. This allows for a single-page, responsive application that offloads as much processing from the server onto the user's browser as possible. For example, if the user chooses to load points from a CSV file, the file is parsed in the browser and only necessary parts of the result are sent back to the server for plotting.

The main display uses the OpenLayers mapping API to allow the user to pan around the globe to find the area of interest. It also allows the user to pick an individual point to get more information about, draw a transect on the map, or draw a polygon to extract a map or statistics for an area.

---

## Development

### Local Installation
Run this one-shot-install script:
[https://github.com/DFO-Ocean-Navigator/Navigator-Installer/blob/master/Installer_Linux.sh](https://github.com/DFO-Ocean-Navigator/Navigator-Installer/blob/master/Installer_Linux.sh)

* While altering Javascript code, it can be actively transpiled using:
	* `cd oceannavigator/frontend`
	* `yarn run dev`
* There's also a linter available: `yarn run lint`.

### SQLite3 backend
Since we're now using a home-grown indexing solution, as such there is now no "server" to host the files through a URL (at the moment). You also need to install the dependencies for the [netcdf indexing tool](https://github.com/DFO-Ocean-Navigator/netcdf-timestamp-mapper). Then, download a released binary for Linux systems [here](https://github.com/DFO-Ocean-Navigator/netcdf-timestamp-mapper/releases). You should go through the README for basic setup and usage details.

The workflow to import new datasets into the Navigator has also changed:
1. Run the indexing tool linked above.
2. Modify `datasetconfig.json` so that the `url` attribute points to the absolute path of the generated `.sqlite3` database.
3. Restart web server.

### Running the webserver
Assuming the above installation script succeeded, your PATH should be set to point towards `/opt/tools/miniconda3/bin`, and the `navigator` conda environment has been activated.
* Debug server (single-threaded):
	* `python runserver.py`
* Multi-threaded (via gUnicorn):
	* `./runserver.sh`

### Coding Style (Javascript)
Javascript is a dynamically-typed language so it's super important to have clear and concise code, that demonstrates it's exact purpose.

* Comment any code whose intention may not be self-evident (safer to have more comments than none at all).
* Use `var`, `let`, and `const` when identifying variables appropriately:
	* `var`: scoped to the nearest function block. Modern ES6/Javascript doesn't really use this anymore because it usually leads to scoping conflicts. However, `var` allows re-declaration of a variable.
	* `let`: new keyword introduced to ES6 standard which is scoped to the *nearest block*. It's very useful when using `for()` loops (and similar), so don't predefine loop variable:

		* Bad:
			```
				myfunc() {
					var i;
					...
					// Some code
					...
					for (i = 0; i < something; ++i) {

					}
				}
			```
		* Good:
			```
				myFunc() {
					...
					// Some code
					...
					for (let i = 0; i < something; ++i) {

					}
				}
			```
		
		Keep in mind that `let` *does not* allow re-declaration of a variable.

	* `const`: functionally identical to the `let` keyword, however disallows variable re-assignment. Just like const-correctness in C++, `const` is a great candidate for most variable declarations, as it immediately states that "I am not being changed". This leads to the next rule.
* Use `const` when declaring l-values with `require()`. Example:
	```
		const LOADING_IMAGE = require("../images/bar_loader.gif");
	```
* Unless using `for` loops, *DO NOT* use single-letter variables! It's an extreme nuisance for other programmers to understand the intention of the code if functions are littered with variables like: `s`, `t`, etc. Slightly more verbose code that is extremely clear will result in a much lower risk for bugs.
	* Bad:
		```
			$.when(var_promise, time_promise).done(function(v, t) {
				// Some code
				...
			}
		```
	* Good:
		```
			$.when(var_promise, time_promise).done(function(variable, time) {
				// Some code
				...
			}

		```
* Try to avoid massive `if` chains. Obviously the most important thing is to get a feature/bugfix working. However if it results in a whole bunch of nested `if` statements, or `if`-`for`-`if`-`else`, etc., try to take that working result and incorporate perhaps a `switch`, or hashtable to make your solution cleaner, and more performant. If it's unavoidable, a well-placed comment would reduce the likelihood of a fellow developer trying to optimize it.

### Coding Style (Python)
Coming soon...
