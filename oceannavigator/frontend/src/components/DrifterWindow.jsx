import React from 'react';
import PlotImage from './PlotImage.jsx';
import ComboBox from './ComboBox.jsx';
import Range from './Range.jsx';
import SelectBox from './SelectBox.jsx';
import NumberBox from './NumberBox.jsx';
import ContinousTimePicker from './ContinousTimePicker.jsx';
import ImageSize from './ImageSize.jsx';

class DrifterWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showmap: true,
            variable: [props.variable],
            latlon: false,
            buoyvariable: ['sst'],
            starttime: null,
            endtime: null,
            size: "10x7",
            dpi: 72,
        }

        if (props.init != null) {
            $.extend(this.state, props.init);
        }
    }

    componentDidMount() {
        $.ajax({
            url: `/api/drifters/time/${this.props.drifter}`,
            dataType: 'json',
            cache: true,
            success: function(data) {
                this.setState({
                    mindate: new Date(data.min),
                    maxdate: new Date(data.max),
                    starttime: new Date(data.min),
                    endtime: new Date(data.max),
                });
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(xhr.url, status, err.toString());
            }.bind(this)
        });
    }

    onLocalUpdate(key, value) {
        var newState = {};
        newState[key] = value;
        this.setState(newState);

        if (key == 'variable_scale' && this.state.variable.length == 1) {
            this.props.onUpdate(key, value);
        }

        if (key == 'variable' && value.length == 1) {
            this.props.onUpdate(key, value[0]);
        }
    }

    render() {
        var dataset = <ComboBox key='dataset' id='dataset' state={this.props.dataset} def='' url='/api/datasets/' title='Dataset' onUpdate={this.props.onUpdate} />;
        var buoyvariable = <ComboBox key='buoyvariable' id='buoyvariable' multiple state={this.state.buoyvariable} def='' onUpdate={this.onLocalUpdate.bind(this)} url={'/api/drifters/vars/' + this.props.drifter} title='Buoy Variable'><h1>Buoy Variable</h1></ComboBox>;
        var variable = <ComboBox key='variable' id='variable' multiple state={this.state.variable} def='' onUpdate={this.onLocalUpdate.bind(this)} url={'/api/variables/?dataset='+this.props.dataset} title='Variable'><h1>Variable</h1></ComboBox>;
        var scale = <Range auto key='scale' id='scale' state={this.state.scale} def={''} onUpdate={this.onLocalUpdate.bind(this)} title='Variable Range' />;
        var showmap = <SelectBox key='showmap' id='showmap' state={this.state.showmap} onUpdate={this.onLocalUpdate.bind(this)} title='Show Map'>Shows the drifter track on the mini map.</SelectBox>;
        var latlon = <SelectBox key='latlon' id='latlon' state={this.state.latlon} onUpdate={this.onLocalUpdate.bind(this)} title='Show Latitude/Longitude Plots'>Generates plots of the latitude and longitude vs time.</SelectBox>;
        var starttime = <ContinousTimePicker key='starttime' id='starttime' state={this.state.starttime} title='Start Time' onUpdate={this.onLocalUpdate.bind(this)} max={this.state.endtime} min={this.state.mindate} />;
        var endtime = <ContinousTimePicker key='endtime' id='endtime' state={this.state.endtime} title='End Time' onUpdate={this.onLocalUpdate.bind(this)} min={this.state.starttime} max={this.state.maxdate} />;
        var size = <ImageSize key='size' id='size' state={this.state.size} onUpdate={this.onLocalUpdate.bind(this)} title='Saved Image Size' />;

        var inputs = [];
        var plot_query = {
            dataset: this.props.dataset,
            quantum: this.props.quantum,
            scale: this.state.scale,
            name: this.props.name,
            type: 'drifter',
            drifter: this.props.drifter,
            showmap: this.state.showmap,
            variable: this.state.variable,
            latlon: this.state.latlon,
            buoyvariable: this.state.buoyvariable,
            size: this.state.size,
            dpi: this.state.dpi,
        }
        if (this.state.starttime) {
            plot_query.starttime = this.state.starttime.toISOString();
            plot_query.endtime = this.state.endtime.toISOString();
        }
        inputs = [dataset, showmap, latlon, starttime, endtime, buoyvariable, variable, size];

        return (
            <div className='DrifterWindow Window'>
                <div className='content'>
                    <div className='inputs'>
                        {inputs}
                    </div>
                    <PlotImage query={plot_query} permlink={this.props.generatePermLink(this.state)} />
                    <br className='clear' />
                </div>
            </div>
        );
    }
}

export default DrifterWindow;
