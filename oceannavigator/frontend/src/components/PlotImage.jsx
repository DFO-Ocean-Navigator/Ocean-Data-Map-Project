/* eslint react/no-deprecated: 0 */

import React from "react";
import axios from "axios";
import {
  Button,
  ButtonToolbar,
  Modal,
  Alert,
} from "react-bootstrap";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

const FAIL_IMAGE = require("./fail.js");
const LOADING_IMAGE = require("../images/spinner.gif").default;

class PlotImage extends React.PureComponent {
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
  }

  generateScript(language) {
    let [type, query] = this.generateQuery(this.props.query);
    query = encodeURIComponent(JSON.stringify(query));
    let scriptLang = null;
    let scriptType = null;
    switch (language) {
      case "pythonPlot":
        scriptLang = "python";
        scriptType = "plot";
        break;
      case "rPlot":
        scriptLang = "r";
        scriptType = "plot";
        break;
      case "pythonCSV":
        scriptLang = "python";
        scriptType = "csv";
        break;
      case "rCSV":
        scriptLang = "r";
        scriptType = "csv";
        break;
    }
    const url = `${window.location.origin}/api/v2.0/generate_script?query=${query}&plot_type=${type}&lang=${scriptLang}&script_type=${scriptType}`;
    window.location.href = url;
  }

  componentDidMount() {
    this._mounted = true;
    this.loadImage(...this.generateQuery(this.props.query));
  }

  componentDidUpdate() {
    this.loadImage(...this.generateQuery(this.props.query));
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  toggleImageLink() {
    const newState = Object.assign({}, this.state);
    newState.showImagelink = !this.state.showImagelink;

    this.setState(newState);
  }

  loadImage(type, query) {
    const queryString = JSON.stringify(query);

    if (this.state.queryString !== queryString) {
      this.setState({
        loading: true,
        fail: false,
        url: LOADING_IMAGE,
        queryString: queryString,
        errorMessage: null,
      });

      axios
        .get(`/api/v2.0/plot/${type}`, {
          params: {
            query: queryString,
            format: "json",
          },
        })
        .then(
          function (data) {
            if (this._mounted) {
              this.setState({
                loading: false,
                fail: false,
                url: data.data,
                errorMessage: null,
              });
            }
          }.bind(this)
        )
        .catch(
          function (xhr) {
            if (this._mounted) {
              // Get our custom error message
              // const message = xhr.getResponseHeader("x-error-message");

              this.setState({
                url: FAIL_IMAGE,
                loading: false,
                fail: true,
                // errorMessage: message,
              });
            }
          }.bind(this)
        );
    }
  }

  generateQuery(q) {
    const query = {
      dataset: q.dataset,
      names: q.names,
    };

    if (q.plotTitle !== null) {
      query.plotTitle = q.plotTitle;
    }

    switch (q.type) {
      case "profile":
        query.variable_range = q.variable_range;
      case "ts":
      case "sound":
        query.variable = q.variable;
        query.station = q.point;
        query.showmap = q.showmap;
        query.time = q.time;
        if (q.compare_to) {
          query.compare_to = {
            dataset: q.compare_to.id,
            dataset_quantum: q.compare_to.dataset_quantum,
            variable: q.compare_to.variable,
            time: q.compare_to.time,
          };
        }
        break;
      case "timeseries":
        query.showmap = q.showmap;
        query.station = q.point;
        query.variable = q.variable;
        query.variable_range = q.variable_range;
        query.depth = q.depth;
        query.starttime = q.starttime;
        query.endtime = q.endtime;
        query.scale = q.scale;
        query.colormap = q.colormap;
        query.interp = q.interp;
        query.radius = q.radius;
        query.neighbours = q.neighbours;
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
        query.selectedPlots = q.selectedPlots;

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
            starttime: q.starttime,
            endtime: q.endtime,
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
      case "track":
        query.variable = q.variable;
        query.depth = q.depth;
        query.track = q.track;
        query.showmap = q.showmap;
        query.latlon = q.latlon;
        query.trackvariable = q.trackvariable;
        query.starttime = q.starttime;
        query.endtime = q.endtime;
        query.track_quantum = q.track_quantum;
        break;
      case "class4":
        query.class4id = q.class4id;
        query.class4type = q.class4type;
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
    return [q.type, query];
  }

  urlFromQuery(q) {
    const [type, query] = this.generateQuery(q);
    return (
      `/api/v2.0/plot/${type}?query=` +
      encodeURIComponent(JSON.stringify(query))
    );
  }

  saveImage(format) {
    let url =
      `${this.urlFromQuery(this.props.query)}` + `&save=True&format=${format}`;

    if (format !== "odv" || format !== "csv") {
      url += `&size=${this.props.query.size}` + `&dpi=${this.props.query.dpi}`;
    }

    window.location.href = url;
  }

  getLink(key) {
    switch (key) {
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
    const imagelinkModalEntered = function () {
      this.imagelinkbox.style.height =
        this.imagelinkbox.scrollHeight + 5 + "px";
      this.imagelinkbox.select();
    }.bind(this);

    // Show a nice error if we need to
    let errorAlert = null;
    if (this.state.errorMessage !== null) {
      errorAlert = <Alert variant="danger">{this.state.errorMessage}</Alert>;
    }

    return (
      <div className="PlotImage">
        {/* Rendered graph */}
        <div className="RenderedImage">
          <img src={this.state.url} />
        </div>

        {errorAlert}

        <ButtonToolbar className="button-bar">
          <DropdownButton
            id="save-image"
            title={
              <span>
                <Icon icon="save" /> {_("Save Image")}
              </span>
            }
            disabled={this.state.fail || this.state.loading}
            onSelect={this.saveImage}
            drop={"up"}
          >
            <Dropdown.Item eventKey="png" id="png">
              <Icon icon="file-image-o" /> PNG
            </Dropdown.Item>
            <Dropdown.Item eventKey="jpeg" id="jpeg">
              <Icon icon="file-image-o" /> JPG
            </Dropdown.Item>
            <Dropdown.Item eventKey="pdf" id="pdf">
              <Icon icon="file-pdf-o" /> PDF
            </Dropdown.Item>
            <Dropdown.Item eventKey="svg" id="svg">
              <Icon icon="file-code-o" /> SVG
            </Dropdown.Item>
            <Dropdown.Item eventKey="ps" id="ps">
              <Icon icon="file-pdf-o" /> PS
            </Dropdown.Item>
            <Dropdown.Item eventKey="eps" id="eps">
              <Icon icon="file-pdf-o" /> EPS
            </Dropdown.Item>
            <Dropdown.Item eventKey="tiff" id="tiff">
              <Icon icon="file-image-o" /> TIFF
            </Dropdown.Item>
            <Dropdown.Item
              eventKey="geotiff" id="geotiff"
              disabled={this.props.query.type != "map"}
            >
              <Icon icon="file-image-o" /> GeoTIFF
            </Dropdown.Item>
            <Dropdown.Divider/>
            <Dropdown.Item
              eventKey="csv" id="csv"
              disabled={this.props.query.type == "hovmoller"}
              onSelect={this.saveImage}
            >
              <Icon icon="file-text-o" /> {_("CSV")}
            </Dropdown.Item>
            <Dropdown.Item
              eventKey="odv" id="odv"
              onSelect={this.saveImage}
              disabled={
                !this.props.query.type.includes("profile") &&
                !this.props.query.type.includes("observation") &&
                !this.props.query.type.includes("transect") &&
                !this.props.query.type.includes("map")
              }
            >
              <Icon icon="file-text-o" /> {_("ODV")}
            </Dropdown.Item>
            <Dropdown.Item
              eventKey="stats" id="stats"
              disabled={this.props.query.type == "hovmoller"}
              onSelect={this.saveImage}
            >
              <Icon icon="file-text-o" /> {_("Statistics (csv)")}
            </Dropdown.Item>
          </DropdownButton>

          <DropdownButton
            id="link"
            title={
              <span>
                <Icon icon="link" /> {_("Get Link")}
              </span>
            }
            disabled={this.state.fail || this.state.loading}
            onSelect={this.getLink}
            drop={"up"}
          >
            <Dropdown.Item eventKey="web">
              <Icon icon="globe" /> {_("Web")}
            </Dropdown.Item>
            <Dropdown.Item eventKey="image" disabled={this.state.fail}>
              <Icon icon="file-image-o" /> {_("Image")}
            </Dropdown.Item>
          </DropdownButton>

          <DropdownButton
            id="script"
            title={
              <span>
                <Icon icon="file-code-o" /> {_("API Script")}
              </span>
            }
            disabled={this.state.fail || this.state.loading}
            onSelect={this.generateScript}
            drop={"up"}
          >
            <Dropdown.Item eventKey="rPlot" disabled={this.state.fail}>
              <Icon icon="code" /> R - PLOT
            </Dropdown.Item>
            <Dropdown.Item eventKey="pythonPlot">
              <Icon icon="code" /> Python 3 - PLOT
            </Dropdown.Item>
            <Dropdown.Item eventKey="pythonCSV">
              <Icon icon="code" /> Python 3 - CSV
            </Dropdown.Item>
            <Dropdown.Item eventKey="rCSV">
              <Icon icon="code" /> R - CSV
            </Dropdown.Item>
          </DropdownButton>
        </ButtonToolbar>

        <Modal
          show={this.state.showImagelink}
          onHide={this.toggleImageLink}
          dialogClassName="permalink-modal"
          onEntered={imagelinkModalEntered}
        >
          <Modal.Header closeButton>
            <Modal.Title>{_("Share Link")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <textarea
              ref={(t) => (this.imagelinkbox = t)}
              type="text"
              id="imagelink_area"
              readOnly
              value={
                window.location.origin +
                this.urlFromQuery(this.props.query) +
                "&format=png&size=" +
                this.props.query.size +
                "&dpi=" +
                this.props.query.dpi
              }
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={function () {
                this.imagelinkbox.select();
                document.execCommand("copy");
              }.bind(this)}
            >
              <Icon icon="copy" /> {_("Copy")}
            </Button>
            <Button onClick={this.toggleImageLink}>
              <Icon icon="close" /> {_("Close")}
            </Button>
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

export default withTranslation()(PlotImage);
