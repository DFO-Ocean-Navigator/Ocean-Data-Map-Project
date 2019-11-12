import React from 'react';

export default class Scale extends React.Component {
    constructor(props) {
        super(props)
    }

    render () {

        return (
            <div>
                {this.props.title}
                <input
                    onChange={this.updateScale}
                    id={this.props.minID}
                    value={this.props.min}
                    placeholder='min'
                ></input>
                <input
                    onChange={this.updateScale}
                    id={this.props.maxID}
                    value={this.props.max}
                    placeholder='max'
                ></input>
            </div>            
        )
    }
}