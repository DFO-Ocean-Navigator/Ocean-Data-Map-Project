import React from 'react';

const stringify = require("fast-stable-stringify");

export default class Model_3D extends React.Component {
    constructor (props) {
        super(props)

        this.state = {
            test_query: {
                "area":[{
                    "innerrings":[],
                    "name":"",
                    "polygons":[[[56.243349924105246,-45.3618621826172],[56.292156685076435,-33.5405731201172],[51.944264879028765,-33.4526824951172],[51.835777520452496,-45.317916870117195],[56.243349924105246,-45.3618621826172]]]
                }],
                "datasets": {
                    'giops_day': {
                        "quantum": "day",
                        'variables': {
                            'soniclayerdepth': {
                                'colormap': 'default',
                                'scale': 'default'
                            },
                            'criticaldepth': {
                                'colormap': 'default',
                                'scale': 'default'
                            }
                        }
                    }
                },
                "interp":"gaussian",
                "neighbours":10,
                "projection":"EPSG:3857",
                "radius":25,
                "time":2204928000,
            }

        }
    
        this.urlFromQuery = this.urlFromQuery.bind(this);
    }

    urlFromQuery(query) {
        return "/api/v1.0/plot/?query=" + encodeURIComponent(stringify(query));
    }

    render() {

        // Create all the components individually that need to be added to panels


        // Create Arrays holding all the components to each panel


        // Create the panels if their associated arrays are not of length 0

        return (
            <div>
                THERE'S NOTHING HERE, HOW REFRESHING
            </div>
        )
    }
}