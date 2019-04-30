/* eslint react/no-deprecated: 0 */


import React from "react";
import {Button,
  DropdownButton,
  ButtonToolbar,
  MenuItem,
  Modal,
  Alert} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";
import moment from 'moment-timezone';
const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");
const FAIL_IMAGE = require("./fail.js");
const LOADING_IMAGE = require("../images/spinner.gif");

export default class PlotImage extends React.PureComponent {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      showPermalink: false,
      fail: false,
      errorMessage: null,
      loading: true,
      url: LOADING_IMAGE,
      showImagelink: false,
    };
    
    // Function bindings
    this.saveImage = this.saveImage.bind(this);
    this.getLink = this.getLink.bind(this);
    this.toggleImageLink = this.toggleImageLink.bind(this);
    this.generateScript = this.generateScript.bind(this);
    this.formatTime = this.formatTime.bind(this);
  }

  generateScript(language) {
    
    if (this.props.query.type == "class4") {
      this.setState({
        errorMessage: "Unfortunately this feature is not yet available for Class4's, Check back soon!"
      });
    } else {
      if (language == "pythonPlot") {

        var url = stringify(this.generateQuery(this.props.query));
        url = window.location.origin + "/api/v1.0/generatescript/" + url + "/python/";
      } else if (language == "rPlot") {

        var url = stringify(this.generateQuery(this.props.query));
        url = window.location.origin + "/api/v1.0/generatescript/" + url + "/r/";
      } else {

        var url = stringify(this.generateQuery(this.props.query)) +
        `&save&format=csv&size=${this.props.query.size}` +
        `&dpi=${this.props.query.dpi}`;
        if (language == "pythonCSV") {
          url = window.location.origin + "/api/v1.0/generatescript/" + url + "/python/";
        } else if (language == "rCSV") {
          url = window.location.origin + "/api/v1.0/generatescript/" + url + "/r/";
        }
      
      }
    }
    
    window.location.href = url;
  }

  componentDidMount() {
    this._mounted = true;
    this.loadImage(this.generateQuery(this.props.query));
  }

  /*componentDidUpdate(prevProps, prevState) {
    if (stringify(this.props.query) !== stringify(prevProps.query)) {
      this.loadImage(this.generateQuery(this.props.query))
    }
  }*/
  componentWillReceiveProps(props) {
    if (stringify(this.props.query) !== stringify(props.query) || stringify(this.props.query.compare_to) !== stringify(this.props.query.compare_to)) {
      this.setState({
        loading: true
      })
      this.loadImage(this.generateQuery(props.query));
    }
  }
  componentWillUnmount() {
    this._mounted = false;
  }

  toggleImageLink() {
    const newState = Object.assign({}, this.state);
    newState.showImagelink = !this.state.showImagelink;

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
        //url: LOADING_IMAGE,
        paramString: paramString,
        errorMessage: null,
      });
      let url
      if (this.props.query.type === 'class4' || this.props.query.type === 'drifter') {
        url = '/plot/'
      } else {
        url = '/api/v1.0/plot/'
      }
      const promise = $.ajax({
        url: url,
        cache: true,
        data: paramString,
        dataType: "json",
        method: (paramString.length < 1536) ? "GET" : "POST",
      }).promise();

      promise.done(function(data) {
        if (this._mounted) {
          this.setState({
            loading: false,
            fail: false,
            url: data,
            errorMessage: null,
          });
        }
      }.bind(this));
            
      promise.fail(function(xhr) {
        if (this._mounted) {
          // Get our custom error message

          console.warn('xhr: ', xhr)
          try {
            const message = JSON.parse(xhr.responseText).message;
            this.setState({
              url: FAIL_IMAGE,
              loading: false,
              fail: true,
              errorMessage: message,
            });
          }
          catch(err) {
            this.setState({
              url: FAIL_IMAGE,
              loading: false,
              fail: true
              });
          }
          
        }
      }.bind(this));
    }
  }

  formatTime(time) {
    //let year = time.getUTCFullYear()
    //let month = time.getUTCMonth()
    //if (month.toString().length === 1) {
    //  month = '0' + month
    //}
    //let date = time.getUTCDate()
    //if (date.toString().length === 1) {
    //  date = '0' + date
    //}
    //let hour = time.getUTCHours()
    //time = year + '-' + month + '-' + date + 'T' + hour + ':00:00+00:00'
    if (time === undefined) {
      return
    }
    let formatted_time = time.format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]')
    
    return formatted_time
  }

  generateQuery(q) {
    const query = {
      type: q.type,
      dataset: q.dataset,
      quantum: q.quantum,
      names: q.names,
    };
    if ('title' in q) {
      query.plotTitle = q['title'];
    }
    if ('xscale' in q) {
      query.xscale = q['xscale']
    }
    if ('yscale' in q) {
      query.yscale = q['yscale']
    }

    if ('ylabel' in q) {
      query.ylabel = q['ylabel']
    }
    if ('xlabel' in q) {
      query.xlabel = q['xlabel']
    }
    let time
    let starttime
    let endtime

    switch(q.type) {
      case "profile":
      case "ts":
      case "sound":
        time = this.formatTime(q.time)
        query.variable = q.variable;
        query.station = q.point;
        query.showmap = q.showmap;
        query.time = time;
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
        starttime = this.formatTime(q.starttime)
        endtime = this.formatTime(q.endtime)
        query.showmap = q.showmap;
        query.station = q.point;
        query.variable = q.variable;
        query.depth = q.depth;
        query.starttime = starttime;
        query.endtime = endtime;
        query.scale = q.scale;
        query.colormap = q.colormap;
        break;
      case "transect":
        time = this.formatTime(q.time)
        query.variable = q.variable;
        query.time = time;
        query.scale = q.scale;
        query.path = q.path;
        query.showmap = q.showmap;
        query.surfacevariable = q.surfacevariable;
        query.linearthresh = q.linearthresh;
        query.name = q.name;
        query.depth_limit = q.depth_limit;
        query.colormap = q.colormap;
        query.selectedPlots = q.selectedPlots;

        if (q.compare_to) {
          time = this.formatTime(q.compare_to.time)
          query.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            time: time,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            variable: q.compare_to.variable,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
        break;
      case "hovmoller":
        starttime = this.formatTime(q.starttime)
        endtime = this.formatTime(q.endtime)
        query.variable = q.variable;
        query.starttime = starttime;
        query.endtime = endtime;
        query.scale = q.scale;
        query.colormap = q.colormap;
        query.path = q.path;
        query.depth = q.depth;
        query.showmap = q.showmap;
        query.name = q.name;
        if (q.compare_to) {
            let starttime = this.formatTime(q.compare_to.starttime)
            let endtime = this.formatTime(q.compare_to.endtime)
            query.compare_to = {
            variable: q.compare_to.variable,
            starttime: starttime,
            endtime: endtime,
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
        time = this.formatTime(q.time)
        query.variable = q.variable;
        query.time = time;
        query.scale = q.scale;
        query.depth = q.depth;
        query.colormap = q.colourmap;
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
          let compareTime = q.compare_to.time.toISOString();
          query.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            time: compareTime,
            variable: q.compare_to.variable,
            depth: q.compare_to.depth,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            colormap: q.compare_to.colourmap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
        break;
      case "drifter":
        starttime = this.formatTime(q.starttime)
        endtime = this.formatTime(q.endtime)
        query.variable = q.variable;
        query.depth = q.depth;
        query.drifter = q.drifter;
        query.showmap = q.showmap;
        query.latlon = q.latlon;
        query.buoyvariable = q.buoyvariable;
        query.starttime = starttime;
        query.endtime = endtime;
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
        starttime = this.formatTime(q.starttime)
        endtime = this.formatTime(q.endtime)
        query.station = q.point;
        query.variable = q.variable;
        query.depth = q.depth;
        query.starttime = starttime;
        query.endtime = endtime;
        break;
    }
    return jQuery.extend({}, query);
  }

  urlFromQuery(q) {
    const query = this.generateQuery(q);
    if (q.type === 'drifter' || q.type === 'class4') {
      return "/plot/?query=" + encodeURIComponent(stringify(query))
    } else {
      return "/api/v1.0/plot/?query=" + encodeURIComponent(stringify(query));
    }
  }

  saveImage(format) {
    let url = `${this.urlFromQuery(this.props.query)}` + `&save&format=${format}`;
      
    if (format !== "odv" || format !== "csv") {
      url += `&size=${this.props.query.size}` + `&dpi=${this.props.query.dpi}`;
    }

    window.location.href = url;
  }

  getLink(key) {
    switch(key) {
      case "web":
        this.props.action("permalink", this.props.permlink_subquery);
        break;
      case "image":
        this.toggleImageLink();
        break;
      case "script":
        this.generateScript();
        break;
    }
  }

  render() {
    
    const imagelinkModalEntered = function() {
      this.imagelinkbox.style.height = this.imagelinkbox.scrollHeight + 5 + "px";
      this.imagelinkbox.select();
    }.bind(this);

    // Show a nice error if we need to
    let errorAlert = null;
    if (this.state.errorMessage !== null) {
      errorAlert = (<Alert bsStyle="danger">{this.state.errorMessage}</Alert>);
    }
    
    var image
    if (this.state.loading) {
      image = <div className="spinner">
        <div className="sk-folding-cube">
          <div className="sk-cube1 sk-cube"></div>
          <div className="sk-cube2 sk-cube"></div>
          <div className="sk-cube4 sk-cube"></div>
          <div className="sk-cube3 sk-cube"></div>
        </div>
      </div>//<Icon icon="spinner" name='loading'/>
    } else {
      image = <div className="RenderedImage">
          <img src={this.state.url} />
        </div>
    }

    return (
      <div className='PlotImage'>

        {/* Rendered graph */}
        {image}
          
        

        {errorAlert}

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
            ><Icon icon="globe" /> {_("Web")}</MenuItem>
            <MenuItem
              eventKey="image"
              disabled={this.state.fail}
            ><Icon icon="file-image-o" /> {_("Image")}</MenuItem>
          </DropdownButton>

          <DropdownButton
            id="script"
            title={<span><Icon icon="file-code-o" /> {_("API Script")}</span>}
            bsStyle={this.state.fail ? "primary" : "default"}
            disabled={this.state.loading}
            onSelect={this.generateScript}
            dropup
          >
            <MenuItem
              eventKey="rPlot"
              disabled={this.state.fail}
            ><Icon icon="code" /> R - PLOT</MenuItem>
            <MenuItem
              eventKey="pythonPlot"
            ><Icon icon="code" /> Python 3 - PLOT</MenuItem>
            <MenuItem
              eventKey="pythonCSV"
            ><Icon icon="code" /> Python 3 - CSV</MenuItem>
            <MenuItem
              eventKey="rCSV"
            ><Icon icon="code"/> R - CSV</MenuItem>
          </DropdownButton>

        </ButtonToolbar>

        <Modal
          show={this.state.showImagelink}
          onHide={this.toggleImageLink}
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
              onClick={this.toggleImageLink}
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