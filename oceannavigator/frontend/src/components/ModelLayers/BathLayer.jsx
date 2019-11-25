import React from 'react';

export default class BathLayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            surface: {
                data: [],
                type: 'surface'
            }
        }

        this.get_bathymetry = this.get_bathymetry.bind(this);
    }


    componentDidMount() {
        
        let idx = this.props.addDataLayer(this.state.surface);
        this.setState({
            layerIDX: idx
        })
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
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.props.urlFromQuery('/api/v1.0/data/bathymetry/', query),
            success: function(result) {
                console.warn("STATE: ", this.state);
                let layer = self.state.surface;
                layer.data = result;
                self.setState({
                    data: result,
                    surface: layer
                }, () => self.props.updateDataLayer(self.state.layerIDX, layer))
            },
            fail: function(xhr, textStatus, errorThrown) {
                alert('request failed')
            }
        })
    }

    render() {
        return (
            null
        )
    }
}