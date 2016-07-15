var loading_image = '/images/spinner.gif';
var fail_image = '/images/failure.gif';
var defaults = {
    'type':                'map',
    'dataset':             'giops_month',
    'dataset_quantum':     'month',
    'size':                '10x7.5',
    'dpi':                 72,
    'map': {
        'location':        'nwatlantic',
        'time':            '-1',
        'variable':        'votemper',
        'anomaly':         false,
        'depth':           0,
        'overlay': {
            'file':        '',
            'selection':   'all',
            'labelcolor':  'k',
            'edgecolor':   'k',
            'facecolor':   'none',
            'alpha':       0.5
        },
        'colormap':        'default',
        'bathymetry':      true,
        'contour': {
            'variable':    '',
            'colormap':    'default',
            'levels':      'auto',
            'legend':      true,
            'hatch':       false,
        },
        'quiver':          '',
        'interpolation': {
            'method':      'inv_square',
            'neighbours':  8,
        },
        'scale':           'auto',
    },
    'transect': {
        'time':            '-1',
        'variable':        'votemper',
        'anomaly':         false,
        'showmap':         true,
        'colormap':        'default',
        'surfacevariable': '',
        'transect_pts':    [],
        'transect_name':   '',
        'linearthresh':    '200',
        'interpolation': {
            'method':      'inv_square',
            'neighbours':  8,
        },
        'scale':           'auto',
    },
    'timeseries': {
        'depth':           'all',
        'variable':        'votemper',
        'station':         '',
        'station_name':    'S27-01',
        'starttime':       '-24',
        'endtime':         '-1',
        'colormap':        'default',
        'scale':           'auto',
    },
    'ts': {
        'time':            '-1',
        'station':         '',
        'station_name':    'SEGB-20',
    },
    'sound': {
        'time':            '-1',
        'station':         '',
        'station_name':    'SEGB-20',
    },
    'ctd': {
        'time':            '-1',
        'station':         '',
        'station_name':    'SEGB-20',
    },
    'hovmoller': {
        'starttime':       '-24',
        'endtime':         '-1',
        'variable':        'votemper',
        'depth':           0,
        'showmap':         true,
        'colormap':        'default',
        'scale':           'auto',
        'path_pts':        [],
        'path_name':       '',
        'interpolation': {
            'method':      'inv_square',
            'neighbours':  8,
        },
    }
}
var imagePreloader = new Image();
var Plot = React.createClass({
    buildQuery: function(q) {
        var query = {
            'type': q.type,
            'dataset': q.dataset,
            'quantum': q.dataset_quantum,
        }
        for (var key in defaults[q.type]) {
            if (defaults[q.type].hasOwnProperty(key)) {
                query[key] = q[key];
            }
        }

        return JSON.stringify(query);
    },
    buildURL: function(q, page) {
        if (page) {
            return '/?query=' + this.buildQuery(q);
        } else {
            return '/plot/?query=' + this.buildQuery(q);
        }
    },
    getInitialState: function() {
        return {
            'url': this.buildURL(this.props.query, false),
            'fail': false,
            'loading': false,
        };
    },
    timer: 0,
    imagePreload: function(src, callback) {
        this.setState({
            'url': loading_image,
            'fail': false,
            'loading': true,
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
            imagePreloader.src = src;
            imagePreloader.onerror = imagePreloader.onabort = function() {
                console.error("Image failed to load: ", src);
                this.setState({
                    'url': fail_image + '?query=' + this.buildQuery(this.props.query),
                    'fail': true,
                    'loading': false,
                });
            }.bind(this);
            if (imagePreloader.complete) {
                callback(this);
                imagePreloader.onload = function(){};
            } else {
                imagePreloader.onload = function() {
                    callback(this);
                    imagePreloader.onload = function(){};
                };
            }
        }.bind(this), 100);
    },
    componentWillUpdate: function(nextprops, nextstate) {
        var oldQueryURL = this.buildURL(this.props.query, false);
        var newQueryURL = this.buildURL(nextprops.query, false);

        if (oldQueryURL != newQueryURL) {
            this.imagePreload(newQueryURL, function(e) {
                this.setState({
                    'url': newQueryURL,
                    'fail': false,
                    'loading': false,
                });
            }.bind(this));
        }
    },
    newWindow: function() {
        window.open(this.state.url, 'newwindow', 'width=800,height=800');
        return false;
    },
    saveImage: function() {
        var format = this.refs.format.value;
        if (format != '') {
            window.location.href = this.state.url + '&save&format=' + format + '&size=' + this.props.query.size + '&dpi=' + this.props.query.dpi;
        }
        this.refs.format.value = '';
    },
    copyURL: function(page) {
        var textArea = document.createElement("textarea");

        // Place in top-left corner of screen regardless of scroll position.
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;

        // Ensure it has a small width and height. Setting to 1px / 1em
        // doesn't work as this gives a negative w/h on some browsers.
        textArea.style.width = '2em';
        textArea.style.height = '2em';

        // We don't need padding, reducing the size if it does flash render.
        textArea.style.padding = 0;

        // Clean up any borders.
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';

        // Avoid flash of white box if rendered for any reason.
        textArea.style.background = 'transparent';

        var url = window.location.href;
        if (url.indexOf('?') != -1) {
            url = url.slice(0, url.indexOf('?'));
        }
        if (url.endsWith('/')) {
            url = url.slice(0, -1) + this.buildURL(this.props.query, page);
        } else {
            url = url + this.buildURL(this.props.query, page);
        }

        textArea.value = url;

        document.body.appendChild(textArea);

        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Unable to copy');
        }

        document.body.removeChild(textArea);
    },
    render: function() {
        var disableButtons = this.state.loading || this.state.fail;
        var exportData = "";
        if (this.props.query.type == 'map') {
            exportData = <option value='geotiff'>GeoTIFF</option>;
        } else {
            exportData = <option value='csv'>CSV</option>;
        }
        var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        var chromeversion = raw ? parseInt(raw[2], 10) : false;
        var showCopy =
            (chromeversion &&
             (chromeversion < 48 && chromeversion >= 43)
            )
            ||
            document.queryCommandSupported('copy');
        return (
                <div className='plot' style={{float: 'right'}}>
                <img src={this.state.url} />
                <div>
                <p className='failmessage' style={{'display': this.state.fail ? 'block' : 'none'}}>Something went horribly wrong.</p>
                <div className='buttonbar' ref='buttonbar'>
                <select ref='format' onChange={this.saveImage} disabled={disableButtons}>
                <option value=''>Save&hellip;</option>
                <option value='png'>PNG</option>
                <option value='pdf'>PDF</option>
                <option value='svg'>SVG</option>
                <option value='ps'>PS</option>
                <option value='eps'>EPS</option>
                <option value='tif'>TIFF</option>
                {exportData}
                </select>
                <input type='button' value='Open In New Window' onClick={this.newWindow} disabled={disableButtons} />
                <input type='button' value='Copy Image URL' onClick={this.copyURL.bind(this, false)} style={{'display': showCopy ? 'inline-block' : 'none'}} disabled={disableButtons}/>
                <input type='button' value='Copy Page URL' onClick={this.copyURL.bind(this, true)} style={{'display': showCopy ? 'inline-block' : 'none'}} disabled={disableButtons}/>
                </div>
                </div>
                </div>
                );
    }
});

