
# Overview
- Tool build to test and profile various API endpoints of the Ocean Navigator. 
- Highly configurable
- Can be run directly with python or through the bash script. This allows users to easily modify inputs as needed and schedule regular profiling.
- 
  

# Running the Profiling Driver

  

# Creating a Configuration File

  
## Example Test Configurations

### Profile Plot
```
"profile_plot" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "day"
		},
		"dataset_2" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "hour"
		}
	},
	"station" : [[latitude, longitude]]
}
```

### Virtual Mooring Plot
```
"vm_plot" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "day",
			"n_timestamps" : 10
		},
		"dataset_2" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "hour",
			"n_timestamps" : 10
		},
	},
	"station" : [[45,-45]]
}
```

### Transect Plot
```
"transect_plot" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "day",
			"name" : "Some Name",
			"path" : [[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]
		},
		"dataset_2" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "hour",
			"name" : "Some Name",
			"path" : [[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]
		}
	}
},
```

### Hovmöller Plot
```
"hovmoller_plot" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "day",
			"n_timestamps" : X,
			"name" : "Some Name",
			"path" : [[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]
		},
		"dataset_2" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "hour",
			"n_timestamps" : X,
			"name" : "Some Name",
			"path" : [[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]
		}
	}
},
```

### Area Plot
```
"area_plot" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "day",
			"polygons" : [[[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]],
			"quiver_variable" : "variable_1"
		},
		"dataset_2" : {
			"variables" : ["variable_1", "variable_2", "variable_3", ...],
			"quantum" : "hour",
			"polygons" : [[[lat_1, lon_1], [lat_2, lon_2], [lat_3, lon_3], ...]],
			"quiver_variable" : "variable_1"
		}
	}
}
```

### Area Subset
```
"area_subset" : {
	"datasets" : {
		"dataset_1" : {
			"variables" : ["variable_1"],
			"quantum" : "day",
			"max_range" : "lat_1, lon_1",
			"min_range" : "lat_2, lon_2",
		},
		"dataset_2" : {
			"variables" : ["variable_1"],
			"quantum" : "hour",
			"max_range" : "lat_1, lon_1",
			"min_range" : "lat_2, lon_2",
		}
	}
},
```
### Observation Plot
```
"obs_plot" : {
	"obs_id" : [[observation_id_1],
		[observation_id_2],
		[observation_id_3],
		[observation_id_4],
		[observation_id_5]]
	},
```

### Class4 Plot
```
"class4_plot" : {
	"class4id" : ["class4_id_1",
		"class4_id_2",
		"class4_id_3",
		"class4_id_4",
		"class4_id_5"]
	}
}
```