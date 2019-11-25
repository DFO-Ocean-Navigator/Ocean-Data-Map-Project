import React from 'react';

export default class BathLayer extends React.Component {
    constructor(props) {
        super(props);

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

    get_bathymetry() {
        let query = {
            area: this.props.area,
            interp: this.props.interp,
            neighbours: this.props.neighbours,
            projection: this.props.projection,
            radius: this.props.radius
        }
        let self = this
        let lock = False
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.props.urlFromQuery('/api/v1.0/data/bathymetry/', query),
            success: function(result) {
                console.warn("STATE: ", this.state);
                while (lock) {

                }
                lock = true;
                let old = self.state.surface;
                let layer = self.state.surface;
                if (old === undefined) {
                    layer = {
                        z: [],
                        type: 'surface',
                        colorscale: 'Earth',
                    }
                }
                layer = jQuery.extend({}, layer);
                layer.z = result;
                self.setState({
                    data: result,
                    surface: layer
                }, lock = false)
                self.props.updateDataLayer(old, layer)
            }
        })

        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.props.urlFromQuery('/api/v1.0/data/latlon/', query),
            success: function(result) {
                while (lock) {

                }
                lock = true;
                console.warn("STATE: ", this.state);
                let old = self.state.surface;
                let layer = self.state.surface;
                if (old === undefined) {
                    layer = {
                        z: [],
                        type: 'surface',
                        colormap: 'Earth',
                    }
                }
                layer = jQuery.extend({}, layer);
                layer.x = result[0];
                layer.y = result
                self.setState({
                    data: result,
                    surface: layer
                }, () => lock = false)
                
                self.props.updateDataLayer(old, layer)
            }
        })

        
    }

    render() {
        return (
            null
        )
    }
}