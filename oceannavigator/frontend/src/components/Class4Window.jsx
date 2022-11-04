import React from "react";
import {Panel, Row, Col} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ImageSize from "./ImageSize.jsx";
import Accordion from "./lib/Accordion.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class Class4Window extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      forecast: "best",
      showmap: false,
      climatology: false,
      error: "none",
      size: "10x7",
      dpi: 144,
      models: [],
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  onLocalUpdate(key, value) {
    if (this._mounted && value) {

      let newState = {};
      if (typeof(key) === "string") {
        newState[key] = value;
      }
      else {
        for (let i = 0; i < key.length; ++i) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);
    }
  }

  render() {
    const plot_query = {
      type: "class4",
      class4type: this.props.class4type,
      dataset: this.props.dataset,
      forecast: this.state.forecast,
      class4id: this.props.class4id,
      showmap: this.state.showmap,
      climatology: this.state.climatology,
      error: this.state.error,
      size: this.state.size,
      dpi: this.state.dpi,
      models: this.state.models,
    };
    const error_options = [
      {
        id: "none",
        value: _("None"),
      },
      {
        id: "observation",
        value: _("Value - Observation"),
      },
      {
        id: "climatology",
        value: _("Value - Climatology"),
      },
    ];

    const plotOptions = <ImageSize
        key='size'
        id='size'
        state={this.state.size}
        onUpdate={this.onLocalUpdate}
        title={_("Saved Image Size")} />;

    _("Forecast");
    _("Show Location");
    _("Show Climatology");
    _("Additional Models");
    _("Show Error");
    _("Saved Image Size");

    return (
      <div className='Class4Window Window'>
        <Row>
          <Col lg={2}>
            <Panel
              defaultExpanded
              bsStyle='primary'
            >
              <Panel.Heading>{_("Class 4 Settings")}</Panel.Heading>
              <Panel.Collapse>
                <Panel.Body>
                  <ComboBox
                    key='forecast'
                    id='forecast'
                    state={this.state.forecast}
                    def=''
                    url={
                      "/api/v2.0/class4/forecasts/" + this.props.class4type + "?id=" + this.props.class4id
                    }
                    title={_("Forecast")}
                    onUpdate={this.onLocalUpdate}
                  />
                  <CheckBox
                    key='showmap'
                    id='showmap'
                    checked={this.state.showmap}
                    onUpdate={this.onLocalUpdate}
                    title={_("Show Location")}>{_("showmap_help")}</CheckBox>
                  <CheckBox
                    key='climatology'
                    id='climatology'
                    checked={this.state.climatology}
                    onUpdate={this.onLocalUpdate}
                    title={_("Show Climatology")}>{_("climatology_help")}</CheckBox>
                  <ComboBox
                    key='models'
                    id='models'
                    state={this.state.models}
                    multiple
                    onUpdate={this.onLocalUpdate}
                    url={"/api/v2.0/class4/models/" + this.props.class4type + "?id=" + this.props.class4id}
                    title={_("Additional Models")} />
                  <ComboBox
                    key='error'
                    id='error'
                    state={this.state.error}
                    def=''
                    data={error_options}
                    title={_("Show Error")}
                    onUpdate={this.onLocalUpdate} />
                  <Accordion id='class4_accordion' title={"Plot Options"} content={plotOptions} />
                </Panel.Body>
              </Panel.Collapse>
            </Panel>
          </Col>

          <Col lg={10}>
            <PlotImage
              query={plot_query} // For image saving link.
              permlink_subquery={this.state}
              action={this.props.action}
            />
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
Class4Window.propTypes = {
  generatePermLink: PropTypes.func,
  dataset: PropTypes.string,
  class4id: PropTypes.array,
  class4type: PropTypes.string,
  init: PropTypes.object,
  action: PropTypes.func,
};

export default withTranslation()(Class4Window);
