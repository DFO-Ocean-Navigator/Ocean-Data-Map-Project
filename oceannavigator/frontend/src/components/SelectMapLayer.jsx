import React from 'react';


export default class SelectMapLayer extends React.Component {
    constructor (props) {
        super (props)
    }

    render () {

        let buttons = undefined;


        console.warn("MAP: ", this.props.map)
        if (this.props.map !== undefined) {
            let layers = this.props.map.getLayers();
            console.warn("LAYERS: ", layers)
            for (let x in layers) {
                console.warn("X: ", x);
            }
        }
        

        return (
            <div>
                Unfortunately multi-layer plotting is not currently available.
                Please select a layer before continuing:
                {buttons}
            </div>
        )
    }
}