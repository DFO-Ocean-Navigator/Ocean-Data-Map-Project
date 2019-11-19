import React from 'react';

const stringify = require("fast-stable-stringify");

export default class Model_3D extends React.Component {
    constructor (props) {
        super(props)

        this.state = {
            next_query: {
                "area": this.props.area,
                "datasets": {},
                "interp": this.props.interp,
                "neighbours": this.props.neighbours,
                "projection": this.props.projection,
                "radius": this.props.radius,
                "time": this.props.time,
            }
        }
    
        this.urlFromStateQuery = this.urlFromStateQuery.bind(this);
    }

    componentDidMount() {
        this.loadNextPlot();
    }

    loadNextPlot() {
        this.setState({
            query: this.state.next_query,
            url: this.urlFromStateQuery(this.state.next_query)
        })
    }

    urlFromStateQuery(query) {
        return "/api/v1.0/3d_model/?query=" + encodeURIComponent(stringify(query));
    }

    render() {

        // Create all the components individually that need to be added to panels
        // ADD LATER

        // Create Arrays holding all the components to each panel
        // ADD LATER

        // Create the panels if their associated arrays are not of length 0
        // ADD LATER

        // Load Plot to render

        let plot = <iframe src={this.state.url} frameBorder="0" style={{width: '100%', height:'100%'}}></iframe>

        return (
            
            <div style={{height: '100%'}}>
                {plot}
            </div>
        )
    }
}