// This Component is essentially a fancy button
import React from 'react';
import { Button } from 'react-bootstrap';


export default class SelectPlot extends React.Component {
    constructor (props) {
        super (props);
    
        this.toggle = this.toggle.bind(this);
    }

    toggle() {
        console.warn("TOGGLE")
        this.props.toggle()
    }

    render () {

        return (
            <Button
                className='PlotSelect'        
                disabled={this.props.disabled}
                onClick={() => {this.props.toggle(this.props.name, this.props.state)}}
            >{this.props.name}</Button>
        )
    }
}