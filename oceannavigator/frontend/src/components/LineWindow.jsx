import React from 'react';
import {Nav, NavItem} from 'react-bootstrap';
import PlotImage from './PlotImage.jsx';
import ComboBox from './ComboBox.jsx';
import TimePicker from './TimePicker.jsx';
import LocationInput from './LocationInput.jsx';
import Range from './Range.jsx';
import SelectBox from './SelectBox.jsx';
import NumberBox from './NumberBox.jsx';
import ImageSize from './ImageSize.jsx';

class LineWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: 1,
            scale: props.scale + ',auto',
            colormap: 'default',
            starttime: Math.max(props.time - 24, 0),
            showmap: true,
            surfacevariable: 'none',
            linearthresh: 200,
            size: "10x7",
            dpi: 72,
        }

        if (props.init != null) {
            $.extend(this.state, props.init);
        }
    }

    componentWillReceiveProps(props) {
        this.setState({
            depth: props.depth,
            scale: (this.state.scale.indexOf('auto') != -1) ? props.scale + ",auto" : props.scale,
        });
    }

    onLocalUpdate(key, value) {
        var newState = {};
        newState[key] = value;
        this.setState(newState);
    }

    onSelect(key) {
        this.setState({
            selected: key
        });
    }

    render() {
        var dataset = <ComboBox key='dataset' id='dataset' state={this.props.dataset} def='' url='/api/datasets/' title='Dataset' onUpdate={this.props.onUpdate} />;
        var time = <TimePicker key='time' id='time' state={this.props.time} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='Time' onUpdate={this.props.onUpdate} />;
        var starttime = <TimePicker key='starttime' id='starttime' state={this.state.starttime} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='Start Time' onUpdate={this.onLocalUpdate.bind(this)} max={this.props.time} />;
        var endtime = <TimePicker key='time' id='time' state={this.props.time} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='End Time' onUpdate={this.props.onUpdate} min={this.state.starttime} />;
        var depth = <ComboBox key='depth' id='depth' state={this.props.depth} def={''} onUpdate={this.props.onUpdate.bind(this)} url={'/api/depth/?variable=' + this.props.variable + '&dataset=' + this.props.dataset} title='Depth'></ComboBox>;
        var variable = <ComboBox key='variable' id='variable' state={this.props.variable} def='' onUpdate={this.props.onUpdate} url={'/api/variables/?vectors&dataset='+this.props.dataset + '&3d_only&anom'} title='Variable'><h1>Variable</h1></ComboBox>;
        var hovmoller_variable = <ComboBox key='variable' id='variable' state={this.props.variable} def='' onUpdate={this.props.onUpdate} url={'/api/variables/?vectors&dataset='+this.props.dataset} title='Variable'><h1>Variable</h1></ComboBox>;
        var scale = <Range auto key='scale' id='scale' state={this.state.scale} def={''} onUpdate={this.onLocalUpdate.bind(this)} title='Variable Range' />;
        var colormap = <ComboBox key='colormap' id='colormap' state={this.state.colormap} def='default' onUpdate={this.onLocalUpdate.bind(this)} url='/api/colormaps/' title='Colourmap'>There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable.</ComboBox>;
        var showmap = <SelectBox key='showmap' id='showmap' state={this.state.showmap} onUpdate={this.onLocalUpdate.bind(this)} title='Show Location'>Shows the mini map of the location in the plot.</SelectBox>;
        var linearthreshold = <NumberBox key='linearthresh' id='linearthresh' state={this.state.linearthresh} onUpdate={this.onLocalUpdate.bind(this)} title='Linear Threshold'>The depth axis is broken into two parts at the linear threshold. Values above this value are plotted on a linear scale, and values below are plotted on a logarithmic scale.</NumberBox>;
        var surfacevariable = <ComboBox key='surfacevariable' id='surfacevariable' state={this.state.surfacevariable} onUpdate={this.onLocalUpdate.bind(this)} title='Surface Variable' url={'/api/variables/?dataset=' + this.props.dataset}>Surface variable lets you select an additional variable to be plotted above the transect plot indicating some surface condition. If the variable selected has multiple depths, the surface depth will be used.</ComboBox>;
        var size = <ImageSize key='size' id='size' state={this.state.size} onUpdate={this.onLocalUpdate.bind(this)} title='Saved Image Size' />;

        var inputs = [];
        var plot_query = {
            dataset: this.props.dataset,
            quantum: this.props.quantum,
            variable: this.props.variable,
            path: this.props.line[0],
            scale: this.state.scale,
            colormap: this.state.colormap,
            showmap: this.state.showmap,
            name: this.props.names[0],
            size: this.state.size,
            dpi: this.state.dpi,
        };

        switch(this.state.selected) {
            case 1:
                plot_query.type = 'transect';
                plot_query.time = this.props.time;
                plot_query.surfacevariable = this.state.surfacevariable;
                plot_query.linearthresh = this.state.linearthresh;
                inputs = [dataset, time, variable, showmap, scale, linearthreshold, colormap, surfacevariable];
                break;
            case 2:
                plot_query.type = 'hovmoller';
                plot_query.endtime = this.props.time;
                plot_query.starttime = this.state.starttime;
                plot_query.depth = this.props.depth;
                inputs = [dataset, starttime, endtime, hovmoller_variable, showmap, depth, scale, colormap];
                break;
        }

        inputs.push(size);

        return (
            <div className='LineWindow Window'>
                <Nav bsStyle="tabs" activeKey={this.state.selected} onSelect={this.onSelect.bind(this)}>
                    <NavItem eventKey={1}>Transect</NavItem>
                    <NavItem eventKey={2}>Hovmöller Diagram</NavItem>
                </Nav>
                <div className='content'>
                    <div className='inputs'>
                        {inputs}
                    </div>
                    <PlotImage query={plot_query} permlink={this.props.generatePermLink(this.state)}/>
                    <br className='clear' />
                </div>
            </div>
        );
    }
}

export default LineWindow;
