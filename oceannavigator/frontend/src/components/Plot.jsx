import React from 'react';

var LOADING_IMAGE = '/images/spinner.gif';
var FAIL_IMAGE = '/images/failure.gif';

var imagePreloader = new Image();
// var Plot = React.createClass({
class Plot extends React.Component {
    constructor(props) {
        super(props);
        this.timer = 0;
        this.state = {
            'url': this.buildURL(this.props.query, false),
            'fail': false,
            'loading': false,
        };
    }
    buildQuery(q) {
        var query = {
            'type': q.type,
            'dataset': q.dataset,
            'dataset_quantum': q.dataset_quantum,
        }
        /*
        for (var key in defaults[q.type]) {
            if (defaults[q.type].hasOwnProperty(key)) {
                query[key] = q[key];
            }
        }
        */

        return encodeURIComponent(JSON.stringify(query));
    }
    buildURL(q, page) {
        if (page) {
            return '/?query=' + this.buildQuery(q);
        } else {
            return '/plot/?query=' + this.buildQuery(q);
        }
    }
    imagePreload(src, callback) {
        this.setState({
            'url': LOADING_IMAGE,
            'fail': false,
            'loading': true,
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
            imagePreloader.src = src;
            imagePreloader.onerror = imagePreloader.onabort = function() {
                console.error("Image failed to load: ", src);
                this.setState({
                    'url': FAIL_IMAGE + '?query=' + this.buildQuery(this.props.query),
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
    }
    componentWillUpdate(nextprops, nextstate) {
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
    }
    newWindow() {
        window.open(this.state.url, 'newwindow', 'width=800,height=800');
        return false;
    }
    saveImage() {
        var format = this.refs.format.value;
        if (format != '') {
            window.location.href = this.state.url + '&save&format=' + format + '&size=' + this.props.query.size + '&dpi=' + this.props.query.dpi;
        }
        this.refs.format.value = '';
    }
    copyURL(page) {
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
    }
    render() {
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
};

export default Plot;

