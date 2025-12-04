import React, { useState, useEffect } from "react";
import { Accordion, Card, Col, Form, Row, Nav } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "../ComboBox.jsx";
import ColormapRange from "../ColormapRange.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ContourSelector from "../ContourSelector.jsx";
import QuiverSelector from "../QuiverSelector.jsx";
import ImageSize from "../ImageSize.jsx";
import CustomPlotLabels from "../CustomPlotLabels.jsx";
import DatasetSelector from "../DatasetSelector.jsx";
import SubsetPanel from "../SubsetPanel.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const AreaWindow = (props) => {
  const { t: _ } = props;

  // UI state
  const [currentTab, setCurrentTab] = useState(props.init?.currentTab || 1);

  // Scale settings
  const [scale, setScale] = useState(props.init?.scale || "auto");
  const [autoScale, setAutoScale] = useState(props.init?.autoScale ||true);

  // Colormap settings
  const [leftColormap, setLeftColormap] = useState(
    props.init?.leftColormap || "default"
  );
  const [rightColormap, setRightColormap] = useState(
    props.init?.rightColormap || "default"
  );
  const [diffColormap, setDiffColormap] = useState(
    props.init?.colormap_diff || "default"
  );

  // Plot settings
  const [plotSize, setPlotSize] = useState(props.init?.size || "10x7");
  const [plotDpi, setPlotDpi] = useState(props.init?.dpi || 144);
  const [plotTitle, setPlotTitle] = useState(props.init?.plotTitle);

  // Map settings
  const [showArea, setShowArea] = useState(props.init?.showarea ?? true);
  const [bathymetry, setBathymetry] = useState(props.init?.bathymetry ?? true);
  const [surfaceVariable, setSurfaceVariable] = useState(
    props.init?.surfacevariable || "none"
  );

  // Feature settings
  const [quiver, setQuiver] = useState(
    props.init?.quiver || {
      variable: "",
      magnitude: "length",
      colormap: "default",
    }
  );

  const [contour, setContour] = useState(
    props.init?.contour || {
      variable: "",
      colormap: "default",
      levels: "auto",
      legend: true,
      hatch: false,
    }
  );

  // Sync scale when dataset_0.variable changes
  useEffect(() => {
    if (!autoScale) {
      setScale(props.dataset_0.variable_scale);
    }
  }, [props.dataset_0.variable]);

  const handleQuiverUpdate = (key, value) => {
    setQuiver(typeof value === "object" ? { ...quiver, ...value } : value);
  };

  const handleContourUpdate = (key, value) => {
    setContour(typeof value === "object" ? { ...contour, ...value } : value);
  };

  const compareChanged = (checked) => {
    const newScale = checked ? [-10, 10] : props.dataset_0.variable_scale;
    setScale(newScale);
    props.setCompareDatasets(checked);
  };

  const toggleAutoScale = () => {
    let newScale = "auto";
    if (autoScale) {
      newScale = props.compareDatasets
        ? [-10, 10]
        : props.dataset_0.variable_scale;
    }
    setScale(newScale);
    setAutoScale((p) => !p);
  };

  // Prepare UI segments
  const plotOptions = (
    <div>
      <ImageSize
        id="size"
        state={plotSize}
        onUpdate={(_, value) => setPlotSize(value)}
        title={_("Saved Image Size")}
      />
      <CustomPlotLabels
        id="title"
        title={_("Plot Title")}
        updatePlotTitle={setPlotTitle}
        plotTitle={plotTitle}
      />
    </div>
  );

  const mapSettingsCard = (
    <Card variant="primary">
      <Card.Header>{_("Area Settings")}</Card.Header>
      <Card.Body className="global-settings-card">
        <CheckBox
          id="dataset_compare"
          checked={props.compareDatasets}
          onUpdate={(_, checked) => compareChanged(checked)}
          title={_("Compare Datasets")}
        />

        {/* Displays Options for Compare Datasets */}
        {/* <Button
          variant="default"
          style={{ display: props.compareDatasets ? "block" : "none" }}
          onClick={props.swapViews}
        >
          {_("Swap Views")}
        </Button> */}
        <Form.Check
          type="checkbox"
          id={props.id + "_auto"}
          checked={autoScale}
          onChange={toggleAutoScale}
          label={"Auto Range"}
        />
        {autoScale ? null : (
          <ColormapRange
            id="scale"
            state={scale}
            onUpdate={(_, s) => setScale(s)}
          />
        )}
        {/* End of Compare Datasets options */}
        <CheckBox
          id="bathymetry"
          checked={bathymetry}
          onUpdate={(_, value) => setBathymetry(value)}
          title={_("Show Bathymetry Contours")}
        />

        <CheckBox
          id="showarea"
          checked={showArea}
          onUpdate={(_, value) => setShowArea(value)}
          title={_("Show Selected Area(s)")}
        />
        {/* Arrow Selector Drop Down menu */}
        <QuiverSelector
          id="quiver"
          state={quiver}
          onUpdate={handleQuiverUpdate}
          dataset={props.dataset_0.id}
          title={_("Arrows")}
        >
          {_("arrows_help")}
        </QuiverSelector>

        {/* Contour Selector drop down menu */}
        <ContourSelector
          id="contour"
          state={contour}
          onUpdate={handleContourUpdate}
          dataset={props.dataset_0.id}
          title={_("Additional Contours")}
        >
          {_("contour_help")}
        </ContourSelector>

        <Accordion>
          <Accordion.Header>{_("Plot Options")}</Accordion.Header>
          <Accordion.Body>{plotOptions}</Accordion.Body>
        </Accordion>
      </Card.Body>
    </Card>
  );

  const subsetPanel = (
    <SubsetPanel
      id="SubsetPanel"
      dataset={props.dataset_0}
      area={props.plotData.coordinates}
    />
  );

  const datasetCard = (
    <Card id="left_map" variant="primary">
      <Card.Header>
        {props.compareDatasets ? _("Left Map (Anchor)") : _("Main Map")}
      </Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetSelector
          id="dataset_0"
          onUpdate={props.updateDataset0}
          showQuiverSelector={false}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_0}
        />
        <ComboBox
          id="leftColormap"
          state={leftColormap}
          def="default"
          onUpdate={(_, value) => setLeftColormap(value)}
          url="/api/v2.0/plot/colormaps"
          title={_("Colourmap")}
        >
          {_("colourmap_help")}
          <img src="/api/v2.0/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  const compareDatasetCard = props.compareDatasets && (
    <Card id="right_map" variant="primary">
      <Card.Header>{_("Right Map")}</Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetSelector
          id="dataset_1"
          onUpdate={props.updateDataset1}
          showQuiverSelector={false}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_1}
        />
        <ComboBox
          id="rightColormap"
          state={rightColormap}
          def="default"
          onUpdate={(_, value) => setRightColormap(value)}
          url="/api/v2.0/plot/colormaps"
          title={_("Colourmap")}
        >
          <img src="/api/v2.0/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  // Build plot query for Tab 1
  let content = null;
  if (currentTab === 1) {
    const area =
      typeof props.plotData.coordinates[0] === "string"
        ? [props.plotData.coordinates[0]]
        : [
            {
              polygons: [props.plotData.coordinates],
              innerrings: [],
              name: "",
            },
          ];

    const plot_query = {
      dataset: props.dataset_0.id,
      quantum: props.dataset_0.quantum,
      scale: scale.toString(),
      name: props.names[0],
      type: "map",
      colormap: leftColormap.toString(),
      time: props.dataset_0.time,
      area,
      depth: props.dataset_0.depth,
      bathymetry: bathymetry,
      quiver,
      contour,
      showarea: showArea,
      variable: props.dataset_0.variable,
      projection: props.mapSettings.projection,
      size: plotSize,
      dpi: plotDpi,
      interp: props.mapSettings.interpType,
      radius: props.mapSettings.interpRadius,
      neighbours: props.mapSettings.interpNeighbours,
      plotTitle: plotTitle,
      ...(props.compareDatasets && {
        compare_to: {
          ...props.dataset_1,
          dataset: props.dataset_1.id,
          scale: props.dataset_1.variable_scale.toString(),
          scale_diff: scale?.toString(),
          colormap: rightColormap.toString(),
          colormap_diff: diffColormap.toString(),
        },
      }),
    };

    const permlink_subquery = {
      currentTab,
      scale,
      scale_1: props.dataset_1.variable_scale,
      scale_diff: scale.toString(),
      leftColormap: leftColormap.toString(),
      rightColormap:rightColormap.toString(),
      colormap_diff: diffColormap.toString(),
      size: plotSize,
      dpi: plotDpi,
      plotTitle,
      showarea: showArea,
      bathymetry,
      surfacevariable: surfaceVariable,
      quiver,
      contour,
    };

    content = (
      <PlotImage
        query={plot_query}
        permlink_subquery={permlink_subquery}
        action={props.action}
      />
    );
  }

  return (
    <div className="AreaWindow Window">
      <Nav variant="tabs" activeKey={currentTab} onSelect={setCurrentTab}>
        <Nav.Item>
          <Nav.Link eventKey={1}>{_("Map")}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row className="plot-window-container">
        <Col className="settings-col" lg={2}>
          {mapSettingsCard}
          {subsetPanel}
        </Col>
        <Col className="plot-col" lg={8}>
          {content}
        </Col>
        <Col className="settings-col" lg={2}>
          {datasetCard}
          {compareDatasetCard}
        </Col>
      </Row>
    </div>
  );
};

AreaWindow.propTypes = {
  plotData: PropTypes.object.isRequired,
  generatePermLink: PropTypes.func,
  dataset_1: PropTypes.object.isRequired,
  compareDatasets: PropTypes.bool,
  variable: PropTypes.string,
  projection: PropTypes.string,
  dataset_0: PropTypes.object.isRequired,
  name: PropTypes.string,
  onUpdate: PropTypes.func,
  init: PropTypes.object,
  action: PropTypes.func,
  showHelp: PropTypes.func,
  swapViews: PropTypes.func,
  setCompareDatasets: PropTypes.func.isRequired,
  updateDataset0: PropTypes.func.isRequired,
  updateDataset1: PropTypes.func.isRequired,
  mapSettings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(AreaWindow);
