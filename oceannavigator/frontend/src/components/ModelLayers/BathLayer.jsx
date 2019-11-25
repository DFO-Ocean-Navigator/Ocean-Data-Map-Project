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
        this.props.addDataLayer(this.state.id, this.state.layerData);
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

                    let layerData = self.layerData;
                    layerData.data = result;
                    self.setState({
                        layerData: layerData
                    })
                    this.props.updateDataLayer(this.state.id, layerData);
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
            layerData: surface
        })
    }

    render() {
        return (
            <div>
                
            </div>
        )
    }
}