var Selector = React.createClass({
    getInitialState: function() {
        var state = {
            'type': defaults.type,
            'dataset': defaults.dataset,
            'size': defaults.size,
            'dpi': defaults.dpi,
        }
        for (var key in defaults[defaults.type]) {
            if (defaults[defaults.type].hasOwnProperty(key)) {
                state[key] = defaults[defaults.type][key];
            }
        }

        if (window.location.search.length > 0) {
            try {
                var querystate = JSON.parse(
                        decodeURIComponent(
                            window.location.search.replace("?query=", ""))
                        );
                $.extend(state, querystate);
            } catch(err) {
                console.error(err);
            }
        }

        return state;
    },
    onUpdate: function(key, value) {
        var newstate = {};
        if (this.state[key] == value) {
            return;
        }
        newstate[key] = value;
        if (key == 'type') {
            for (var key in defaults[value]) {
                if (defaults[value].hasOwnProperty(key)) {
                    if (key == 'station_name') {
                        continue;
                    }
                    if (key == 'station' && this.state.station != '') {
                        continue;
                    }
                    if (key == 'variable') {
                        continue;
                    }
                    newstate[key] = defaults[value][key];
                }
            }
        }
        if (key == 'dataset') {
            for (var key in defaults[this.state.type]) {
                if (jQuery.inArray(key,
                            [
                            'location',
                            'overlay',
                            'interpolation',
                            'transect_name',
                            'transect_pts',
                            'path_name',
                            'path_pts',
                            'linearthresh',
                            'colormap',
                            'bathymetry',
                            'size',
                            'station',
                            'station_name',
                            ]
                            ) != -1) {
                    continue;
                }
                if (defaults[this.state.type].hasOwnProperty(key)) {
                    newstate[key] = defaults[this.state.type][key];
                }
            }
            if (value.indexOf('biomer') == 0 && jQuery.inArray(this.state.type, ['ctd', 'sound', 'ts']) != -1) {
                newstate.type = defaults.type;
            }
        }
        this.setState(newstate);
    },
    render: function() {
        var inputmap = {
            'dataset': (<ComboBox key='dataset' id='dataset' state={this.state.dataset} def={defaults.dataset} onUpdate={this.onUpdate} url='/api/datasets/' title='Dataset'><h1>Datasets</h1></ComboBox>),
            'plottype': (<PlotType key='type' id='type' state={this.state.type} def={defaults.type} dataset={this.state.dataset} onUpdate={this.onUpdate} title='Plot Type'></PlotType>),
            'loc': (<LocationComboBox key='location' id='location' state={this.state.location} onUpdate={this.onUpdate} url='/api/locations/' title='Location'><h1>Location Selection</h1></LocationComboBox>),
            'time': (<TimePicker key='time' id='time' state={this.state.time} def={defaults[this.state.type].time} quantum={this.state.dataset_quantum} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset + '&quantum=' + this.state.dataset_quantum} title='Time'></TimePicker>),
            'variable': (<ComboBox key='variable' state={this.state.variable} id='variable' def={defaults[this.state.type].variable} onUpdate={this.onUpdate} url={'/api/variables/?vectors&dataset=' + this.state.dataset + ((this.state.type == 'transect') ? '&3d_only' : '')} title='Variable'></ComboBox>),
            'anomaly': (<CheckBox key='anomaly' id='anomaly' state={this.state.anomaly} onUpdate={this.onUpdate} title='Anomaly'></CheckBox>),
            'scale': (<Range key='scale' id='scale' state={this.state.scale} def={defaults[this.state.type].scale} onUpdate={this.onUpdate} title='Variable Range'></Range>),
            'linearthresh': (<NumberBox key='linearthresh' id='linearthresh' state={this.state.linearthresh} onUpdate={this.onUpdate} title='Linear Threshold'>The depth axis is broken into two parts at the linear threshold. Values above this value are plotted on a linear scale, and values below are plotted on a logarithmic scale.</NumberBox>),
            'depth': (<ComboBox key='depth' id='depth' state={this.state.depth} def={defaults[this.state.type].depth} onUpdate={this.onUpdate} url={'/api/depth/?variable=' + this.state.variable + '&dataset=' + this.state.dataset + '&all=' + (this.state.type == 'timeseries')} title='Depth'></ComboBox>),
            'colormap': (<ComboBox key='colormap' id='colormap' state={this.state.colormap} def={defaults[this.state.type].colormap} onUpdate={this.onUpdate} url='/api/colormaps/' title='Colourmap'>There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable.</ComboBox>),
            'overlay': (<OverlaySelector key='overlay' id='overlay' state={this.state.overlay} onUpdate={this.onUpdate} url='/api/overlays/' title='Overlay'></OverlaySelector>),
            'bathymetry': (<div key='bathymetry'><h1>Bathymetry</h1><CheckBox id='bathymetry' state={this.state.bathymetry} onUpdate={this.onUpdate} title='Show Bathymetry Contours'></CheckBox></div>),
            'quiver': (<ComboBox key='quiver' id='quiver' state={this.state.quiver} def={defaults[this.state.type].quiver} onUpdate={this.onUpdate} url={'/api/variables/?vectors_only&dataset=' + this.state.dataset} title='Arrows'>Arrows lets you select an additional vector variable to be overlayed on top of the plot as arrows or quivers. If the variable is the same as the main variable, the arrows will all be of unit length and are used for direction only, otherwise the length of the arrow will indicate magnitude.</ComboBox>),
            'contour': (<ContourSelector key='contour' id='contour' state={this.state.contour} def={defaults[this.state.type].contour} onUpdate={this.onUpdate} dataset={this.state.dataset} title='Additional Contours'>Additional contours lets you select an additional variable to be overlayed on top of the plot as contour lines. You can choose the colourmap for the contours, as well as define the contour levels in a comma-seperated list.</ContourSelector>),
            'showmap': (<CheckBox key='showmap' id='showmap' state={this.state.showmap} onUpdate={this.onUpdate} title='Show Location'>Shows the mini map of the location in the plot.</CheckBox>),
            'surfacevariable': (<ComboBox key='surfacevariable' id='surfacevariable' state={this.state.surfacevariable} def={defaults[this.state.type].surfacevariable} onUpdate={this.onUpdate} url={'/api/variables/?dataset=' + this.state.dataset} title='Surface Variable'>Surface variable lets you select an additional variable to be plotted above the transect plot indicating some surface condition. If the variable selected has multiple depths, the surface depth will be used.</ComboBox>),
            'transect': (<TransectComboBox key='transect' id='transect' state={{'name': this.state.transect_name, 'pts': this.state.transect_pts}} onUpdate={this.onUpdate} url='/api/transects' title='Transect'></TransectComboBox>),
            'path': (<TransectComboBox key='path' id='path' state={{'name': this.state.path_name, 'pts': this.state.path_pts}} onUpdate={this.onUpdate} url='/api/transects' title='Path'></TransectComboBox>),
            'station': (<StationComboBox key='station' id='station' state={this.state.station} def={defaults[this.state.type].station_name} onUpdate={this.onUpdate} url='/api/stations' title='Station'></StationComboBox>),
            'starttime': (<TimePicker key='starttime' id='starttime' state={this.state.starttime} def={defaults[this.state.type].starttime} quantum={this.state.dataset_quantum} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset + '&quantum=' + this.state.dataset_quantum} max={this.state.endtime} title='Start Time'></TimePicker>),
            'endtime': (<TimePicker key='endtime' id='endtime' state={this.state.endtime} def={defaults[this.state.type].endtime} quantum={this.state.dataset_quantum} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset + '&quantum=' + this.state.dataset_quantum} min={this.state.starttime} title='End Time'></TimePicker>),
            'interp': (<InterpolationOptions key='interpolation' id='interpolation' onUpdate={this.onUpdate} state={this.state.interpolation} title='Interpolation'></InterpolationOptions>),
            'size': (<Size key='size' id='size' onUpdate={this.onUpdate} title='Image Size'></Size>),
        }

        var map_inputs = [
            'loc',
            'time',
            'variable',
            'anomaly',
            'scale',
            'depth',
            'colormap',
            'overlay',
            'bathymetry',
            'quiver',
            'contour',
            'interp',
        ];
        var transect_inputs = [
            'transect',
            'showmap',
            'time',
            'variable',
            'anomaly',
            'linearthresh',
            'scale',
            'colormap',
            'surfacevariable',
            'interp',
        ];
        var timeseries_inputs = [
            'starttime',
            'endtime',
            'variable',
            'station',
            'depth',
            'scale',
            'colormap',
        ];
        var ctd_inputs = [
            'time',
            'station',
        ];
        var hovmoller_inputs = [
            'path',
            'showmap',
            'starttime',
            'endtime',
            'depth',
            'variable',
            'scale',
            'colormap',
            'interp',
        ];

        var inputs;
        switch(this.state.type) {
            case 'map':
                inputs = map_inputs.map(function(i) {
                    return inputmap[i];
                });
                break;
            case 'transect':
                inputs = transect_inputs.map(function(i) {
                    return inputmap[i];
                });
                break;
            case 'timeseries':
                inputs = timeseries_inputs.map(function(i) {
                    return inputmap[i];
                });
                break;
            case 'ts':
            case 'sound':
            case 'ctd':
                inputs = ctd_inputs.map(function(i) {
                    return inputmap[i];
                });
                break;
            case 'hovmoller':
                inputs = hovmoller_inputs.map(function(i) {
                    return inputmap[i];
                });
                break;
            default:
                break;
        }

        return (
                <div>
                <Plot query={this.state} />
                <div className='inputs'>
                {inputmap['dataset']}
                {inputmap['plottype']}
                {inputs}
                {inputmap['size']}
                </div>
                </div>
               );
    }
});

