import React from 'react';
import { Button } from 'react-bootstrap';

const i18n = require("../../i18n.js");

export default class PlotSelectionBar extends React.Component {
    constructor ( props ) {
        super ( props );

    }

    render () {
        return (
            <div>
                 {/*Returns long button with right aligned arrow*/}
                <Button
                    className='PlotSelectionBar'
                    onClick={() => {this.props.togglePlotSelection(!this.props.currentState)}}
                >{_("Select Plot")}</Button>
                <Button
                    className='PlotClose'
                    onClick={this.props.closeModal}
                ></Button>

            </div>
            )
    }
}