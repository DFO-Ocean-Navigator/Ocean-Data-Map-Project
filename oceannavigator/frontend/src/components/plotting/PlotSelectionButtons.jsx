import React from 'react';
import SelectPlot from './SelectPlot.jsx';

export default class PlotSelectionButtons extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            currentButton: undefined,
        }
    }



    render() {
        let availablePlots = [];
        console.warn("BUTTON NAMES: ", this.props.buttonNames)
        for (let name in this.props.buttonNames) {
            availablePlots.push(
                <SelectPlot
                    name={this.props.buttonNames[name].id}
                    state={this.props.buttonNames[name].state}
                    disabled={this.props.buttonNames[name].disabled}
                    toggle={this.props.toggle}
                ></SelectPlot>
            )
        }


        return (
            <div>
                {availablePlots}
            </div>
        )
    }
}