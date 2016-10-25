import React from 'react';
import {Nav, NavItem} from 'react-bootstrap';
import PlotImage from './PlotImage.jsx';
import ComboBox from './ComboBox.jsx';
import SelectBox from './SelectBox.jsx';

class Class4Window extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            forecast: 'best',
            showmap: true,
            climatology: false,
            error: 'none',
        }

        if (props.init != null) {
            $.extend(this.state, props.init);
        }
    }

    onLocalUpdate(key, value) {
        var newState = {};
        newState[key] = value;
        this.setState(newState);
    }

    render() {
        var plot_query = {
            type: 'class4',
            forecast: this.state.forecast,
            class4id: this.props.class4id,
            showmap: this.state.showmap,
            climatology: this.state.climatology,
            error: this.state.error,
        };
        var error_options = [
            {
                id: 'none',
                value: 'None',
            },
            {
                id: 'observation',
                value: 'Value - Observation',
            },
            {
                id: 'climatology',
                value: 'Value - Climatology',
            },
        ]

        return (
            <div className='Class4Window Window'>
                <div className='content'>
                    <div className='inputs'>
                        <ComboBox key='forecast' id='forecast' state={this.state.forecast} def='' url={'/api/class4/forecasts/' + this.props.class4id} title='Forecast' onUpdate={this.onLocalUpdate.bind(this)} />
                        <SelectBox key='showmap' id='showmap' state={this.state.showmap} onUpdate={this.onLocalUpdate.bind(this)} title='Show Location'>Shows the mini map of the location in the plot.</SelectBox>
                        <SelectBox key='climatology' id='climatology' state={this.state.climatology} onUpdate={this.onLocalUpdate.bind(this)} title='Show Climatology'>Shows the climatology data.</SelectBox>
                        <ComboBox key='error' id='error' state={this.state.error} def='' data={error_options} title='Show Error' onUpdate={this.onLocalUpdate.bind(this)} />
                    </div>
                    <PlotImage query={plot_query} permlink={this.props.generatePermLink(this.state)}/>
                    <br className='clear' />
                </div>
            </div>
        );
    }
}

export default Class4Window;
