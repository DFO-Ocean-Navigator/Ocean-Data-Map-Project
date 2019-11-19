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
    
        this.urlFromStateQuery = this.urlFromStateQuery.bind(this);
    }

    urlFromStateQuery() {
        return "/api/v1.0/3d_model/?query=" + encodeURIComponent(stringify(this.state.test_query));
    }

    render() {

        // Create all the components individually that need to be added to panels
        // ADD LATER

        // Create Arrays holding all the components to each panel
        // ADD LATER

        // Create the panels if their associated arrays are not of length 0
        // ADD LATER

        // Load Plot to render

        let plot = <iframe src={this.urlFromStateQuery()} frameborder="0"></iframe>

        return (
            <div>
                {plot}
            </div>
        )
    }
}