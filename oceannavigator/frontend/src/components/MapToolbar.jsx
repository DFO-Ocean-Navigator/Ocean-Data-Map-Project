import React from 'react';
import {Button, SplitButton, DropdownButton, MenuItem} from 'react-bootstrap';
import Papa from 'papaparse';
import FontAwesome from 'react-fontawesome';
require('font-awesome/scss/font-awesome.scss');

class MapToolbar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            pointFiles: [],
            lineFiles: [],
            areaFiles: [],
            class4Files: [],
            parser: null,
        };
    }

    buttonHandler(e) {
        var name = e.target.name;
        if (name == undefined) {
            name = e.target.parentElement.name;
        }
        if (name == 'class4') {
            this.props.action("show", "class4", 'latest');
        } else {
            this.props.action(name);
        }
    }

    componentDidMount() {
        $.ajax({
            url: '/api/points/',
            dataType: 'json',
            cache: true,
            success: function(data) {
                this.setState({
                    pointFiles: data,
                });
            }.bind(this),
            error: function(r, status, err) {
                console.error(this.props.url, status, err.toString());
            }
        });
        $.ajax({
            url: '/api/lines/',
            dataType: 'json',
            cache: true,
            success: function(data) {
                this.setState({
                    lineFiles: data,
                });
            }.bind(this),
            error: function(r, status, err) {
                console.error(this.props.url, status, err.toString());
            }
        });
        $.ajax({
            url: '/api/areas/',
            dataType: 'json',
            cache: true,
            success: function(data) {
                this.setState({
                    areaFiles: data,
                });
            }.bind(this),
            error: function(r, status, err) {
                console.error(this.props.url, status, err.toString());
            }
        });
        $.ajax({
            url: '/api/class4/',
            dataType: 'json',
            cache: true,
            success: function(data) {
                this.setState({
                    class4Files: data,
                });
            }.bind(this),
            error: function(r, status, err) {
                console.error(this.props.url, status, err.toString());
            }
        });
    }

    pointSelect(key) {
        if (key == "custom") {
            this.setState({
                parser: 'point',
            });
            this.fileinput.click();
        } else {
            this.props.action("show", "points", key);
        }
    }

    lineSelect(key) {
        if (key == "custom") {
            this.setState({
                parser: 'line',
            });
            this.fileinput.click();
        } else {
            this.props.action("show", "lines", key);
        }
    }

    areaSelect(key) {
        if (key == "custom") {
            this.setState({
                parser: 'area',
            });
            this.fileinput.click();
        } else {
            this.props.action("show", "areas", key);
        }
    }

    drifterSelect(key) {
        this.props.action("show", "drifters", key);
    }

    class4Select(key) {
        this.props.action("show", "class4", key);
    }

    parseCSV(e) {
        if (e.target.files.length == 1) {
            var file = e.target.files[0];
            this.setState({
                parsedFile: file.name,
            });
            Papa.parse(file, {
                dynamicTyping: true,
                skipEmptyLines: true,
                header: true,
                complete: function(results) {
                    var fields_lowered = results.meta.fields.map(function(f) {
                        return f.toLowerCase();
                    });
                    function findKey(names) {
                        for (var i = 0; i < names.length; i++) {
                            var index = fields_lowered.indexOf(names[i]);
                            if (index > -1) {
                                return results.meta.fields[index];
                            }
                        }
                        return -1;
                    }

                    var lat = findKey(["latitude", "lat"]);
                    var lon = findKey(["longitude", "lon"]);
                    if (lat == -1 || lon == -1) {
                        alert("Error: Could not find latitude or longitude column");
                        return;
                    }

                    var points = results.data.map(function(r) {
                        return [r[lat], r[lon]];
                    });

                    this.props.action("add", this.state.parser, points, this.state.parsedFile);
                }.bind(this),
            });

            this.fileform.reset();
        }
    }

    render() {
        var pointFiles = this.state.pointFiles.map(function(d) {
            return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
        });
        var lineFiles = this.state.lineFiles.map(function(d) {
            return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
        });
        var areaFiles = this.state.areaFiles.map(function(d) {
            return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
        });
        var class4Files = this.state.class4Files.map(function(d) {
            return <MenuItem eventKey={d.id} key={d.id}>{d.name}</MenuItem>;
        });

        return (
            <div className='MapToolbar'>
                <SplitButton name="point" id="point" onClick={this.buttonHandler.bind(this)} title={<span><FontAwesome name="pencil" /> Point</span>} onSelect={this.pointSelect.bind(this)}>
                    {pointFiles}
                    <MenuItem divider />
                    <MenuItem eventKey='custom' key='custom'><FontAwesome name="upload" /> Upload CSV&hellip;</MenuItem>
                </SplitButton>
                <SplitButton name="line" id="line" onClick={this.buttonHandler.bind(this)} title={<span><FontAwesome name="pencil" /> Line</span>} onSelect={this.lineSelect.bind(this)}>
                    {lineFiles}
                    <MenuItem divider />
                    <MenuItem eventKey='custom' key='custom'><FontAwesome name="upload" /> Upload CSV&hellip;</MenuItem>
                </SplitButton>
                <SplitButton name="area" id="area" onClick={this.buttonHandler.bind(this)} title={<span><FontAwesome name="pencil" /> Area</span>} onSelect={this.areaSelect.bind(this)}>
                    {areaFiles}
                    <MenuItem divider />
                    <MenuItem eventKey='custom' key='custom'><FontAwesome name="upload" /> Upload CSV&hellip;</MenuItem>
                </SplitButton>
                <SplitButton name="class4" id="class4" onClick={this.buttonHandler.bind(this)} title='Class4' onSelect={this.class4Select.bind(this)}>
                    {class4Files}
                </SplitButton>
                <DropdownButton name="drifter" id="drifter" title="Drifters" onSelect={this.drifterSelect.bind(this)}>
                    <MenuItem eventKey='all' key='all'>All</MenuItem>
                    <MenuItem eventKey='active' key='active'>Active</MenuItem>
                    <MenuItem eventKey='not responding' key='not responding'>Not Responding</MenuItem>
                    <MenuItem eventKey='inactive' key='inactive'>Inactive</MenuItem>
                </DropdownButton>
                <Button name="plot" onClick={this.buttonHandler.bind(this)} disabled={!this.props.plotEnabled}><FontAwesome name='line-chart' /> Plot</Button>
                <span style={{'float': 'right'}} title="Permalink"><Button name="permalink" onClick={this.buttonHandler.bind(this)}><FontAwesome name='link' /></Button></span>

                <form ref={(f) => this.fileform = f}>
                    <input type='file' style={{'display': 'none'}} onChange={this.parseCSV.bind(this)} ref={(f) => this.fileinput = f} accept=".csv,.CSV" />
                </form>
            </div>
        );
    }
}

export default MapToolbar;

