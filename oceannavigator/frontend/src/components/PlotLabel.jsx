import React from 'react'

export default class PlotLabel extends React.Component {
    constructor(props) {
        super(props);
    }

    render () {
        return (
            <div className='scale_container'>
                <div className='scale_header'>
                    {this.props.title}
                </div>
                <div className='input_container'>
                    <input
                        onChange={(e) => {this.props.onChange(this.props.labelID, e.target.value)}}
                        className='scale'
                        id={this.props.labelID}
                        value={this.props.value}
                        placeholder={this.props.title}
                    ></input>
                </div>
            </div>
        )
    }
}