import React from 'react';
import {Nav, NavItem} from 'react-bootstrap';
import PlotImage from './PlotImage.jsx';
import ComboBox from './ComboBox.jsx';
import TimePicker from './TimePicker.jsx';
import LocationInput from './LocationInput.jsx';
import Range from './Range.jsx';
import ImageSize from './ImageSize.jsx';

class PointWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: 2,
            scale: props.scale + ',auto',
            depth: props.depth,
            colormap: 'default',
            starttime: Math.max(props.time - 24, 0),
            variables: [],
            variable: [props.variable],
            size: "10x7",
            dpi: 72,
        }

        if (props.init != null) {
            $.extend(this.state, props.init);
        }
    }

    populateVariables(dataset) {
        $.ajax({
            url: '/api/variables/?dataset=' + dataset + '&anom',
            dataType: 'json',
            cache: true,
            success: function(data) {
                var vars = data.map(function(d) { return d.id; });
                if ($.inArray(this.props.variable.split(',')[0], vars) == -1) {
                    this.props.onUpdate('variable', vars[0]);
                    this.setState({
                        selected: 1,
                    });
                }
                this.setState({
                    variables: data.map(function(d) { return d.id; }),
                });
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(props.url, status, err.toString());
            }.bind(this)
        });
    }

    componentDidMount() {
        this.populateVariables(this.props.dataset);
    }

    componentWillReceiveProps(props) {
        this.setState({
            depth: props.depth,
            scale: (this.state.scale.indexOf('auto') != -1) ? props.scale + ",auto" : props.scale,
        });
        if (this.props.dataset != props.dataset) {
            this.populateVariables(props.dataset);
        }
    }

    onLocalUpdate(key, value) {
        var newState = {};
        if (typeof(key) === "string") {
            newState[key] = value;
        } else {
            for (var i = 0; i < key.length; i++) {
                newState[key[i]] = value[i];
            }
        }
        this.setState(newState);

        var parentKeys = [];
        var parentValues = [];

        if (newState.hasOwnProperty('depth') && newState.depth != 'all') {
            parentKeys.push('depth');
            parentValues.push(newState.depth);
        }

        if (newState.hasOwnProperty('point')) {
            parentKeys.push('point');
            parentValues.push(newState.point);

            parentKeys.push('names');
            parentValues.push([]);
        }

        if (newState.hasOwnProperty('variable_scale') && this.state.variable.length == 1) {
            parentKeys.push('variable_scale');
            parentValues.push(newState.variable_scale);
        }

        if (newState.hasOwnProperty('variable') && newState.variable.length == 1) {
            parentKeys.push('variable');
            parentValues.push(newState.variable[0]);
        }

        if (parentKeys.length > 0) {
            this.props.onUpdate(parentKeys, parentValues);
        }
    }

    onSelect(key) {
        this.setState({
            selected: key
        });
    }

    render() {
        var dataset = <ComboBox key='dataset' id='dataset' state={this.props.dataset} def='' url='/api/datasets/' title='Dataset' onUpdate={this.props.onUpdate} />;
        var time = <TimePicker key='time' id='time' state={this.props.time} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='Time' onUpdate={this.props.onUpdate} />;
        var point = <LocationInput key='point' id='point' state={this.props.point} title='Location' onUpdate={this.onLocalUpdate.bind(this)} />;
        var starttime = <TimePicker key='starttime' id='starttime' state={this.state.starttime} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='Start Time' onUpdate={this.onLocalUpdate.bind(this)} max={this.props.time} />;
        var endtime = <TimePicker key='time' id='time' state={this.props.time} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='End Time' onUpdate={this.props.onUpdate} min={this.state.starttime} />;
        var depth = <ComboBox key='depth' id='depth' state={this.state.depth} def={''} onUpdate={this.onLocalUpdate.bind(this)} url={'/api/depth/?variable=' + this.props.variable + '&dataset=' + this.props.dataset + '&all=True'} title='Depth'></ComboBox>;
        var variable = <ComboBox key='variable' id='variable' state={this.props.variable} def='' onUpdate={this.props.onUpdate} url={'/api/variables/?vectors&dataset='+this.props.dataset} title='Variable'><h1>Variable</h1></ComboBox>;
        var profilevariable = <ComboBox key='variable' id='variable' multiple state={this.state.variable} def='' onUpdate={this.onLocalUpdate.bind(this)} url={'/api/variables/?3d_only&dataset='+this.props.dataset + '&anom'} title='Variable'><h1>Variable</h1></ComboBox>;
        var scale = <Range auto key='scale' id='scale' state={this.state.scale} def={''} onUpdate={this.onLocalUpdate.bind(this)} title='Variable Range' />;
        var colormap = <ComboBox key='colormap' id='colormap' state={this.state.colormap} def='default' onUpdate={this.onLocalUpdate.bind(this)} url='/api/colormaps/' title='Colourmap'>There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable.</ComboBox>;
        var size = <ImageSize key='size' id='size' state={this.state.size} onUpdate={this.onLocalUpdate.bind(this)} title='Saved Image Size' />;

        var hasTempSalinity = $.inArray('votemper', this.state.variables) != -1  &&
            $.inArray('vosaline', this.state.variables) != -1;

        var inputs = [];
        var plot_query = {
            dataset: this.props.dataset,
            quantum: this.props.quantum,
            point: this.props.point,
            names: this.props.names,
            size: this.state.size,
            dpi: this.state.dpi,
        };

        var active = this.state.selected;
        if (!hasTempSalinity && (active != 1 && active != 5)) {
            active = 1;
        }

        switch(active) {
            case 1:
                plot_query.type = 'profile';
                plot_query.time = this.props.time;
                plot_query.variable = this.state.variable;
                inputs = [dataset, time, profilevariable];
                if (this.props.point.length == 1) {
                    inputs.push(point);
                }
                break;
            case 2:
                plot_query.type = 'profile';
                plot_query.time = this.props.time;
                plot_query.variable = 'votemper,vosaline';
                inputs = [dataset, time];
                if (this.props.point.length == 1) {
                    inputs.push(point);
                }
                break;
            case 3:
                plot_query.type = 'ts';
                plot_query.time = this.props.time;
                inputs = [dataset, time];
                if (this.props.point.length == 1) {
                    inputs.push(point);
                }
                break;
            case 4:
                plot_query.type = 'sound';
                plot_query.time = this.props.time;
                inputs = [dataset, time];
                if (this.props.point.length == 1) {
                    inputs.push(point);
                }
                break;
            case 5:
                plot_query.type = 'timeseries';
                plot_query.variable = this.props.variable;
                plot_query.starttime = this.state.starttime;
                plot_query.endtime = this.props.time;
                plot_query.depth = this.state.depth;
                plot_query.colormap = this.state.colormap;
                plot_query.scale = this.state.scale;

                inputs = [dataset, starttime, endtime, variable, point, depth,
                          scale];
                if (this.state.depth == 'all') {
                    inputs.push(colormap);
                }

                break;
        }

        inputs.push(size);

        var permlink_query = {
            selected: this.state.selected,
            scale: this.state.scale,
            depth: this.state.depth,
            colormap: this.state.colormap,
            starttime: this.state.starttime,
        }

        return (
            <div className='PointWindow Window'>
                <Nav bsStyle="tabs" activeKey={active} onSelect={this.onSelect.bind(this)}>
                    <NavItem eventKey={1}>Profile</NavItem>
                    <NavItem eventKey={2} disabled={!hasTempSalinity}>CTD Profile</NavItem>
                    <NavItem eventKey={3} disabled={!hasTempSalinity}>T/S Diagram</NavItem>
                    <NavItem eventKey={4} disabled={!hasTempSalinity}>Sound Speed Profile</NavItem>
                    <NavItem eventKey={5}>Virtual Mooring</NavItem>
                </Nav>
                <div className='content'>
                    <div className='inputs'>
                        {inputs}
                    </div>
                    <PlotImage query={plot_query} permlink={this.props.generatePermLink(permlink_query)} />
                    <br className='clear' />
                </div>
            </div>
        );
    }
}

export default PointWindow;
