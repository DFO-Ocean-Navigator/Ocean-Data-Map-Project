import React from 'react';

export default class BathLayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: []
        }
    }


    componentDidMount() {
        this.createSurface();
        this.get_bathymetry();
        let idx = this.props.addDataLayer(this.state.surface);
        this.setState({
            layerIDX: idx
        })
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
                if (self.layerData !== undefined) {

                    let layer = self.surface;
                    layer.data = result;
                    self.setState({
                        data: result,
                        surface: layer
                    })
                    this.props.updateDataLayer(this.state.layerIDX, layer);
                }
                
            },
            fail: function(xhr, textStatus, errorThrown) {
                alert('request failed')
            }
        })
    }

    createSurface() {
        let surface = {
            data: this.state.data,
            type: 'Surface'
        }

        this.setState({
            surface: surface
        })
    }

    render() {
        return (
            null
        )
    }
}