var CheckBox = React.createClass({
    handleChange: function(e) {
        this.props.onUpdate(this.props.id, e.target.checked);
    },
    render: function() {
        return (
                <div>
                <input type='checkbox' id={this.props.id} onChange={this.handleChange} checked={this.props.state} />
                <label htmlFor={this.props.id}>{this.props.title}</label>
                </div>
               );
    }
});

var OverlaySelector = React.createClass({
    onUpdate: function(key, value) {
        var state = {}
        state[key] = value;
        if (key == 'file') {
            state['selection'] = 'all';
        }
        var newState = jQuery.extend({}, this.props.state, state);
        this.props.onUpdate(this.props.id, newState);
    },
    alphaChanged: function(e) {
        this.onUpdate('alpha', e.target.value);
    },
    render: function() {
        return (
                <div key='overlay' className='overlayselector'>
                <ComboBox id='file' state={this.props.state.file} def='' onUpdate={this.onUpdate} url='/api/overlays/' title='Overlay'></ComboBox>
                <div className='sub' style={{'display': (this.props.state.file == 'none' || this.props.state.file == '') ? 'none' : 'block'}}>
                <ComboBox id='selection' multiple state={this.props.state.selection} def='all' onUpdate={this.onUpdate} url={'/api/overlays/?file=' + this.props.state.file} title='Name'></ComboBox>
                <ComboBox id='labelcolor' state={this.props.state.labelcolor} onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'} title='Label Color'></ComboBox>
                <ComboBox id='edgecolor' state={this.props.state.edgecolor} onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'} title='Edge Color'></ComboBox>
                <ComboBox id='facecolor' state={this.props.state.facecolor} onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'} title='Face Color'></ComboBox>
                <div className='input'>
                <label forName='alpha'>Alpha:</label>
                <input id='alpha' type='range' min={0.0} max={1.0} step={0.05} value={this.props.state.alpha} onChange={this.alphaChanged} />
                </div>
                </div>
                </div>
               );
    }
});

var ContourSelector = React.createClass({
    getInitialState: function() {
        return {
            autolevels: this.props.state.levels == 'auto',
            levels: "-10,0,10",
        };
    },
    onUpdate: function(key, value) {
        var state = {}
        state[key] = value;
        var newState = jQuery.extend({}, this.props.state, state);
        this.props.onUpdate(this.props.id, newState);
    },
    onUpdateAuto: function(key, value) {
        this.setState({
            autolevels: value,
        });
        this.onUpdate('levels', value ? 'auto' : this.state.levels);
    },
    levelsChanged: function(e) {
        this.setState({
            levels: e.target.value,
        });
    },
    updateLevels: function() {
        this.onUpdate('levels', this.state.levels);
    },
    render: function() {
        return (
                <div key={this.props.id}>
                    <ComboBox id='variable' state={this.props.state.variable} def='' onUpdate={this.onUpdate} url={'/api/variables/?dataset=' + this.props.dataset} title={this.props.title}>{this.props.children}</ComboBox>
                    <div className='sub' style={{'display': (this.props.state.variable == 'none' || this.props.state.variable == '') ? 'none' : 'block'}}>
                        <CheckBox key='hatch' id='hatch' state={this.props.state.hatch} onUpdate={this.onUpdate} title='Crosshatch'></CheckBox>
                        <div style={{'display': this.props.state.hatch ? 'none' : 'block'}}>
                            <ComboBox key='colormap' id='colormap' state={this.props.state.colormap} def={defaults['map'].colormap} onUpdate={this.onUpdate} url='/api/colormaps/' title='Colourmap'></ComboBox>
                        </div>
                        <CheckBox key='legend' id='legend' state={this.props.state.legend} onUpdate={this.onUpdate} title='Show Legend'></CheckBox>
                        <h1>Levels</h1>
                        <CheckBox key='autolevels' id='autolevels' state={this.state.autolevels} onUpdate={this.onUpdateAuto} title='Auto Levels'></CheckBox>
                        <input type="text" style={{'display': this.state.autolevels ? 'none' : 'inline-block'}} value={this.state.levels} onChange={this.levelsChanged} onBlur={this.updateLevels} />
                    </div>
                </div>
               );
    }
});

var Range = React.createClass({
    updateParent: function() {
        var range = 'auto';
        if (!this.state.auto) {
            range = this.state.min.toString() + ',' + this.state.max.toString();
        }
        this.props.onUpdate(this.props.id, range);
    },
    autoChanged: function(e) {
        this.setState({
            auto: e.target.checked
        });

        var range = 'auto';
        if (!e.target.checked) {
            range = this.state.min.toString() + ',' + this.state.max.toString();
        }
        this.props.onUpdate(this.props.id, range);
    },
    rangeChanged: function(e) {
        this.setState({
            min: this.refs.min.value,
            max: this.refs.max.value
        });
    },
    getInitialState: function() {
        return {
            auto: true,
            min: -10,
            max: 10
        }
    },
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.state.indexOf(",") != -1) {
            var scale = nextProps.state.split(",");
            this.setState({
                min: parseFloat(scale[0]),
                max: parseFloat(scale[1]),
            });
        } else {
            this.setState({
                auto: true,
            });
        }
    },
    render: function() {
        return (
                <div className='range'>
                <h1>{this.props.title}</h1>
                <input type='checkbox' id={this.props.id + '_auto'} checked={this.state.auto} onChange={this.autoChanged} />
                <label htmlFor={this.props.id + '_auto'}>Auto Range</label>
                <div style={{'display': this.state.auto ? 'none' : 'block'}}>
                <label htmlFor={this.props.id + '_min'}>Min:</label>
                <input ref='min' id={this.props.id + '_min'} type='number' disabled={this.state.auto} value={this.state.auto ? '' : this.state.min} onChange={this.rangeChanged} onBlur={this.updateParent} />
                </div>
                <div style={{'display': this.state.auto ? 'none' : 'block'}}>
                <label htmlFor={this.props.id + '_max'}>Max:</label>
                <input ref='max' id={this.props.id + '_max'} type='number' disabled={this.state.auto} value={this.state.auto ? '' : this.state.max} onChange={this.rangeChanged} onBlur={this.updateParent} />
                </div>
                </div>
               );
    }
});

