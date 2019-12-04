import React from 'react';

export default class BathLayer extends React.Component {
    constructor(props) {
        super(props);

        this.surface_lock = false;

        this.state = {
            data: [],
            surface: undefined
        }

        this.get_bathymetry = this.get_bathymetry.bind(this);
    }


    componentDidMount() {
        
        /*let idx = this.props.addDataLayer(this.state.surface);
        this.setState({
            layerIDX: idx
        })*/
        this.get_bathymetry();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.lat !== this.props.lat || prevProps.lon !== this.props.lon) {
            while (this.surface_lock) {
                console.warn("LOCKED - LAT/LON")
            }
            this.surface_lock = true;
            
            let old = this.state.surface;
            let layer = this.state.surface;
            if (old === undefined) {
                console.warn("UNDEFINED - LAT/LON")
                layer = {
                    z: [],
                    type: 'surface',
                    colorscale: 'Earth',
                    colorbar={"len": 1, "x":-0.1}
                }
            }
            layer = jQuery.extend({}, layer);
            layer.x = this.props.lon;
            layer.y = this.props.lat;
            
            this.setState({
                surface: layer
            }, () => this.surface_lock = false)
            this.props.updateDataLayer(old, layer)
        }
    }

    get_bathymetry() {
        let query = {
            area: this.props.area,
            interp: this.props.interp,
            neighbours: this.props.neighbours,
            projection: this.props.projection,
            radius: this.props.radius
        }
        let self = this
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.props.urlFromQuery('/api/v1.0/data/bathymetry/', query),
            success: function(result) {
                while ( this.surface_lock) {
                    console.warn("LOCKED - BATH")
                }
                this.surface_lock = true;
                let old = self.state.surface;
                let layer = self.state.surface;
                if (old === undefined) {
                    console.warn("UNDEFINED")
                    layer = {
                        z: [],
                        type: 'surface',
                        colorscale: 'Earth',
                        colorbar={"len": 1, "x":-0.1}
                    }
                }
                layer = jQuery.extend({}, layer);
                layer.z = result;
                self.setState({
                    data: result,
                    surface: layer
                }, () => this.surface_lock = false)
                self.props.updateDataLayer(old, layer);
            }
        })
    }

    render() {
        return (
            null
        )
    }
}