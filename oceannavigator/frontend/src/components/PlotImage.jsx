import React from 'react';
import {Button, DropdownButton, ButtonToolbar, MenuItem, Modal} from 'react-bootstrap';
import Icon from './Icon.jsx';

var LOADING_IMAGE = require('../images/spinner.gif');
var FAIL_IMAGE = require('../images/failure.gif');

class PlotImage extends React.Component {
    constructor(props) {
        super(props);

        this.imagePreloader = new Image();
        this.state = {
            showPermalink: false,
        };
    }

    componentWillMount() {
        this.loadImage(this.urlFromQuery(this.props.query));
    }
    componentWillReceiveProps(props) {
        this.loadImage(this.urlFromQuery(props.query));
    }
    componentWillUnmount() {
        this.imagePreloader.onload = function(){};
        this.imagePreloader.error = function(){};
    }

    loadImage(src) {
        this.setState({
            loading: true,
            fail: false,
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
            this.imagePreloader.src = src;
            this.imagePreloader.onerror = this.imagePreloader.onabort = function() {
                console.error("Image failed to load", src);
                this.setState({
                    loading: false,
                    fail: true,
                });
            }.bind(this)

            if (this.imagePreloader.complete) {
                this.imageLoaded();
            } else {
                this.imagePreloader.onload = function() {
                    this.imageLoaded();
                }.bind(this);
            }
        }.bind(this), 100);
    }

    imageLoaded() {
        this.imagePreloader.onload = function(){};
        this.setState({
            loading: false,
            fail: false,
        });
    }

    urlFromQuery(q) {
        var query = {
            type: q.type,
            dataset: q.dataset,
            quantum: q.quantum,
            names: q.names,
        };
        switch(q.type) {
            case "profile":
            case "ts":
            case "sound":
                query.variable = q.variable;
                query.station = q.point;
                query.time = q.time;
                break
            case "timeseries":
                query.station = q.point;
                query.variable = q.variable;
                query.depth = q.depth;
                query.starttime = q.starttime;
                query.endtime = q.endtime;
                query.scale = q.scale;
                query.colormap = q.colormap;
                break;
            case "transect":
                query.variable = q.variable;
                query.time = q.time;
                query.scale = q.scale;
                query.colormap = q.colormap;
                query.path = q.path;
                query.showmap = q.showmap;
                query.surfacevariable = q.surfacevariable;
                query.linearthresh = q.linearthresh;
                query.name = q.name;
                break;
            case "hovmoller":
                query.variable = q.variable;
                query.starttime = q.starttime;
                query.endtime = q.endtime;
                query.scale = q.scale;
                query.colormap = q.colormap;
                query.path = q.path;
                query.depth = q.depth;
                query.showmap = q.showmap;
                query.name = q.name;
                break;
            case "map":
                query.variable = q.variable;
                query.time = q.time;
                query.scale = q.scale;
                query.depth = q.depth;
                query.colormap = q.colormap;
                query.area = q.area;
                query.projection = q.projection;
                query.bathymetry = q.bathymetry;
                query.quiver = q.quiver;
                query.contour = q.contour;
                query.showarea = q.showarea;
                break;
            case "drifter":
                query.variable = q.variable;
                query.depth = q.depth;
                query.drifter = q.drifter;
                query.showmap = q.showmap;
                query.latlon = q.latlon;
                query.buoyvariable = q.buoyvariable;
                query.starttime = q.starttime;
                query.endtime = q.endtime;
                break;
            case "class4":
                query.class4id = q.class4id;
                query.forecast = q.forecast;
                query.error = q.error;
                query.showmap = q.showmap;
                query.climatology = q.climatology;
                query.models = q.models;
                break;
        }

        return "/plot/?query=" + encodeURIComponent(JSON.stringify(query));
    }

    saveImage(key) {
        var url = `${this.urlFromQuery(this.props.query)}&save&format=${key}&size=${this.props.query.size}&dpi=${this.props.query.dpi}`;
        window.location.href = url;
    }

    render() {
        var src = '';
        if (this.state.fail) {
            src = FAIL_IMAGE;
        } else if (this.state.loading) {
            src = LOADING_IMAGE;
        } else {
            src = this.urlFromQuery(this.props.query);
        }

        var permalinkModalEntered = function() {
            this.permalinkbox.style.height = this.permalinkbox.scrollHeight + 5 + 'px';
            this.permalinkbox.select();
        }.bind(this);

        return (
            <div className='PlotImage'>
                <img src={src} />
                <ButtonToolbar>
                    <DropdownButton id="save" title={<span><Icon icon="save" /> Save&hellip;</span>} dropup onSelect={this.saveImage.bind(this)}>
                        <MenuItem eventKey="png"><Icon icon="file-image-o" /> PNG</MenuItem>
                        <MenuItem eventKey="pdf"><Icon icon="file-pdf-o" /> PDF</MenuItem>
                        <MenuItem eventKey="svg"><Icon icon="file-code-o" /> SVG</MenuItem>
                        <MenuItem eventKey="ps"><Icon icon="file-pdf-o" /> PS</MenuItem>
                        <MenuItem eventKey="eps"><Icon icon="file-pdf-o" /> EPS</MenuItem>
                        <MenuItem eventKey="tiff"><Icon icon="file-image-o" /> TIFF</MenuItem>
                        <MenuItem eventKey="csv" disabled={this.props.query.type == 'map' || this.props.query.type == 'hovmoller'}><Icon icon="file-text-o" /> CSV</MenuItem>
                        <MenuItem eventKey="odv" disabled={jQuery.inArray(this.props.query.type, ["profile", "transect", "map"]) == -1}><Icon icon="file-text-o" /> ODV</MenuItem>
                        <MenuItem eventKey="geotiff" disabled={this.props.query.type != 'map'}><Icon icon="file-image-o" /> GeoTIFF</MenuItem>
                    </DropdownButton>

                    <Button onClick={() => this.setState({showPermalink: true})}><Icon icon="link" /> Get Link</Button>
                </ButtonToolbar>

                <Modal show={this.state.showPermalink} onHide={() => this.setState({showPermalink: false})} dialogClassName='permalink-modal' onEntered={permalinkModalEntered}>
                    <Modal.Header closeButton>
                        <Modal.Title>Share Link</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <textarea ref={(t) => this.permalinkbox = t} type="text" id="permalink_area" readOnly value={this.props.permlink} />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={function() {this.permalinkbox.select(); document.execCommand('copy');}.bind(this)}><Icon icon="copy" /> Copy</Button>
                        <Button onClick={() => this.setState({showPermalink: false})}><Icon icon="close" /> Close</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

export default PlotImage;
