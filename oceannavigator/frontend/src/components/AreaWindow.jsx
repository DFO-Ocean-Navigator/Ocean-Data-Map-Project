import React from "react";
import { Accordion, Card, Col, Row, Nav } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import ColormapRange from "./ColormapRange.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ContourSelector from "./ContourSelector.jsx";
import QuiverSelector from "./QuiverSelector.jsx";
import ImageSize from "./ImageSize.jsx";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import SubsetPanel from "./SubsetPanel.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";
import { formToJSON } from "axios";

class AreaWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      currentTab: 1, // Currently selected tab
      scale: props.dataset_0.variable_scale + ",auto",
      scale_1: props.dataset_1.scale_1 + ",auto",
      scale_diff: "-10,10,auto",
      leftColormap: "default",
      rightColormap: "default",
      colormap_diff: "default",
      dataset_0: {
        id: props.dataset_0.id,
        variable: props.dataset_0.variable,
        quantum: props.dataset_0.quantum,
        time: props.dataset_0.time,
        depth: props.dataset_0.depth,
      },
      dataset_1: {
        id: props.dataset_1.id,
        variable: props.dataset_1.variable,
        quantum: props.dataset_1.quantum,
        time: props.dataset_1.time,
        depth: props.dataset_1.depth,
      },
      // Should dataset/variable changes in this window
      // propagate to the entire site?
      syncLocalToGlobalState: false,
      showarea: true,
      surfacevariable: "none",
      linearthresh: 200,
      bathymetry: true, // Show bathymetry on map
      plotTitle: undefined,
      quiver: {
        variable: "",
        magnitude: "length",
        colormap: "default",
      },
      contour: {
        variable: "",
        colormap: "default",
        levels: "auto",
        legend: true,
        hatch: false,
      },
      size: "10x7", // Plot dimensions
      dpi: 144, // Plot DPI
    };

    if (props.init !== null) {
      this.state = { ...this.state, ...props.init };
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onTabChange = this.onTabChange.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentDidUpdate(prevProps) {
    if (this.props.dataset_0.variable !== prevProps.dataset_0.variable) {
      this.setState({ scale: this.props.dataset_0.variable_scale + ",auto", })
    }
  }

  //Updates Plot with User Specified Title
  updatePlotTitle(title) {
    if (title !== this.state.plotTitle) {
      this.setState({ plotTitle: title });
    }
  }

  onLocalUpdate(key, value) {
    if (this._mounted) {
      if (key === "dataset_0") {
        this.setState((prevState) => ({
          dataset_0: {
            ...prevState.dataset_0,
            ...value,
          },
        }));
        return;
      }

      if (key === "dataset_1") {
        this.setState((prevState) => ({
          dataset_1: {
            ...prevState.dataset_1,
            ...value,
          },
        }));
        return;
      }

      if (key === "scale") {
        if (value.constructor === Array) {
          value = value[0] + ',' + value[1]
        }
        this.setState({ scale: value });
        return;
      }

      let newState = {};
      if (typeof key === "string") {
        newState[key] = value;
      } else {
        for (let i = 0; i < key.length; i++) {
          newState[key[i]] = value[i];
        }
      }
      this.setState(newState);
    }
  }

  compareChanged(checked) {
    let newScale = checked ? "-10,10,auto" : this.props.dataset_0.variable_scale + ",auto"
    this.setState({ scale: newScale });
    this.props.setCompareDatasets(checked)
  }

  onTabChange(index) {
    this.setState({
      currentTab: index,
    });
  }

  render() {
    _("Dataset");
    _("Time");
    _("Start Time");
    _("End Time");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Show Bathymetry Contours");
    _("Arrows");
    _("Additional Contours");
    _("Show Selected Area(s)");
    _("Saved Image Size");

    const plotOptions = (
      <div>
        {/* Image Size Selection */}
        <ImageSize
          key="size"
          id="size"
          state={this.state.size}
          onUpdate={this.onLocalUpdate}
          title={_("Saved Image Size")}
        ></ImageSize>

        {/* Plot Title */}
        <CustomPlotLabels
          key="title"
          id="title"
          title={_("Plot Title")}
          updatePlotTitle={this.updatePlotTitle}
          plotTitle={this.state.plotTitle}
        />
      </div>
    );

    const mapSettings = (
      <Card variant="primary" key="map_settings">
        <Card.Header>{_("Area Settings")}</Card.Header>
        <Card.Body className="global-settings-card">
          <CheckBox
            id="dataset_compare"
            key="dataset_compare"
            checked={this.props.dataset_compare}
            onUpdate={(_, checked) => this.compareChanged(checked)}
            title={_("Compare Datasets")}
          />

          {/* Displays Options for Compare Datasets */}
          <Button
            variant="default"
            key="swap_views"
            style={{ display: this.props.dataset_compare ? "block" : "none" }}
            onClick={this.props.swapViews}
          >
            {_("Swap Views")}
          </Button>

          <ColormapRange
            auto
            key="scale"
            id="scale"
            state={this.state.scale.split(',')}
            onUpdate={this.onLocalUpdate}
          />

          <div
            style={{
              display:
                this.props.dataset_compare &&
                  this.state.dataset_0.variable == this.props.dataset_1.variable
                  ? "block"
                  : "none",
            }}
          >

            <ComboBox
              key="colormap_diff"
              id="colormap_diff"
              state={this.state.colormap_diff}
              def="default"
              onUpdate={this.onLocalUpdate}
              url="/api/v2.0/plot/colormaps"
              title={_("Diff. Colourmap")}
            >
              {_("colourmap_help")}
              <img src="/api/v2.0/plot/colormaps.png/" />
            </ComboBox>
          </div>
          {/* End of Compare Datasets options */}

          <CheckBox
            key="bathymetry"
            id="bathymetry"
            checked={this.state.bathymetry}
            onUpdate={this.onLocalUpdate}
            title={_("Show Bathymetry Contours")}
          />

          <CheckBox
            key="showarea"
            id="showarea"
            checked={this.state.showarea}
            onUpdate={this.onLocalUpdate}
            title={_("Show Selected Area(s)")}
          >
            {_("showarea_help")}
          </CheckBox>

          {/* Arrow Selector Drop Down menu */}
          <QuiverSelector
            key="quiver"
            id="quiver"
            state={this.state.quiver}
            def=""
            onUpdate={this.onLocalUpdate}
            dataset={this.state.dataset_0.id}
            title={_("Arrows")}
          />

          {/* Contour Selector drop down menu */}
          <ContourSelector
            key="contour"
            id="contour"
            state={this.state.contour}
            def=""
            onUpdate={this.onLocalUpdate}
            dataset={this.state.dataset_0.id}
            title={_("Additional Contours")}
          >
            {/* {_("contour_help")} */}
          </ContourSelector>
          <Accordion>
            <Accordion.Header>Plot Options</Accordion.Header>
            <Accordion.Body>{plotOptions}</Accordion.Body>
          </Accordion>
        </Card.Body>
      </Card>
    );

    const subsetPanel = (
      <SubsetPanel
        id="SubsetPanel"
        key="SubsetPanel"
        dataset={this.props.dataset_0}
        area={this.props.area}
      />
    );

    const dataset = (
      <Card key="left_map" id="left_map" variant="primary">
        <Card.Header>
          {this.props.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
        </Card.Header>
        <Card.Body className="global-settings-card">
          <DatasetSelector
            key="area_window_dataset_0"
            id="dataset_0"
            onUpdate={this.props.updateDataset0}
            showQuiverSelector={false}
            showVariableRange={false}
            mapSettings={this.props.mapSettings}
            mountedDataset={this.props.dataset_0}
          />

          <ComboBox
            key="leftColormap"
            id="leftColormap"
            state={this.state.leftColormap}
            def="default"
            onUpdate={this.onLocalUpdate}
            url="/api/v2.0/plot/colormaps"
            title={_("Colourmap")}
          >
            {_("colourmap_help")}
            <img src="/api/v2.0/plot/colormaps.png/" />
          </ComboBox>
        </Card.Body>
      </Card>
    );

    const compare_dataset = (
      <div key="compare_dataset">
        <div style={{ display: this.props.dataset_compare ? "block" : "none" }}>
          <Card
            key="right_map"
            id="right_map"
            variant="primary"
          >
            <Card.Header>{_("Right Map")}</Card.Header>
            <Card.Body className="global-settings-card">
              <DatasetSelector
                key="area_window_dataset_1"
                id="dataset_1"
                onUpdate={this.props.updateDataset1}
                showQuiverSelector={false}
                showVariableRange={false}
                mapSettings={this.props.mapSettings}
                mountedDataset={this.props.dataset_1}
              />

              <ComboBox
                key="rightColormap"
                id="rightColormap"
                state={this.state.rightColormap}
                def="default"
                onUpdate={this.onLocalUpdate}
                url="/api/v2.0/plot/colormaps"
                title={_("Colourmap")}
              >
                {_("colourmap_help")}
                <img src="/api/v2.0/plot/colormaps.png/" />
              </ComboBox>
            </Card.Body>
          </Card>
        </div>
      </div>
    );

    let leftInputs = [];
    let rightInputs = [];
    const plot_query = {
      dataset: this.props.dataset_0.id,
      quantum: this.props.dataset_0.quantum,
      scale: this.state.scale,
      name: this.props.name,
    };

    let area = [];
    if (typeof this.props.area[0] === "string") {
      area = [this.props.area[0]];
    } else {
      area = [
        {
          polygons: [this.props.area],
          innerrings: [],
          name: "",
        },
      ];
    }

    let content = null;
    switch (this.state.currentTab) {
      case 1:
        plot_query.type = "map";
        plot_query.colormap = this.state.leftColormap;
        plot_query.time = this.props.dataset_0.time;
        plot_query.area = area;
        plot_query.depth = this.state.dataset_0.depth;
        plot_query.bathymetry = this.state.bathymetry;
        plot_query.quiver = this.state.quiver;
        plot_query.contour = this.state.contour;
        plot_query.showarea = this.state.showarea;
        plot_query.variable = this.props.dataset_0.variable;
        plot_query.projection = this.props.projection;
        plot_query.size = this.state.size;
        plot_query.dpi = this.state.dpi;
        plot_query.interp = this.props.mapSettings.interpType;
        plot_query.radius = this.props.mapSettings.interpRadius;
        plot_query.neighbours = this.props.mapSettings.interpNeighbours;
        plot_query.plotTitle = this.state.plotTitle;
        if (this.props.dataset_compare) {
          plot_query.compare_to = { ...this.props.dataset_1 };
          plot_query.compare_to.dataset = this.props.dataset_1.id;
          plot_query.compare_to.scale = this.state.scale_1;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.rightColormap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }

        leftInputs = [mapSettings, subsetPanel]; //Left Sidebar
        rightInputs = [dataset]; //Right Sidebar

        if (this.props.dataset_compare) {
          //Adds pane to right sidebar when compare is selected
          rightInputs.push(compare_dataset);
        }
        content = (
          <PlotImage
            query={plot_query} // For image saving link.
            permlink_subquery={this.state}
            action={this.props.action}
          />
        );
        break;
    }

    return (
      <div className="AreaWindow Window">
        <Nav
          variant="tabs"
          activeKey={this.state.currentTab}
          onSelect={this.onTabChange}
        >
          <Nav.Item>
            <Nav.Link eventKey={1}>{_("Map")}</Nav.Link>
          </Nav.Item>
        </Nav>
        <Row>
          <Col className="settings-col" lg={2}>
            {leftInputs}
          </Col>
          <Col className="plot-col" lg={8}>
            {content}
          </Col>
          <Col className="settings-col" lg={2}>
            {rightInputs}
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
AreaWindow.propTypes = {
  area: PropTypes.array.isRequired,
  eneratePermLink: PropTypes.func,
  dataset_1: PropTypes.object.isRequired,
  dataset_compare: PropTypes.bool,
  variable: PropTypes.string,
  projection: PropTypes.string,
  dataset_0: PropTypes.object.isRequired,
  name: PropTypes.string,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  showHelp: PropTypes.func,
  swapViews: PropTypes.func,
  options: PropTypes.object,
};

export default withTranslation()(AreaWindow);