var NumberBox = React.createClass({
    updateParent: function() {
        this.props.onUpdate(this.props.id, this.state.value);
    },
    changed: function(e) {
        this.setState({
            value: this.refs.number.value,
        });
    },
    getInitialState: function() {
        return {
            value: this.props.state
        }
    },
    keyPress: function(e) {
        var key = e.which || e.keyCode;
        if (key == 13) {
            this.changed();
            this.updateParent();
            return false;
        } else {
            return true;
        }
    },
    helpClicked: function(e) {
        var helpdiv = this.refs.help.style;
        helpdiv.display = 'block';
        helpdiv.paddingTop = '5em';
    },
    closeHelp: function(e) {
        if (e.target.className.toLowerCase() == 'modal') {
            this.refs.help.style.display = 'none';
        }
    },
    render: function() {
        var hasHelp = (this.props.children != null && this.props.children.length > 0);
        return (
                <div className='range'>
                <h1>{this.props.title}
                    <span onClick={this.helpClicked} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
                </h1>

                <div className="modal" ref="help" onClick={this.closeHelp}>
                    <div className="modal-content">
                        {this.props.children}
                    </div>
                </div>

                <div>
                <label htmlFor={this.props.id}>Value:</label>
                <input ref='number' id={this.props.id} type='number' value={this.state.value} onChange={this.changed} onBlur={this.updateParent} onKeyPress={this.keyPress} />
                </div>
                </div>
               );
    }
});

var ComboBox = React.createClass({
    getInitialState: function() {
        return {
            data: [],
            url: null
        };
    },
    handleChange: function(e) {
        var value = e.target.value;
        if (this.props.multiple) {
            value = [];
            var options = e.target.options;
            for (var i = 0, l = options.length; i < l; i++) {
                if (options[i].selected) {
                    value.push(options[i].value);
                }
            }
        }
        this.props.onUpdate(this.props.id, value);
        var dataset = e.target.options[e.target.selectedIndex].dataset;
        for (var key in dataset) {
            this.props.onUpdate(this.props.id + '_' + key, dataset[key]);
        }
    },
    populate: function(props) {
        this.setState({
            url: props.url
        });
        if ('url' in props && '' != props.url) {
            $.ajax({
                url: props.url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var ids = data.map(function(d) {return d.id;});
                    if (
                            (this.props.state == '' && typeof(this.props.state) == "string") ||
                            this.props.state == 'none'
                       ) {
                        if (jQuery.inArray('none', ids) == -1) {
                            data.splice(0, 0, {'id': 'none', 'value': 'None'});
                        }
                    }
                    this.setState({
                        data: data,
                    });

                    var a = data.map(function(x) {
                        return x.id
                    });

                    var value = this.props.state;
                    if (jQuery.inArray(this.props.state, a) == -1 || (this.props.state == '' && data.length > 0) || this.props.state == 'all') {
                        if (props.multiple) {
                            if (value == 'all') {
                                value = data.map(function (d) {
                                    return d.id;
                                });
                            } else {
                                value = [value];
                            }
                        }
                    } else {
                        if (data.length == 0) {
                            value = props.def;
                        } else if (data.length == 1) {
                            value = props.def;
                        } else {
                            value = this.props.state;
                        }
                    }
                    if (data.length > 0 && !props.multiple && jQuery.inArray(value, a) == -1) {
                        value = data[0].id;
                    }
                    props.onUpdate(props.id, value);
                    if (a.indexOf(value) != -1) {
                        var d = data[a.indexOf(value)];
                        for (var key in d) {
                            if (d.hasOwnProperty(key) && key != 'id' && key != 'value') {
                                this.props.onUpdate(this.props.id + '_' + key, d[key]);
                            }
                        }
                    }
                }.bind(this),
                error: function(xhr, status, err) {
                    console.error(props.url, status, err.toString());
                }.bind(this)
            });
        } else {
            this.setState({
                data: props.data
            });
        }
    },
    componentDidMount: function() {
        this.populate(this.props)
    },
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.url != this.state.url) {
            this.populate(nextProps);
        }
    },
    helpClicked: function(e) {
        var helpdiv = this.refs.help.style;
        helpdiv.display = 'block';
        helpdiv.paddingTop = '5em';
    },
    closeHelp: function(e) {
        if (e.target.className.toLowerCase() == 'modal') {
            this.refs.help.style.display = 'none';
        }
    },
    render: function() {
        var options = this.state.data.map(function(o) {
            var opts = {
                key: o.id,
                value: o.id,
            }
            for (var key in o) {
                if (key == 'id' || key == 'value') continue;
                if (o.hasOwnProperty(key)) {
                    opts['data-' + key] = o[key];
                }
            }
            return React.createElement("option", opts, o.value);
        });

        if (this.state.data.length > 1) {
            var value = this.props.state;
            if (this.props.multiple && value == 'all') {
                value = this.state.data.map(function(d) {
                    return d.id;
                });
            }

            var hasHelp =
                (this.props.children != null && this.props.children.length > 0) ||
                this.state.data.slice(-1)[0].hasOwnProperty('help');

            var helpOptions = [];
            if (this.state.data.slice(-1)[0].hasOwnProperty('help')) {
                helpOptions = this.state.data.map(function(d) {
                    return (
                        <p key={d.id}><em>{d.value}</em>: <span dangerouslySetInnerHTML={{ __html: d.help}} /></p>
                           );
                });
            }

            return (
                    <div key={this.props.url}>
                    <h1>
                    {this.props.title}
                    <span onClick={this.helpClicked} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
                    </h1>

                    <div className="modal" ref="help" onClick={this.closeHelp}>
                        <div className="modal-content">
                            {this.props.children}
                            {helpOptions}
                        </div>
                    </div>


                    <select
                    size={ Math.min(10, this.props.multiple ? this.state.data.length : 1) }
                    value={value}
                    onChange={this.handleChange}
                    multiple={this.props.multiple}>
                    {options}
                    </select>
                    </div>
                   );
        } else {
            return null;
        }
    }
});

var InterpolationOptions = React.createClass({
    onUpdate: function(k, v) {
        if (k == 'neighbours') {
            v = parseInt(v);
        }
        var state = {};
        state[k] = v;
        var newState = jQuery.extend({}, this.props.state, state);
        this.props.onUpdate(this.props.id, newState);
    },
    show: function(e) {
        var p = $(e.target.parentNode);
        if (p.hasClass("collapsed")) {
            p.removeClass("collapsed");
        } else {
            p.addClass("collapsed");
        }
        p.children("div").slideToggle("fast");
    },
    render: function() {
        var interp_methods = [
        { id: 'inv_square', value: 'Inverse Square Distance' },
        { id: 'bilinear', value: 'Bilinear' },
        { id: 'nn', value: 'Nearest Neighbour' },
        ];
        return (
                <div className='collapsible collapsed'>
                <h1 onClick={this.show}>{this.props.title}</h1>
                <div className='sub'>
                <ComboBox id='method' state={this.props.state.method} data={interp_methods} onUpdate={this.onUpdate} title='Method'></ComboBox>
                <div style={{'display': (this.props.state.method == 'inv_square') ? 'block' : 'none'}}>
                <NumberBox id='neighbours' state={this.props.state.neighbours} onUpdate={this.onUpdate} title='Neighbours'></NumberBox>
                </div>
                </div>
                </div>
               );
    }
});

