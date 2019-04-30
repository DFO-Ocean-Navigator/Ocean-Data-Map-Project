import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");


export default class Oceanography extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentTab: 1,
    };

    // Function bindings
    this.handleTabs = this.handleTabs.bind(this);
  }

  handleTabs(key) {
    this.setState({currentTab: key,});
  }

  render() {

    _("Variable Range");
    _("Show Bathymetry Contours");

    //Creates Main Map Panel
    const inputs = [
      <Panel
        key='left_map_panel'
        collapsible
        defaultExpanded
        header={this.props.state.dataset_compare ? _("Left Map (Anchor)") : _("Oceanography Layer")}
        bsStyle='primary'
      >
        <DatasetSelector
          id='dataset_0'
          state={this.props.state}
          dataset={this.props.state.dataset}
          onUpdate={this.props.changeHandler}
          depth={true}
        />
        <Range
          id='scale'
          state={this.props.state.scale}
          setDefaultScale={this.props.state.setDefaultScale}
          def=''
          onUpdate={this.props.changeHandler}
          onSubmit={this.props.changeHandler}
          title={_("Variable Range")}
          autourl={"/api/v0.1/range/" +
                  this.props.options.interpType + "/" +
                  this.props.options.interpRadius + "/" +
                  this.props.options.interpNeighbours + "/" +
                  this.props.state.dataset + "/" +
                  this.props.state.projection + "/" +
                  this.props.state.extent.join(",") + "/" +
                  this.props.state.depth + "/" +
                  this.props.state.time + "/" +
                  this.props.state.variable + ".json"
          }
          dataset_compare={this.props.state.dataset_compare}
          default_scale={this.props.state.variable_scale}
        ></Range>
      </Panel>
    ];

    // Creates Right Map Panel when comparing datasets
    if (this.props.state.dataset_compare) {
      inputs.push(
        <Panel
          key='right_map_panel'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
          <DatasetSelector 
            id='dataset_1'
            state={this.props.state.dataset_1}
            onUpdate={this.props.changeHandler}
            depth={true}
          />
          <Range
            key='scale_1'
            id='scale_1'
            state={this.props.state.scale_1}
            setDefaultScale={this.props.state.setDefaultScale}
            def=''
            onUpdate={this.props.changeHandler}
            title={_("Variable Range")}
            autourl={"/api/v0.1/range/" +
                    this.props.options.interpType + "/" +
                    this.props.options.interpRadius + "/" +
                    this.props.options.interpNeighbours + "/" +
                    this.props.state.dataset_1.dataset + "/" +
                    this.props.state.projection + "/" +
                    this.props.state.extent.join(",") + "/" +
                    this.props.state.dataset_1.depth + "/" +
                    this.props.state.dataset_1.time + "/" +
                    this.props.state.dataset_1.variable + ".json"
            }
            default_scale={this.props.state.dataset_1.variable_scale}
          ></Range>
        </Panel>
      );
    }
    
    return (
        <div>
            <Panel
              collapsible
              defaultExpanded
              header={_("Data Comparison")}
              bsStyle='primary'
            >
              <Row>
                <Col xs={9}>
                  <SelectBox
                    id='dataset_compare'
                    state={this.props.state.dataset_compare}
                    onUpdate={this.props.changeHandler}
                    title={_("Compare Datasets")}
                  />
                </Col>
                <Col xs={3}>
                  <Button 
                    bsStyle="link"
                    key='show_help'
                    id='show_help'
                    onClick={this.props.showHelp}
                  >
                    {_("Help")}
                  </Button>
                </Col>
              </Row>
              <SelectBox
                id='syncRanges'
                onUpdate={this.props.changeHandler}
                title={_("Sync Variable Ranges")}
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
              />
              <Button
                bsStyle="default"
                block
                style={{display: this.props.state.dataset_compare ? "block" : "none"}}
                onClick={this.props.swapViews}
              >
                {_("Swap Views")}
              </Button>
            </Panel>
            
            {inputs  /* Renders Side Panel */}
        </div>
    );
  }
}

//***********************************************************************
Oceanography.propTypes = {
  state: PropTypes.object,
  sidebarOpen: PropTypes.bool,
  basemap: PropTypes.string,
  scale: PropTypes.string,
  scale_1: PropTypes.string,
  bathymetry: PropTypes.bool,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  projection: PropTypes.string,
  depth: PropTypes.number,
  time: PropTypes.number,
  variable_scale: PropTypes.array,
  extent: PropTypes.array,
  changeHandler: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
  options: PropTypes.object,
  updateOptions: PropTypes.func,
  private: PropTypes.bool,
};
