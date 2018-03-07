import React from "react";
import {Button,
  DropdownButton,
  ButtonToolbar,
  MenuItem,
  Modal} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

const LOADING_IMAGE = require("../images/spinner.gif");
const FAIL_IMAGE = require("./fail.js");

export default class PlotImage extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      showPermalink: false,
    };

    this.failCount = 0;
    this.passCount = 0;
    
    // Function bindings
    this.saveImage = this.saveImage.bind(this);
    this.getLink = this.getLink.bind(this);
    this.closeImageLink = this.closeImageLink.bind(this);
    this.openImageLink = this.openImageLink.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
    this.loadImage(this.generateQuery(this.props.query));
  }

  componentWillReceiveProps(props) {
    if (stringify(this.props.query) !== stringify(props.query)) {
      this.loadImage(this.generateQuery(props.query));
    }
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  openImageLink() {
    const newState = Object.assign({}, this.state);
    newState.showImagelink = true;

    this.setState(newState);
  }

  closeImageLink() {
    const newState = Object.assign({}, this.state);
    newState.showImagelink = false;

    this.setState(newState);
  }


  loadImage(query) {
    const paramString = $.param({
      query: stringify(query),
      format: "json",
    });

    if (this.state.paramString !== paramString) {
      this.setState({
        loading: true, 
        fail: false, 
        paramString: paramString,
      });

      const promise = $.ajax({
        url: "/plot/",
        cache: true,
        data: paramString,
        dataType: "json",
        method: (paramString.length < 1536) ? "GET" : "POST",
      }).promise();

      promise.done(function(d) {
        if (this._mounted) {
          this.passCount++;
          this.setState({
            loading: false,
            fail: false,
	          passcount: this.passCount,
            url: d,
          });
        }
      }.bind(this));
            
      promise.fail(function(d) {
        if (this._mounted) {
          const newFail = this.state.failCount + 1;
          this.setState({
            loading: false,
            fail: true,
            failCount: newFail,
          });
          console.error("AJAX Error in PlotImage.jsx: ", d);
        }
      }.bind(this));
    }

  }

  generateQuery(q) {
    const query = {
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
        query.showmap = q.showmap;
        query.time = q.time;
        if (q.compare_to) {
          query.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_quantum: q.compare_to.dataset_quantum,
            variable: q.compare_to.variable,
            time: q.compare_to.time,
          };
        }
        break;
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
        query.path = q.path;
        query.showmap = q.showmap;
        query.surfacevariable = q.surfacevariable;
        query.linearthresh = q.linearthresh;
        query.name = q.name;
        query.depth_limit = q.depth_limit;
        query.colormap = q.colormap;
        if (q.compare_to) {
          query.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            time: q.compare_to.time,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            variable: q.compare_to.variable,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
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
        if (q.compare_to) {
          query.compare_to = {
            variable: q.compare_to.variable,
            starttime: q.compare_to.starttime,
            endtime: q.compare_to.time,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            depth: q.compare_to.depth,
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
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
        query.interp = q.interp;
        query.radius = q.radius;
        query.neighbours = q.neighbours;
        
        if (q.compare_to) {
          query.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            time: q.compare_to.time,
            variable: q.compare_to.variable,
            depth: q.compare_to.depth,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
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
      case "stick":
        query.station = q.point;
        query.variable = q.variable;
        query.depth = q.depth;
        query.starttime = q.starttime;
        query.endtime = q.endtime;
        break;
    }
    return query;
  }

  urlFromQuery(q) {
    const query = this.generateQuery(q);
    return "/plot/?query=" + encodeURIComponent(stringify(query));
  }

  saveImage(key) {
    const url = `${this.urlFromQuery(this.props.query)}` +
      `&save&format=${key}&size=${this.props.query.size}` +
      `&dpi=${this.props.query.dpi}`;
    window.location.href = url;
  }

  getLink(key) {
    switch(key) {
      case "web":
        this.props.action("permalink", this.props.permlink_subquery);
        break;
      case "image":
        this.openImageLink();
        break;
    }
  }

  render() {
    var src = "";
    var infoStatus = "";
    if (this.state.fail) {
      src = FAIL_IMAGE;
      infoStatus = _("Failed to retrieve image.");
    } else if (this.state.loading) {
      src = LOADING_IMAGE;
      infoStatus = _("Loading. Please wait...");
    } else {
      this.failCount=0;
      src = this.state.url;
    }
    
    const imagelinkModalEntered = function() {
      this.imagelinkbox.style.height = this.imagelinkbox.scrollHeight + 5 + "px";
      this.imagelinkbox.select();
    }.bind(this);

    return (
      <div className='PlotImage'>

        {/* Rendered graph */}
        <div className="RenderedImage">
          <img src={src} />
        </div>
        
        <br />
        <label>{infoStatus}</label>
        <br />

        <ButtonToolbar>
          <DropdownButton
            id="save"
            title={<span><Icon icon="save" /> {_("Save Image")}</span>}
            disabled={this.state.fail || this.state.loading}
            onSelect={this.saveImage}
            dropup
          >
            <MenuItem
              eventKey="png"
            ><Icon icon="file-image-o" /> PNG</MenuItem>
            <MenuItem
              eventKey="jpeg"
            ><Icon icon="file-image-o" /> JPG</MenuItem>
            <MenuItem
              eventKey="pdf"
            ><Icon icon="file-pdf-o" /> PDF</MenuItem>
            <MenuItem
              eventKey="svg"
            ><Icon icon="file-code-o" /> SVG</MenuItem>
            <MenuItem
              eventKey="ps"
            ><Icon icon="file-pdf-o" /> PS</MenuItem>
            <MenuItem
              eventKey="eps"
            ><Icon icon="file-pdf-o" /> EPS</MenuItem>
            <MenuItem
              eventKey="tiff"
            ><Icon icon="file-image-o" /> TIFF</MenuItem>
            <MenuItem
              eventKey="geotiff"
              disabled={this.props.query.type != "map"}
            ><Icon icon="file-image-o" /> GeoTIFF</MenuItem>
            <MenuItem divider />
            <MenuItem
              eventKey="csv"
              disabled={this.props.query.type == "hovmoller"}
              onSelect={this.saveImage}
            ><Icon icon="file-text-o" /> {_("CSV")}</MenuItem>
            <MenuItem
              eventKey="odv"
              onSelect={this.saveImage}
              disabled={jQuery.inArray(this.props.query.type, [
                "profile",
                "observation",
                "transect",
                "map"
              ]) == -1}
            ><Icon icon="file-text-o" /> {_("ODV")}</MenuItem>
          </DropdownButton>

          <DropdownButton
            id="link"
            title={<span><Icon icon="link" /> {_("Get Link")}</span>}
            bsStyle={this.state.fail ? "primary" : "default"}
            disabled={this.state.loading}
            onSelect={this.getLink}
            dropup
          >
            <MenuItem
              eventKey="web"
            ><Icon icon="globe" /> Web</MenuItem>
            <MenuItem
              eventKey="image"
              disabled={this.state.fail}
            ><Icon icon="file-image-o" /> Image</MenuItem>
          </DropdownButton>
        </ButtonToolbar>

        <Modal
          show={this.state.showImagelink}
          onHide={this.closeImageLink}
          dialogClassName='permalink-modal'
          onEntered={imagelinkModalEntered}>
          <Modal.Header closeButton>
            <Modal.Title>{_("Share Link")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <textarea
              ref={(t) => this.imagelinkbox = t}
              type="text"
              id="imagelink_area"
              readOnly
              value={
                window.location.origin + this.urlFromQuery(this.props.query) +
                  "&format=png&size=" + this.props.query.size +
                  "&dpi=" + this.props.query.dpi
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={function() {
                this.imagelinkbox.select();
                document.execCommand("copy");
              }.bind(this)
              }><Icon icon="copy" /> {_("Copy")}</Button>
            <Button
              onClick={this.closeImageLink}
            ><Icon icon="close" /> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

//***********************************************************************
PlotImage.propTypes = {
  query: PropTypes.object,
  dpi: PropTypes.string,
  size: PropTypes.string,
  permlink: PropTypes.string,
  action: PropTypes.func,
  permlink_subquery: PropTypes.object,
};