var TransectComboBox = React.createClass({
    getInitialState: function() {
        return {
            data: [],
            name: this.props.state.name,
            points: this.props.state.pts,
            url: null,
        };
    },
    handleChange: function(e) {
        var name = e.target.value;
        this.setState({
            name: name,
        });
        if (name != 'custom') {
            this.props.onUpdate(this.props.id + "_pts", this.state.datamap[name]);
            this.props.onUpdate(this.props.id + "_name", name);
            this.setState({
                points: this.state.datamap[name],
            });
        }
    },
    componentDidMount: function() {
        this.setState({
            url: this.props.url
        });
        $.ajax({
            url: this.props.url,
            dataType: 'json',
            cache: false,
            success: function(data) {
                var datamap = {}
                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < data[i].transects.length; j++) {
                        datamap[data[i].transects[j].name] = data[i].transects[j].pts;
                    }
                }
                this.setState({
                    data: data,
                    datamap: datamap,
                });

                if (this.state.name == '' && this.state.points == '' && data.length > 0) {
                    var name = 'Flemish Cap';
                    this.setState({
                        name: name,
                        points: datamap[name],
                    });
                    this.props.onUpdate(this.props.id + "_pts", this.state.points);
                    this.props.onUpdate(this.props.id + "_name", this.state.name);
                } else if (this.state.name == '' && this.state.points != '') {
                    this.setState({
                        name: 'custom',
                    });
                }
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },
    map: null,
    vectorSource: null,
    showMap: function(pts) {
        if (pts.constructor !== Array) {
            pts = this.state.points;
        } else {
            this.setState({
                points: pts,
            });
        }

        var m = jQuery(this.refs.map);
        var emSize = parseFloat($("body").css("font-size"));
        var pad = 3 * emSize;
        m.height(jQuery(document).height() - 16*emSize);
        m.parent().css('margin-top', pad + 'px');
        this.refs.mapwindow.style.display = 'block';

        if (this.map == null) {
            this.vectorSource = new ol.source.Vector({
                features: [],
            });
            this.map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            attributions: [
                                new ol.Attribution({
                                    html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
                                        'rest/services/Ocean_Basemap/MapServer">ArcGIS</a>'
                                })
                            ],
                            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
                                'Ocean_Basemap/MapServer/tile/{z}/{y}/{x}'
                        })
                    }),
                    new ol.layer.Vector({
                        source: this.vectorSource,
                        style: new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: '#ff0000',
                                width: 2
                            })
                        })
                    }),
                ],
                target: 'map',
                controls: ol.control.defaults({
                    zoom: true,
                    attributionOptions: ({
                        collapsible: true
                    })
                }),
            });
            var draw = new ol.interaction.Draw({
                source: this.vectorSource,
                type: 'LineString',
            });
            draw.on('drawstart', function(e) {
                this.vectorSource.clear();
            }.bind(this));
            draw.on('drawend', function(e) {
                this.setState({
                    points: e.feature.getGeometry().getCoordinates().map(function (c) {
                        var lonlat = ol.proj.transform(c, 'EPSG:3857','EPSG:4326');
                        return lonlat[1] + "," + lonlat[0];
                    }),
                    name: 'custom',
                });
            }.bind(this));
            this.map.addInteraction(draw);
        }
        this.vectorSource.clear();
        var points = pts.map(function (p) {
            var p_arr = p.split(",");
            return ol.proj.transform([parseFloat(p_arr[1]), parseFloat(p_arr[0])], 'EPSG:4326', 'EPSG:3857')
        });
        var feature = new ol.Feature({
            geometry: new ol.geom.LineString(points)
        });
        this.vectorSource.addFeature(feature);

        this.map.updateSize();
        this.map.setView(new ol.View({
            center: ol.proj.transform([0, 0], 'EPSG:4326', 'EPSG:3857'),
            projection: 'EPSG:3857',
            zoom: 5,
            maxZoom: 10,
            minZoom: 2,
        }));
        this.map.getView().fit(this.vectorSource.getExtent(), this.map.getSize());
        this.map.getView().setZoom(this.map.getView().getZoom() - 1);
    },
    closeMap: function(e) {
        if ((e.target.tagName.toLowerCase() == 'input' && e.target.value != 'Clear') ||
                e.target.className.toLowerCase() == 'modal') {
            this.refs.mapwindow.style.display = 'none';
            this.props.onUpdate(this.props.id + '_pts', this.state.points);
            this.props.onUpdate(this.props.id + '_name', '');
        }
    },
    clearMap: function(e) {
        this.vectorSource.clear();
    },
    parsecsv: function(e) {
        if (e.target.files.length == 1) {
            var file = e.target.files[0];
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
                    if (lat == -1) {
                        alert("Error: Could not find latitude column. Should be one of: latitude, lat");
                        return;
                    }
                    if (lon == -1) {
                        alert("Error: Could not find longitude column. Should be one of: longitude, lon");
                        return;
                    }
                    var points = results.data.map(function(r) {
                        return r[lat] + "," + r[lon];
                    });

                    this.setState({
                        name: 'custom',
                        points: points
                    });
                    this.props.onUpdate(this.props.id + '_pts', points);
                    this.props.onUpdate(this.props.id + '_name', '');
                }.bind(this)
            });
        }
        e.target.value = '';
        if (e.target.value) {
            e.target.type = 'text';
            e.target.type = 'file';
        }
        return false;
    },
    helpClicked: function(e) {
        var helpdiv = this.refs.help.style;
        helpdiv.display = 'block';
        helpdiv.paddingTop = '5em';
    },
    closeHelp: function(e) {
        if (e.target.className.toLowerCase() == 'modal') {
            this.refs.help.style.display = 'none';
        }
    },
    render: function() {
        var options = [];

        var groups = [];
        for (var i = 0; i < this.state.data.length; i++) {
            var o = this.state.data[i].transects.map(function(o) {
                return (
                        <option key={o.name} value={o.name}>
                        {o.name}
                        </option>
                       );
            });
            groups.push(o);
        }

        for (var i = 0; i < this.state.data.length; i++) {
            options.push(
                    <optgroup key={i} label={this.state.data[i].name}>
                    {groups[i]}
                    </optgroup>
                    );
        }

        return (
                <div key={this.props.url} className='transect'>
                <h1>
                {this.props.title}
                <span onClick={this.helpClicked}>?</span>
                </h1>

                <div className="modal" ref="help" onClick={this.closeHelp}>
                    <div className="modal-content">
                        <h1>{this.props.title}</h1>
                        <p>Here you can select your path from the predefined options, or pick 'Custom' and define your own.</p>
                        <p>To define your own, you can click on multiple points on a map (double-click ends the path), or supply a CSV file. The CSV file must have a header line with <code>latitude</code> and <code>longitude</code> included.</p>
                    </div>
                </div>

                <select
                value={this.state.name}
                onChange={this.handleChange}>
                {options}
                <option value="custom" disabled>Custom</option>
                </select>

                <input type='file' ref='fileinput' style={{'display': 'none'}} onChange={this.parsecsv} />
                <div className='buttons'>
                    <input type='button' value='Draw on Map&hellip;' onClick={this.showMap} />
                    <input type='button' value='Upload CSV&hellip;' onClick={function() {this.refs.fileinput.click()}.bind(this)} />
                </div>

                <br style={{'clear': 'right', 'height': '0px'}} />

                <div ref='mapwindow' className='modal' onClick={this.closeMap} >
                <div className='modal-content'>
                <div ref='map' id='map' style={{'height': '500px'}}></div>
                <div className='map-footer'>
                <p>Click to draw a transect. Double-click ends.</p>
                <input type="button" value="Done" onClick={this.closeMap} />
                <input type="button" value="Clear" onClick={this.clearMap} />
                </div>
                </div>
                </div>
                </div>
                );
    }
});

