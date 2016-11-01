import React from 'react';
import {Nav, NavItem} from 'react-bootstrap';
import PlotImage from './PlotImage.jsx';
import ComboBox from './ComboBox.jsx';
import TimePicker from './TimePicker.jsx';
import LocationInput from './LocationInput.jsx';
import Range from './Range.jsx';
import SelectBox from './SelectBox.jsx';
import NumberBox from './NumberBox.jsx';
import ContourSelector from './ContourSelector.jsx';
import StatsTable from './StatsTable.jsx';
import ImageSize from './ImageSize.jsx';

class AreaWindow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: 1,
            scale: props.scale + ',auto',
            colormap: 'default',
            starttime: -24,
            showarea: true,
            surfacevariable: 'none',
            linearthresh: 200,
            bathymetry: true,
            quiver: 'none',
            contour: {
                variable: '',
                colormap: 'default',
                levels: 'auto',
                legend: true,
                hatch: false,
            },
            variable: [props.variable],
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
        var starttime = <TimePicker key='starttime' id='starttime' state={this.state.starttime} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='Start Time' onUpdate={this.onLocalUpdate.bind(this)} max={this.props.time} />;
        var endtime = <TimePicker key='time' id='time' state={this.props.time} def='' quantum={this.props.quantum} url={'/api/timestamps/?dataset=' + this.props.dataset + '&quantum=' + this.props.quantum} title='End Time' onUpdate={this.props.onUpdate} min={this.state.starttime} />;
        var depth = <ComboBox key='depth' id='depth' state={this.props.depth} def={''} onUpdate={this.props.onUpdate.bind(this)} url={'/api/depth/?variable=' + this.state.variable + '&dataset=' + this.props.dataset} title='Depth'></ComboBox>;
        var variable = <ComboBox key='variable' id='variable' state={this.props.variable} def='' onUpdate={this.props.onUpdate} url={'/api/variables/?vectors&dataset='+this.props.dataset + '&anom'} title='Variable'><h1>Variable</h1></ComboBox>;
        var multivariable = <ComboBox key='variable' id='variable' multiple state={this.state.variable} def='' onUpdate={this.onLocalUpdate.bind(this)} url={'/api/variables/?dataset='+this.props.dataset + '&anom'} title='Variable'><h1>Variable</h1></ComboBox>;
        var scale = <Range auto key='scale' id='scale' state={this.state.scale} def={''} onUpdate={this.onLocalUpdate.bind(this)} title='Variable Range' />;
        var colormap = <ComboBox key='colormap' id='colormap' state={this.state.colormap} def='default' onUpdate={this.onLocalUpdate.bind(this)} url='/api/colormaps/' title='Colourmap'>There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable.</ComboBox>;
        var bathymetry = <SelectBox key='bathymetry' id='bathymetry' state={this.state.bathymetry} onUpdate={this.onLocalUpdate.bind(this)} title='Show Bathymetry Contours' />;
        var quiver = <ComboBox key='quiver' id='quiver' state={this.state.quiver} def='' onUpdate={this.onLocalUpdate.bind(this)} url={'/api/variables/?vectors_only&dataset=' + this.props.dataset} title='Arrows'>Arrows lets you select an additional vector variable to be overlayed on top of the plot as arrows or quivers. If the variable is the same as the main variable, the arrows will all be of unit length and are used for direction only, otherwise the length of the arrow will indicate magnitude.</ComboBox>;
        var contour = <ContourSelector key='contour' id='contour' state={this.state.contour} def='' onUpdate={this.onLocalUpdate.bind(this)} dataset={this.props.dataset} title='Additional Contours'>Additional contours lets you select an additional variable to be overlayed on top of the plot as contour lines. You can choose the colourmap for the contours, as well as define the contour levels in a comma-seperated list.</ContourSelector>;
        var showarea = <SelectBox key='showarea' id='showarea' state={this.state.showarea} onUpdate={this.onLocalUpdate.bind(this)} title='Show Selected Area(s)'>Shows the selected areas on the map.</SelectBox>;
        var size = <ImageSize key='size' id='size' state={this.state.size} onUpdate={this.onLocalUpdate.bind(this)} title='Saved Image Size' />;

        var inputs = [];
        var plot_query = {
            dataset: this.props.dataset,
            quantum: this.props.quantum,
            scale: this.state.scale,
            colormap: this.state.colormap,
            name: this.props.name,
        };

        var content = "";
        switch(this.state.selected) {
            case 1:
                plot_query.type = 'map';
                plot_query.time = this.props.time;
                plot_query.area = this.props.area;
                plot_query.depth = this.props.depth;
                plot_query.bathymetry = this.state.bathymetry;
                plot_query.quiver = this.state.quiver;
                plot_query.contour = this.state.contour;
                plot_query.showarea = this.state.showarea;
                plot_query.variable = this.props.variable;
                plot_query.projection = this.props.projection;
                plot_query.size = this.state.size;
                plot_query.dpi = this.state.dpi;
                inputs = [dataset, time, showarea, variable, depth, scale, colormap,
                          bathymetry, quiver, contour, size];

                content = <PlotImage query={plot_query} permlink={this.props.generatePermLink(this.state)}/>;
                break;
            case 2:
                plot_query.time = this.props.time;
                plot_query.area = this.props.area;
                plot_query.depth = this.props.depth;
                plot_query.variable = this.state.variable.join(",");
                inputs = [dataset, time, multivariable, depth];
                content = <StatsTable query={plot_query}/>;
                break;
        }

        return (
            <div className='AreaWindow Window'>
                <Nav bsStyle="tabs" activeKey={this.state.selected} onSelect={this.onSelect.bind(this)}>
                    <NavItem eventKey={1}>Map</NavItem>
                    <NavItem eventKey={2}>Statistics</NavItem>
                </Nav>
                <div className='content'>
                    <div className='inputs'>
                        {inputs}
                    </div>
                    {content}
                    <br className='clear' />
                </div>
            </div>
        );
    }
}

export default AreaWindow;
