import React from 'react';

export default class Scale extends React.Component {
    constructor(props) {
        super(props)

    }


    render () {

        return (
            <div className='scale_container'>
                <div className='scale_header'>
                    {this.props.title}
                </div>
                <div className='input_container'>
                <input
                    onChange={(e) => {this.props.onChange(this.props.minID, e.target.value)}}
                    className='scale'
                    id={this.props.minID}
                    value={this.props.min}
                    placeholder='min'
                ></input>
                <input
                    onChange={(e) => {this.props.onChange(this.props.maxID, e.target.value)}}
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