var LocationComboBox = React.createClass({
    getInitialState: function() {
        return {
            data: [],
            value: '',
            url: null,
        };
    },
    handleChange: function(e) {
        var value = e.target.value;
        this.setState({
            value: value,
        });
        if (value == 'custom') {
            this.showMap();
        } else {
            this.props.onUpdate(this.props.id, value);
        }
    },
    componentDidMount: function() {
        this.setState({
            url: this.props.url
        });
        $.ajax({
            url: this.props.url,
            dataType: 'json',
            cache: false,
            success: function(data) {
                this.setState({
                    data: data,
                });
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },
    map: null,
    showMap: function() {
        var m = jQuery(this.refs.map);
        var emSize = parseFloat($("body").css("font-size"));
        var pad = 3 * emSize;
        m.height(jQuery(document).height() - 16*emSize);
        m.parent().css('margin-top', pad + 'px');
        this.refs.mapwindow.style.display = 'block';

        if (this.map == null) {
            this.map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            attributions: [
                                new ol.Attribution({
                                    html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
                                        'rest/services/Ocean_Basemap/MapServer">ArcGIS</a>'
                                })
                            ],
                            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
                                'Ocean_Basemap/MapServer/tile/{z}/{y}/{x}'
                        })
                    }),
                ],
                target: 'map',
                controls: ol.control.defaults({
                    zoom: true,
                    attributionOptions: ({
                        collapsible: true
                    })
                }),
            });
            var drag = new ol.interaction.DragBox({
                condition: ol.events.condition.shiftKeyOnly,
            });
            drag.on('boxstart', function(e) {
                this.setState({
                    startpoint: ol.proj.transform(e.coordinate, 'EPSG:3857','EPSG:4326')
                });
            }.bind(this));
            drag.on('boxend', function(e) {
                var lonlat = ol.proj.transform(e.coordinate, 'EPSG:3857','EPSG:4326');

                var coords = [
                    [
                        Math.min(this.state.startpoint[1], lonlat[1]),
                        Math.min(this.state.startpoint[0], lonlat[0]),
                    ],
                    [
                        Math.max(this.state.startpoint[1], lonlat[1]),
                        Math.max(this.state.startpoint[0], lonlat[0]),
                    ],
                ];
                    this.setState({
                        coordinates: coords
                    });
                    this.refs.mapwindow.style.display = 'none';
                    this.props.onUpdate(this.props.id, coords);
            }.bind(this));
            this.map.addInteraction(drag);
        }
        this.map.updateSize();
        this.map.setView(new ol.View({
            center: ol.proj.transform([0, 0], 'EPSG:4326', 'EPSG:3857'),
            projection: 'EPSG:3857',
            zoom: 2,
            maxZoom: 10,
            minZoom: 1,
        }));
    },
    closeMap: function(e) {
        if ((e.target.tagName.toLowerCase() == 'input' && e.target.value != 'Clear') ||
                e.target.className.toLowerCase() == 'modal') {
            this.refs.mapwindow.style.display = 'none';
        }
    },
    helpClicked: function(e) {
        var helpdiv = this.refs.help.style;
        helpdiv.display = 'block';
        helpdiv.paddingTop = '5em';
    },
    closeHelp: function(e) {
        if (e.target.className.toLowerCase() == 'modal') {
            this.refs.help.style.display = 'none';
        }
    },
    render: function() {
        var options = this.state.data.map(function(o) {
            return (
                    <option key={o.id} value={o.id}>
                    {o.value}
                    </option>
                   );
        });

        var hasHelp = false;
        var helpOptions = [];
        if (this.state.data.length > 1) {
            hasHelp =
                (this.props.children != null && this.props.children.length > 0) ||
                this.state.data.slice(-1)[0].hasOwnProperty('help');

            if (this.state.data.slice(-1)[0].hasOwnProperty('help')) {
                helpOptions = this.state.data.map(function(d) {
                    return (
                        <p key={d.id}><em>{d.value}</em>: <span dangerouslySetInnerHTML={{ __html: d.help}} /></p>
                            );
                });
            }
        }

        return (
                <div key={this.props.url} className='location'>
                <h1>
                {this.props.title}
                <span onClick={this.helpClicked} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
                </h1>

                <div className="modal" ref="help" onClick={this.closeHelp}>
                    <div className="modal-content">
                        {this.props.children}
                        {helpOptions}
                        <p><em>Custom</em>: Custom area selection, Mercator Projection</p>
                    </div>
                </div>

                <select
                value={this.state.value}
                onChange={this.handleChange}>
                {options}
                <option value="custom">Custom...</option>
                </select>

                <input type='button' value='Edit Custom...' onClick={this.showMap} style={{'display': (this.state.value == 'custom') ? 'inline-block' : 'none'}} />
                <br style={{'clear': 'right', 'height': '0px'}} />

                <div ref='mapwindow' className='modal' onClick={this.closeMap} >
                <div className='modal-content'>
                <div ref='map' id='map' style={{'height': '500px'}}></div>
                <div className='map-footer'>
                <p>Hold shift and and drag to select an area.</p>
                </div>
                </div>
                </div>
                </div>
                );
    }
});

