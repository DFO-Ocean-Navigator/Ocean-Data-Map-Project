# Ocean Navigator

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/13f9b6c4f4b343e78806c82ee0ffce34)](https://www.codacy.com/project/oceandatamap/Ocean-Data-Map-Project/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=DFO-Ocean-Navigator/Ocean-Data-Map-Project&amp;utm_campaign=Badge_Grade_Dashboard)
[![CodeFactor](https://www.codefactor.io/repository/github/dfo-ocean-navigator/ocean-data-map-project/badge)](https://www.codefactor.io/repository/github/dfo-ocean-navigator/ocean-data-map-project)

## Contents
* Overview
* Development

---

## Overview

Ocean Navigator is a Data Visualization tool that enables users to discover and view 3D ocean model output quickly and easily.

The ocean model output is stored in [NetCDF](https://en.wikipedia.org/wiki/NetCDF) files. These files are self-describing and contain the 2D or 3D model output for one or more timesteps and one or more variables.

To facilitate reading all these files, we make use of a server called [THREDDS Data Server](http://www.unidata.ucar.edu/software/thredds/current/tds/). THREDDS aggregates all the NetCDF files and allows users to query subsets of the files.

The server-side component of the Ocean Navigator is written in Python, using the Flask web API. Conceptually, it is broken down into three components:

-	Query Server

	This portion returns metadata about the selected dataset in JSON format. These queries include things like the list of variables in the dataset, the times covered, the list of depths for that dataset, etc.

	These queries are generally fast as this data is cached in the THREDDS server, avoiding the need to scan through the NetCDF files.

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

These development notes were created after the primary individiual left this project, so please feel free to suggest new standards that improve code reliability, stability, etc. Also, most of the codebase doesn't reflect these decisions, so a good task would be to bring all the code up to scratch.

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

### Setting up the Javascript environment
* Run the following commands to install NodeJS:
	* `sudo	apt	install	python-software-properties curl`
	* `curl	-sL	https://deb.nodesource.com/setup_4.x | sudo	-E bash -`
	* `sudo	apt install	nodejs`
	* `sudo npm install -g bower`
	* `sudo npm install -g npm@next`
	* `cd oceannavigator/frontend`
	* `npm install`
* While altering Javascript code, it can be actively transpiled using:
	* `cd oceannavigator/frontend`
	* `npm run dev`

### Running the webserver
* To run the debug server, execute:
	* `sudo /opt/tools/anaconda2/bin/python runserver.py`
