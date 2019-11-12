import React from 'react';

export default class Scale extends React.Component {
    constructor(props) {
        super(props)

        this.updateScale = this.updateScale.bind(this);
    }

    updateScale(e) {
        console.warn("E: ", e)
    }


    render () {

        return (
            <div className='scale_container'>
                <div className='scale_header'>
                    {this.props.title}
                </div>
                <div className='input_container'>
                <input
                    onChange={this.updateScale}
                    className='scale'
                    id={this.props.minID}
                    value={this.props.min}
                    placeholder='min'
                ></input>
                <input
                    onChange={(e) => {console.warn(e)}}
                    className='scale'
                    id={this.props.maxID}
                    value={this.props.max}
                    placeholder='max'
                ></input>
                </div>
            </div>            
        )
    }
}