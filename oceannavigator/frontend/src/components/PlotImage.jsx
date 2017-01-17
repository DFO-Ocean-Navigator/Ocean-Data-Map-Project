import React from 'react';
import {Button, DropdownButton, ButtonToolbar, MenuItem, Modal} from 'react-bootstrap';
import Icon from './Icon.jsx';
var i18n = require('../i18n.js');

var LOADING_IMAGE = require('../images/spinner.gif');
var FAIL_IMAGE = require('./fail.js');

class PlotImage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showPermalink: false,
        };
    }

    componentWillMount() {
        this.loadImage(this.generateQuery(this.props.query));
    }
    componentWillReceiveProps(props) {
        this.loadImage(this.generateQuery(props.query));
    }

    loadImage(query) {
        var paramString = $.param({
            query: JSON.stringify(query),
            format: "json",
        });

        if (this.state.paramString != paramString) {
            this.setState({
                loading: true,
                fail: false,
                paramString: paramString,
            });

            var promise = $.ajax({
                url: "/plot/",
                cache: true,
                data: paramString,
                dataType: "json",
                method: (paramString.length < 1536) ? "GET" : "POST",
            }).promise();

            promise.done(function(d) {
                this.setState({
                    loading: false,
                    fail: false,
                    url: d,
                });
            }.bind(this));
            
            promise.fail(function(d) {
                this.setState({
                    loading: false,
                    fail: true,
                });
                console.log("AJAX Error", d);
            }.bind(this));
        }
    }

    generateQuery(q) {
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
            case "observation":
                query.observation = q.observation;
                query.observation_variable = q.observation_variable;
                query.variable = q.variable;
                break;
        }
        return query;
    }

    urlFromQuery(q) {
        var query = this.generateQuery(q);
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
            src = this.state.url;
        }

        var permalinkModalEntered = function() {
            this.permalinkbox.style.height = this.permalinkbox.scrollHeight + 5 + 'px';
            this.permalinkbox.select();
        }.bind(this);

        return (
            <div className='PlotImage'>
                <img src={src} />
                <ButtonToolbar>
                    <DropdownButton id="save" title={<span><Icon icon="save" /> {_("Save…")}</span>} dropup onSelect={this.saveImage.bind(this)}>
                        <MenuItem eventKey="png"><Icon icon="file-image-o" /> PNG</MenuItem>
                        <MenuItem eventKey="pdf"><Icon icon="file-pdf-o" /> PDF</MenuItem>
                        <MenuItem eventKey="svg"><Icon icon="file-code-o" /> SVG</MenuItem>
                        <MenuItem eventKey="ps"><Icon icon="file-pdf-o" /> PS</MenuItem>
                        <MenuItem eventKey="eps"><Icon icon="file-pdf-o" /> EPS</MenuItem>
                        <MenuItem eventKey="tiff"><Icon icon="file-image-o" /> TIFF</MenuItem>
                        <MenuItem eventKey="csv" disabled={this.props.query.type == 'map' || this.props.query.type == 'hovmoller'}><Icon icon="file-text-o" /> CSV</MenuItem>
                        <MenuItem eventKey="odv" disabled={jQuery.inArray(this.props.query.type, ["profile", "observation", "transect", "map"]) == -1}><Icon icon="file-text-o" /> ODV</MenuItem>
                        <MenuItem eventKey="geotiff" disabled={this.props.query.type != 'map'}><Icon icon="file-image-o" /> GeoTIFF</MenuItem>
                    </DropdownButton>

                    <Button onClick={() => this.setState({showPermalink: true})}><Icon icon="link" /> {_("Get Link")}</Button>
                </ButtonToolbar>

                <Modal show={this.state.showPermalink} onHide={() => this.setState({showPermalink: false})} dialogClassName='permalink-modal' onEntered={permalinkModalEntered}>
                    <Modal.Header closeButton>
                        <Modal.Title>{_("Share Link")}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <textarea ref={(t) => this.permalinkbox = t} type="text" id="permalink_area" readOnly value={this.props.permlink} />
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={function() {this.permalinkbox.select(); document.execCommand('copy');}.bind(this)}><Icon icon="copy" /> {_("Copy")}</Button>
                        <Button onClick={() => this.setState({showPermalink: false})}><Icon icon="close" /> {_("Close")}</Button>
                    </Modal.Footer>
                </Modal>
            </div>
        );
    }
}

export default PlotImage;