var StationComboBox = React.createClass({
    getInitialState: function() {
        return {
            data: [],
            value: '',
            url: null,
            lat: 0,
            lon: 0,
        };
    },
    handleChange: function(e) {
        var value = e.target.value;
        if (value != 'custom') {
            var lat = parseFloat(this.state.datamap[value].split(",")[0]);
            var lon = parseFloat(this.state.datamap[value].split(",")[1]);
            this.setState({
                value: value,
                lat: lat,
                lon: lon,
            });
            this.refs.lat.value = lat.toFixed(4),
            this.refs.lon.value = lon.toFixed(4),
            this.props.onUpdate(this.props.id, this.state.datamap[value]);
            this.props.onUpdate('station_name', value);
        }
    },
    locationChanged: function() {
        var lat = parseFloat(this.refs.lat.value);
        var lon = parseFloat(this.refs.lon.value);
        this.setState({
            lat: lat,
            lon: lon,
            value: 'custom',
        });
        this.props.onUpdate(this.props.id, lat + "," + lon);
        this.props.onUpdate('station_name', 'custom');
    },
    updateParent: function() {
        var loc = this.state.lat + "," + this.state.lon;
        this.props.onUpdate(this.props.id, loc);
    },
    keyPress: function(e) {
        var key = e.which || e.keyCode;
        if (key == 13) {
            this.locationChanged();
            this.updateParent();
            return false;
        } else {
            return true;
        }
    },
    componentDidMount: function() {
        this.setState({
            url: this.props.url
        });
        $.ajax({
            url: this.props.url,
            dataType: 'json',
            cache: false,
            success: function(data) {
                var datamap = {}
                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < data[i].stations.length; j++) {
                        datamap[data[i].stations[j].name] = data[i].stations[j].point;
                    }
                }
                var value = this.state.value;
                if (this.state.value == '' && data.length > 0) {
                    value = this.props.def;
                    this.setState({
                        value: value,
                    });
                }
                this.refs.lat.value = parseFloat(datamap[value].split(",")[0]).toFixed(4);
                this.refs.lon.value = parseFloat(datamap[value].split(",")[1]).toFixed(4);
                this.setState({
                    data: data,
                    datamap: datamap,
                    lat: parseFloat(this.refs.lat.value),
                    lon: parseFloat(this.refs.lon.value),
                });

                this.props.onUpdate(this.props.id, datamap[value]);
                this.props.onUpdate('station_name', this.props.def);
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },
    map: null,
    vectorSource: null,
    showMap: function() {
        var m = jQuery(this.refs.map);
        var emSize = parseFloat($("body").css("font-size"));
        var pad = 3 * emSize;
        m.height(jQuery(document).height() - 16*emSize);
        m.parent().css('margin-top', pad + 'px');
        this.refs.mapwindow.style.display = 'block';

        var style = new ol.style.Style({
            image: new ol.style.Icon({
                color: '#ff0000',
                src: '/images/dot.png',
            })
        });
        if (this.map == null) {
            this.vectorSource = new ol.source.Vector({
                features: [],
            });
            this.map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({
                            attributions: [
                                new ol.Attribution({
                                    html: 'Tiles &copy; <a href="http://services.arcgisonline.com/ArcGIS/' +
                                        'rest/services/Ocean_Basemap/MapServer">ArcGIS</a>'
                                })
                            ],
                            url: 'http://server.arcgisonline.com/ArcGIS/rest/services/' +
                                'Ocean_Basemap/MapServer/tile/{z}/{y}/{x}'
                        })
                    }),
                    new ol.layer.Vector({
                        source: this.vectorSource,
                    }),
                ],
                target: 'map',
                controls: ol.control.defaults({
                    zoom: true,
                    attributionOptions: ({
                        collapsible: true
                    })
                }),
            });
            this.map.on('click', function(e) {
                this.vectorSource.clear();

                var lonlat = ol.proj.transform(e.coordinate, 'EPSG:3857','EPSG:4326');
                while (lonlat[0] < -180) {
                    lonlat[0] += 360;
                }
                while (lonlat[0] > 180) {
                    lonlat[0] -= 360;
                }

                var feature = new ol.Feature({
                    geometry: new ol.geom.Point(ol.proj.transform(lonlat, 'EPSG:4326', 'EPSG:3857'))
                });
                feature.setStyle(style);
                this.vectorSource.addFeature(feature);
                this.setState({
                    lon: lonlat[0],
                    lat: lonlat[1],
                    value: 'custom',
                });
                this.props.onUpdate('station_name', '');
                this.refs.lat.value = parseFloat(lonlat[1]).toFixed(4);
                this.refs.lon.value = parseFloat(lonlat[0]).toFixed(4);
            }.bind(this));
        }
        this.vectorSource.clear();
        var feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.transform([this.state.lon, this.state.lat], 'EPSG:4326', 'EPSG:3857'))
        });
        feature.setStyle(style);
        this.vectorSource.addFeature(feature);

        this.map.updateSize();
        this.map.setView(new ol.View({
            center: ol.proj.transform([this.state.lon, this.state.lat], 'EPSG:4326', 'EPSG:3857'),
            projection: 'EPSG:3857',
            zoom: 5,
            maxZoom: 10,
            minZoom: 2,
        }));
    },
    closeMap: function(e) {
        if (e.target.tagName.toLowerCase() == 'input' ||
                e.target.className.toLowerCase() == 'modal') {
            this.refs.mapwindow.style.display = 'none';
            this.updateParent();
        }
    },
    render: function() {
        var options = [];

        var groups = [];
        for (var i = 0; i < this.state.data.length; i++) {
            var o = this.state.data[i].stations.map(function(o) {
                return (
                        <option key={o.name} value={o.name}>
                        {o.name}
                        </option>
                       );
            });
            groups.push(o);
        }

        for (var i = 0; i < this.state.data.length; i++) {
            options.push(
                    <optgroup key={i} label={this.state.data[i].name}>
                    {groups[i]}
                    </optgroup>
                    );
        }

        return (
                <div key={this.props.url}>
                <h1>
                {this.props.title}
                </h1>

                <select
                value={this.state.value}
                onChange={this.handleChange}>
                {options}
                <option value="custom" disabled>Custom</option>
                </select>

                <div className='latlon'>
                <div>
                <label htmlFor={this.props.id + '_lat'}>Lat:</label>
                <input ref='lat' id={this.props.id + '_lat'} type='number' step='0.0001' defaultValue={parseFloat(this.state.lat).toFixed(4)} onBlur={this.locationChanged} onKeyPress={this.keyPress} />
                </div>
                <div>
                <label htmlFor={this.props.id + '_lon'}>Lon:</label>
                <input ref='lon' id={this.props.id + '_lon'} type='number' step='0.0001' defaultValue={parseFloat(this.state.lon).toFixed(4)} onBlur={this.locationChanged} onKeyPress={this.keyPress} />
                </div>
                <div>
                <label /><input type="button" value="Map" onClick={this.showMap} />
                </div>
                </div>
                <div ref='mapwindow' className='modal' onClick={this.closeMap} >
                <div className='modal-content'>
                <div ref='map' id='map' style={{'height': '500px'}}></div>
                <div className='map-footer'>
                <input type="button" value="Done" onClick={this.closeMap} />
                <p>
                Latitude: {parseFloat(this.state.lat).toFixed(4)}<br />
                Longitude: {parseFloat(this.state.lon).toFixed(4)}
        </p>
            </div>
            </div>
            </div>
            </div>
            );
    }
});

var Size = React.createClass({
    getInitialState: function() {
        return {
            width: 10,
            height: 7.5,
            dpi: 72,
        }
    },
    show: function(e) {
        var p = $(e.target.parentNode);
        if (p.hasClass("collapsed")) {
            p.removeClass("collapsed");
        } else {
            p.addClass("collapsed");
        }
        p.children("div").slideToggle("fast");
    },
    changed: function() {
        this.setState({
            width: parseFloat(this.refs.width.value),
            height: parseFloat(this.refs.height.value),
            dpi: parseFloat(this.refs.dpi.value),
        });
        this.props.onUpdate('size', parseFloat(this.refs.width.value) + 'x' + parseFloat(this.refs.height.value));
        this.props.onUpdate('dpi', parseFloat(this.refs.dpi.value));
    },
    render: function() {
        return (
                <div className='collapsible collapsed size'>
                <h1 onClick={this.show}>{this.props.title}</h1>
                <div className='sub'>
                <div>
                <label htmlFor={this.props.id + '_width'}>Width:</label>
                <input ref='width' id={this.props.id + '_width'} type='number' step='0.25' defaultValue={parseFloat(this.state.width).toFixed(2)} onBlur={this.changed} />
                in
                </div>
                <div>
                <label htmlFor={this.props.id + '_height'}>Height:</label>
                <input ref='height' id={this.props.id + '_height'} type='number' step='0.25' defaultValue={parseFloat(this.state.height).toFixed(2)} onBlur={this.changed} />
                in
                </div>
                <div>
                <label htmlFor={this.props.id + '_dpi'}>DPI:</label>
                <input ref='dpi' id={this.props.id + '_dpi'} type='number' step='1' defaultValue={parseFloat(this.state.dpi).toFixed(0)} onBlur={this.changed} />
                </div>
                </div>
                </div>
               );
    },
});

