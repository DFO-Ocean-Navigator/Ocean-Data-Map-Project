var loading_image = '/images/spinner.gif';
var fail_image = '/images/failure.gif';
var defaults = {
    'type':                'map',
    'dataset':             'giops/monthly/aggregated.ncml',
    'size':                '10x7.5',
    'dpi':                 72,
    'map': {
        'location':        'nwatlantic',
        'time':            '-1',
        'variable':        'votemper',
        'anomaly':         false,
        'depth':           '0',
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
        'contour':         '',
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
        'starttime':       '0',
        'endtime':         '-1',
        'colormap':        'default',
        'scale':           'auto',
    },
}
var imagePreloader = new Image();
var Plot = React.createClass({
    buildQuery: function(q) {
        var query = {
            'type': q.type,
            'dataset': q.dataset,
        }
        for (var key in defaults[q.type]) {
            if (defaults[q.type].hasOwnProperty(key)) {
                query[key] = q[key];
            }
        }

        return JSON.stringify(query);
    },
    buildURL: function(q) {
        return '/plot/?query=' + this.buildQuery(q);
    },
    getInitialState: function() {
        return {
            'url': this.buildURL(this.props.query),
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
        var oldQueryURL = this.buildURL(this.props.query);
        var newQueryURL = this.buildURL(nextprops.query);

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
    copyURL: function() {
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

		var url;
		if (window.location.href.endsWith('/')) {
			url = window.location.href.slice(0, -1) + this.buildURL(this.props.query);
		} else {
			url = window.location.href + this.buildURL(this.props.query);
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
        var geotiff = "";
        if (this.props.query.type == 'map') {
            geotiff = <option value='geotiff'>GeoTIFF</option>;
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
                            <option value=''>Save Image</option>
                            <option value='png'>PNG</option>
                            <option value='pdf'>PDF</option>
                            <option value='svg'>SVG</option>
                            <option value='ps'>PS</option>
                            <option value='eps'>EPS</option>
                            <option value='tif'>TIFF</option>
                            {geotiff}
                        </select>
                        <input type='button' value='Open In New Window' onClick={this.newWindow} disabled={disableButtons} />
                        <input type='button' value='Copy Image URL' onClick={this.copyURL} style={{'display': showCopy ? 'inline-block' : 'none'}} disabled={disableButtons}/>
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

        return state;
    },
    onUpdate: function(key, value) {
        var newstate = {};
        newstate[key] = value;
        if (key == 'type') {
            for (var key in defaults[value]) {
                if (defaults[value].hasOwnProperty(key)) {
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
                            'linearthresh',
                            'colormap',
                            'bathymetry',
                            'size',
                        ]
                    ) != -1) {
                    continue;
                }
                if (defaults[this.state.type].hasOwnProperty(key)) {
                    newstate[key] = defaults[this.state.type][key];
                }
            }
        }
        this.setState(newstate);
    },
    render: function() {
        var inputmap = {
            'dataset': (<ComboBox key='dataset' id='dataset' state={this.state.dataset} def={defaults.dataset} onUpdate={this.onUpdate} url='/api/datasets/'>Dataset</ComboBox>),
            'plottype': (<ComboBox key='type' id='type' state={this.state.type} def={defaults.type} onUpdate={this.onUpdate} data={[{'id': 'map', 'value': 'Map'}, {'id': 'transect', 'value': 'Transect'},{'id': 'timeseries', 'value': 'Timeseries'}]}>Plot Type</ComboBox>),
            'loc': (<LocationComboBox key='location' id='location' state={this.state.location} onUpdate={this.onUpdate} url='/api/locations/'>Location</LocationComboBox>),
            'time': (<ComboBox key='time' id='time' state={this.state.time} def={defaults[this.state.type].time} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset + ((this.state.dataset.indexOf('riops') != -1) ? '&format=%d %B %Y %H:%M' : '')}>Time</ComboBox>),
            'variable': (<ComboBox key='variable' state={this.state.variable} id='variable' def={defaults[this.state.type].variable} onUpdate={this.onUpdate} url={'/api/variables/?vectors&dataset=' + this.state.dataset + ((this.state.type == 'transect') ? '&3d_only' : '')}>Variable</ComboBox>),
            'anomaly': (<CheckBox key='anomaly' id='anomaly' state={this.state.anomaly} onUpdate={this.onUpdate}>Anomaly</CheckBox>),
            'scale': (<Range key='scale' id='scale' state={this.state.scale} def={defaults[this.state.type].scale} onUpdate={this.onUpdate}>Variable Range</Range>),
            'linearthresh': (<NumberBox key='linearthresh' id='linearthresh' state={this.state.linearthresh} onUpdate={this.onUpdate}>Linear Threshold</NumberBox>),
            'depth': (<ComboBox key='depth' id='depth' state={this.state.depth} def={defaults[this.state.type].depth} onUpdate={this.onUpdate} url={'/api/depth/?variable=' + this.state.variable + '&dataset=' + this.state.dataset + '&all=' + (this.state.type == 'timeseries')}>Depth</ComboBox>),
            'colormap': (<ComboBox key='colormap' id='colormap' state={this.state.colormap} def={defaults[this.state.type].colormap} onUpdate={this.onUpdate} url='/api/colormaps/'>Colourmap</ComboBox>),
            'overlay': (<OverlaySelector key='overlay' id='overlay' state={this.state.overlay} onUpdate={this.onUpdate} url='/api/overlays/'>Overlay</OverlaySelector>),
            'bathymetry': (<CheckBox key='bathymetry' id='bathymetry' state={this.state.bathymetry} onUpdate={this.onUpdate}>Bathymetry</CheckBox>),
            'quiver': (<ComboBox key='quiver' id='quiver' state={this.state.quiver} def={defaults[this.state.type].quiver} onUpdate={this.onUpdate} url={'/api/variables/?vectors_only&dataset=' + this.state.dataset}>Arrows</ComboBox>),
            'contour': (<ComboBox key='contour' id='contour' state={this.state.contour} def={defaults[this.state.type].contour} onUpdate={this.onUpdate} url={'/api/variables/?dataset=' + this.state.dataset}>Additional Contours</ComboBox>),
            'showmap': (<CheckBox key='showmap' id='showmap' state={this.state.showmap} onUpdate={this.onUpdate}>Show Location</CheckBox>),
            'surfacevariable': (<ComboBox key='surfacevariable' id='surfacevariable' state={this.state.surfacevariable} def={defaults[this.state.type].surfacevariable} onUpdate={this.onUpdate} url={'/api/variables/?dataset=' + this.state.dataset}>Surface Variable</ComboBox>),
            'transect_pts': (<TransectComboBox key='transect_pts' id='transect_pts' state={this.state.transect_pts} onUpdate={this.onUpdate} url='/api/transects'>Transect</TransectComboBox>),
            'station': (<StationComboBox key='station' id='station' state={this.state.station} onUpdate={this.onUpdate} url='/api/stations'>Station</StationComboBox>),
            'starttime': (<ComboBox key='starttime' id='starttime' state={this.state.starttime} def={defaults[this.state.type].starttime} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset}>Start Time</ComboBox>),
            'endtime': (<ComboBox key='endtime' id='endtime' state={this.state.endtime} def={defaults[this.state.type].endtime} onUpdate={this.onUpdate} url={'/api/timestamps/?dataset=' + this.state.dataset}>End Time</ComboBox>),
            'interp': (<InterpolationOptions key='interpolation' id='interpolation' onUpdate={this.onUpdate}>Interpolation</InterpolationOptions>),
            'size': (<Size key='size' id='size' onUpdate={this.onUpdate}>Image Size</Size>),
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
            'transect_pts',
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
    getInitialState: function() {
        return {
            data: [],
            value: this.props.state,
            url: null
        };
    },
    handleChange: function(e) {
        this.props.onUpdate(this.props.id, e.target.checked);
        this.setState({
            value: e.target.checked
        });
    },
    componentWillReceiveProps: function(nextProps) {
        this.setState({
            value: nextProps.state,
        });
    },
    render: function() {
        return (
                <div>
                <input type='checkbox' id={this.props.id} onChange={this.handleChange} checked={this.state.value} />
                <label htmlFor={this.props.id}>{this.props.children}</label>
                </div>
               );
    }
});

var OverlaySelector = React.createClass({
    getInitialState: function() {
        return {
            file: '',
            selection: 'all',
            labelcolor: 'k',
            edgecolor: 'k',
            facecolor: 'k',
            alpha: 0.5,
        }
    },
    onUpdate: function(key, value) {
        var state = {}
        state[key] = value;
        if (key == 'file') {
            state['selection'] = 'all';
        }
        this.setState(state);
        var newState = jQuery.extend({}, this.state, state);
        this.props.onUpdate(this.props.id, newState);
    },
    alphaChanged: function(e) {
        this.onUpdate('alpha', e.target.value);
    },
    render: function() {
        return (
                <div key='overlay' className='overlayselector'>
                <ComboBox id='file' state={this.state.file} def='' onUpdate={this.onUpdate} url='/api/overlays/'>Overlay</ComboBox>
                <div className='sub' style={{'display': (this.state.file == 'none' || this.state.file == '') ? 'none' : 'block'}}>
                <ComboBox id='selection' multiple state={this.state.selection} def='all' onUpdate={this.onUpdate} url={'/api/overlays/?file=' + this.state.file}>Name</ComboBox>
                <ComboBox id='labelcolor' state='k' onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'}>Label Color</ComboBox>
                <ComboBox id='edgecolor' state='k' onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'}>Edge Color</ComboBox>
                <ComboBox id='facecolor' state='none' onUpdate={this.onUpdate} url={'/api/colors/?none=true&random=true'}>Face Color</ComboBox>
                <div className='input'>
                <label forName='alpha'>Alpha:</label>
                <input id='alpha' type='range' min={0.0} max={1.0} step={0.05} value={this.state.alpha} onChange={this.alphaChanged} />
                </div>
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
                <h1>{this.props.children}</h1>
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
    render: function() {
        return (
                <div className='range'>
                <h1>{this.props.children}</h1>
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
            value: this.props.multiple ? [] : '',
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
        this.setState({
            value: value
        });
        this.props.onUpdate(this.props.id, value);
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
                    if (this.props.state == '') {
                        data.splice(0, 0, {'id': 'none', 'value': 'None'});
                    }
                    this.setState({
                        data: data,
                    });

                    var a = data.map(function(x) {
                        return x.id
                    });

                    if (jQuery.inArray(this.state.value, a) == -1 || (this.state.value == '' && data.length > 0) || this.props.state == 'all') {
                        var value = this.props.state;
                        if (props.multiple) {
                            if (value == 'all') {
                                value = data.map(function (d) {
                                    return d.id;
                                });
                            } else {
                                value = [value];
                            }
                        }
                        this.setState({
                            value: value
                        });
                        props.onUpdate(props.id, value);
                    }
                    if (data.length <= 1) {
                        props.onUpdate(props.id, props.def);
                    } else {
                        props.onUpdate(props.id, this.state.value);
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

        this.setState({
            value: nextProps.state
        });
    },
    render: function() {
        var options = this.state.data.map(function(o) {
            return (
                    <option key={o.id} value={o.id}>
                    {o.value}
                    </option>
                   );
        });

        if (this.state.data.length > 1) {
            var value = this.state.value;
            if (this.props.multiple && value == 'all') {
                value = this.state.data.map(function(d) {
                    return d.id;
                });
            }
            return (
                    <div key={this.props.url}>
                    <h1>
                    {this.props.children}
                    </h1>

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
    getInitialState: function() {
        return {
            method: 'inv_square',
            neighbours: 8,
        };
    },
    onUpdate: function(k, v) {
        if (k == 'neighbours') {
            v = parseInt(v);
        }
        var state = {};
        state[k] = v;
        this.setState(state);
        var newState = jQuery.extend({}, this.state, state);
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
                <h1 onClick={this.show}>{this.props.children}</h1>
                <div className='sub'>
                <ComboBox id='method' state={this.state.method} data={interp_methods} onUpdate={this.onUpdate}>Method</ComboBox>
                <div style={{'display': (this.state.method == 'inv_square') ? 'block' : 'none'}}>
                <NumberBox id='neighbours' state={this.state.neighbours} onUpdate={this.onUpdate}>Neighbours</NumberBox>
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
            this.showMap(this.state.datamap[this.state.value]);
        } else {
            this.props.onUpdate(this.props.id, this.state.datamap[value]);
            this.props.onUpdate('transect_name', value);
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

                if (this.state.value == '' && data.length > 0) {
                    var value = 'Flemish Cap';
                    this.setState({
                        value: value
                    });
                }
                this.props.onUpdate(this.props.id, this.state.datamap[this.state.value]);
                this.props.onUpdate('transect_name', 'Flemish Cap');
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
        m.height(jQuery(document).height() - 4*pad);
        m.parent().css('margin-top', pad + 'px');
        this.refs.mapwindow.style.display = 'block';

        if (this.map == null) {
            this.vectorSource = new ol.source.Vector({
                features: [],
            });
            this.map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.MapQuest({layer: 'sat'})
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
            maxZoom: 11,
            minZoom: 2,
        }));
        this.map.getView().fit(this.vectorSource.getExtent(), this.map.getSize());
        this.map.getView().setZoom(this.map.getView().getZoom() - 1);
    },
    closeMap: function(e) {
        if ((e.target.tagName.toLowerCase() == 'input' && e.target.value != 'Clear') ||
                e.target.className.toLowerCase() == 'modal') {
            this.refs.mapwindow.style.display = 'none';
            this.props.onUpdate('transect_pts', this.state.points);
            this.props.onUpdate('transect_name', '');
        }
    },
    clearMap: function(e) {
        this.vectorSource.clear();
        this.setState({
            points: [],
        });
    },
    customClicked: function(e) {
        alert('Clicked');
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
                {this.props.children}
                </h1>

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
        m.height(jQuery(document).height() - 4*pad);
        m.parent().css('margin-top', pad + 'px');
        this.refs.mapwindow.style.display = 'block';

        if (this.map == null) {
            this.map = new ol.Map({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.MapQuest({layer: 'sat'})
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
            maxZoom: 11,
            minZoom: 1,
        }));
    },
    closeMap: function(e) {
        if ((e.target.tagName.toLowerCase() == 'input' && e.target.value != 'Clear') ||
                e.target.className.toLowerCase() == 'modal') {
            this.refs.mapwindow.style.display = 'none';
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

        return (
                <div key={this.props.url} className='location'>
                <h1>
                {this.props.children}
                </h1>

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
            lat: 47.5467,
            lon: -52.5867,
        };
    },
    handleChange: function(e) {
        var value = e.target.value;
        this.setState({
            value: value
        });
        if (value == 'custom') {
            this.props.onUpdate('station_name', '');
        } else {
            this.props.onUpdate(this.props.id, this.state.datamap[value]);
            this.props.onUpdate('station_name', value);
        }
    },
    locationChanged: function() {
        this.setState({
            lat: parseFloat(this.refs.lat.value),
            lon: parseFloat(this.refs.lon.value)
        });
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
                this.setState({
                    data: data,
                    datamap: datamap,
                });

                if (this.state.value == '' && data.length > 0) {
                    var value = 'S27-01';
                    this.setState({
                        value: value
                    });
                }
                this.props.onUpdate(this.props.id, this.state.datamap[this.state.value]);
                this.props.onUpdate('station_name', 'S27-01');
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
        m.height(jQuery(document).height() - 4*pad);
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
                        source: new ol.source.MapQuest({layer: 'sat'})
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
                });
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
            maxZoom: 11,
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
                {this.props.children}
                </h1>

                <select
                value={this.state.value}
                onChange={this.handleChange}>
                {options}
                <option value="custom">Custom...</option>
                </select>

                <div className='latlon' style={{'display': (this.state.value == 'custom') ? 'block' : 'none'}}>
                <div>
                <label htmlFor={this.props.id + '_lat'}>Lat:</label>
                <input ref='lat' id={this.props.id + '_lat'} type='number' step='0.0001' value={parseFloat(this.state.lat).toFixed(4)} onChange={this.locationChanged} onBlur={this.updateParent} onKeyPress={this.keyPress} />
                </div>
                <div>
                <label htmlFor={this.props.id + '_lon'}>Lon:</label>
                <input ref='lon' id={this.props.id + '_lon'} type='number' step='0.0001' value={parseFloat(this.state.lon).toFixed(4)} onChange={this.locationChanged} onBlur={this.updateParent} onKeyPress={this.keyPress} />
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
                <h1 onClick={this.show}>{this.props.children}</h1>
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

ReactDOM.render(
        <Selector />,
        document.getElementById('content')
        );

