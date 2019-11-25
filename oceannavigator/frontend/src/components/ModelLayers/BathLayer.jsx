import React from 'react';

export default class BathLayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            surface: {
                z: [],
                type: 'surface'
            }
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
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: this.props.urlFromQuery('/api/v1.0/data/bathymetry/', query),
            success: function(result) {
                console.warn("STATE: ", this.state);
                let layer = $.extend({}, self.state.surface);
                layer.z = result;
                self.setState({
                    data: result,
                    surface: layer
                })
                let idx = self.props.updateDataLayer(self.state.layerIDX, layer)
                if (idx !== undefined) {
                    self.setState({
                        layerIDX: idx
                    })
                }
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