var TimePicker = React.createClass({
    getInitialState: function() {
        return {
            data: [],
            value: this.props.def,
            url: null,
            map: {},
            revmap: {},
            times: [],
        };
    },
    populate: function(props) {
        this.setState({
            url: props.url
        });
        if ('url' in props && '' != props.url) {
            $.ajax({
                url: props.url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var map = {};
                    var revmap = {};
                    var min = 0;
                    var max = data.length - 1;
                    if (this.props.hasOwnProperty('min')) {
                        min = parseInt(this.props.min) + 1;
                        if (min < 0) {
                            min += data.length;
                        }
                    }
                    if (this.props.hasOwnProperty('max')) {
                        max = parseInt(this.props.max) - 1;
                        if (max < 0) {
                            max += data.length;
                        }
                    }
                    for (var d in data) {
                        map[data[d].id] = data[d].value;
                        revmap[data[d].value] = data[d].id;
                    }
                    this.setState({
                        data: data,
                        map: map,
                        revmap: revmap,
                    });
                    this.pickerChange();

                    var picker;
                    switch(props.quantum) {
                        case 'month':
                            picker = $(this.refs.picker).MonthPicker({
                                Button: false,
                                MonthFormat: "MM yy",
                                OnAfterMenuClose: this.pickerChange,
                                MinMonth: map[min],
                                MaxMonth: map[max],
                            });
                            break;
                        case 'day':
                            picker = $(this.refs.picker).datepicker({
                                Button: false,
                                dateFormat: "dd MM yy",
                                onClose: this.pickerChange,
                                minDate: new Date(map[min]),
                                maxDate: new Date(map[max]),
                            });
                        case 'hour':
                            picker = $(this.refs.picker).datepicker({
                                Button: false,
                                dateFormat: "dd MM yy",
                                onClose: this.pickerChange,
                                minDate: new Date(map[min]),
                                maxDate: new Date(map[max]),
                            });
                            break;
                    }
                }.bind(this),
                error: function(xhr, status, err) {
                    console.error(props.url, status, err.toString());
                }.bind(this)
            });
        } else {
            this.setState({
                data: props.data
            });
        }
    },
    componentDidMount: function() {
        this.populate(this.props);
    },
    componentWillReceiveProps: function(nextProps) {
        if (nextProps.url != this.state.url ||
            nextProps.min != this.props.min ||
            nextProps.max != this.props.max) {
            this.populate(nextProps);
        }

        this.setState({
            value: nextProps.state
        });
    },
    pickerChange: function() {
        var min = 0;
        var max = -1;
        if (this.props.hasOwnProperty('min')) {
            min = parseInt(this.props.min) + 1;
        }
        if (this.props.hasOwnProperty('max')) {
            max = parseInt(this.props.max) - 1;
        }
        if (min < 0) {
            min += this.state.data.length;
        }
        if (max < 0) {
            max += this.state.data.length;
        }

        if (this.props.quantum == 'hour') {
            var times = [];
            for (var i in this.state.data) {
                if (this.state.data[i].value.indexOf(this.refs.picker.value) == 0) {
                    if (this.state.data[i].id <= max && this.state.data[i].id >= min) {
                        times.unshift({
                            id: this.state.data[i].id,
                            value: $.format.date(new Date(this.state.data[i].value), "HH:mm")
                        });
                    }
                }
            }
            this.setState({
                times: times,
            });
            this.props.onUpdate(this.props.id, times[0].id);
        } else if (this.refs.picker != null) {
            this.props.onUpdate(this.props.id, this.state.revmap[this.refs.picker.value]);
        }
    },
    timeChange: function(e) {
        var value = e.target.value;
        this.setState({
            value: value
        });
        this.props.onUpdate(this.props.id, value);
    },
    render: function() {
        var date;
        var value = parseInt(this.state.value);
        if (value < 0) {
            value += this.state.data.length;
        }

        if (value < 0) {
            value = 0;
        }
        date = new Date(this.state.map[value]);
        var input = "";
        switch(this.props.quantum) {
            case 'month':
                input = <input readOnly ref='picker' type="text" value={$.format.date(date, "MMMM yyyy")} />;
                break;
            case 'day':
            case 'hour':
                input = <input readOnly ref='picker' type="text" value={$.format.date(date, "dd MMMM yyyy")} />;
                break;
        }

        var timeinput = "";
        var options = this.state.times.map(function (t) {
            return (
                <option key={t.id} value={t.id}>
                    {t.value}
                </option>
            );
        });
        if (this.props.quantum == 'hour') {
            timeinput = <select
                            value={this.state.value}
                            onChange={this.timeChange}>
                                {options}
                        </select>;
        }

        return (
            <div key={this.props.url} className='timepicker'>
                <h1>{this.props.title}</h1>

                {input}
                {timeinput}
            </div>
        );
    },
});

var PlotType = React.createClass({
    handleChange: function(e) {
        var value = e.target.value;
        this.props.onUpdate(this.props.id, value);
    },
    helpClicked: function(e) {
        var helpdiv = this.refs.help.style;
        helpdiv.display = 'block';
        helpdiv.paddingTop = '5em';
    },
    closeHelp: function(e) {
        if (e.target.className.toLowerCase() == 'modal') {
            this.refs.help.style.display = 'none';
        }
    },
    render: function() {
        var hasHelp = true;
        var value = this.props.state;
        if (value == "ctd" || value == "ts" || value == "sound") {
            value = "ctd";
        }
        return (
            <div>
            <h1>
            {this.props.title}
            <span onClick={this.helpClicked} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
            </h1>

            <div className="modal" ref="help" onClick={this.closeHelp}>
                <div className="modal-content">
                    <h1>{this.props.title}</h1>
                    <p><em>Map</em>: 2-Dimensional plot of an area, showing the selected variable with a colourmap.
                                     You can also add a second variable as contours, and can add a vector variable
                                     (water, ice, or wind velocity) as arrows/quivers.</p>
                    <p><em>Virtual Transect</em>: 2-Dimensional plot along a line/curve showing a variable at multiple
                                                  depths. You can optionally add a line plot above the main plot showing
                                                  a second variable at the surface.</p>
                    <p><em>Virtual Mooring</em>: Timeseries plot of a variable at a single location. If a single depth
                                                 is selected, a line plot is produced, but you can also choose to see
                                                 the entire water column at that point and have the variable represented
                                                 as a colourmap.</p>
                    <p><em>Virtual CTD</em>: Plots emulating a perfectly vertical CTD cast at a single location at a
                                             single point in time.</p>
                    <ul>
                        <li><em>CTD Profile</em>: Depth vs Temperature and Salinity plots.</li>
                        <li><em>T/S Diagram</em>: Temperature vs Salinity, with dashed lines showing water density.</li>
                        <li><em>Sound Speed Profile</em>: Depth vs Speed of Sound.</li>
                    </ul>
                    <p><em>Hovm&ouml;ller Diagram</em>: 2-Dimensional plot with time represented on the vertical axis and
                                                        distance along a path on the horizontal. Commonly used for
                                                        meteorological data to highlight the role of waves.
                                                        See <a href="https://en.wikipedia.org/wiki/Hovm%C3%B6ller_diagram">
                                                        description on Wikipedia</a> and example/explanation from <a
                                                        href="https://www.climate.gov/news-features/understanding-climate/hovm%C3%B6ller-diagram-climate-scientist%E2%80%99s-best-friend">NOAA</a>.</p>
                </div>
            </div>

            <select
                size={1}
                value={value}
                onChange={this.handleChange}
            >
                <option value="map">Map</option>
                <option value="transect">Virtual Transect</option>
                <option value="timeseries">Virtual Mooring</option>
                <option value="ctd" disabled={this.props.dataset.indexOf('biomer') == 0}>Virtual CTD</option>
                <option value="hovmoller">Hovm&ouml;ller Diagram</option>
            </select>

            <select
                style={{'display': (value == 'ctd') ? 'inline-block' : 'none'}}
                size={1}
                value={this.props.state}
                onChange={this.handleChange}>
                <option value="ctd">CTD Profile</option>
                <option value="ts">T/S Diagram</option>
                <option value="sound">Sound Speed Profile</option>
            </select>
            </div>
        );
    }
});

ReactDOM.render(<Selector />, document.getElementById('content'));

