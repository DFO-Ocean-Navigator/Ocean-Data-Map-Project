import React, { useState, useEffect } from "react";
import { Accordion, Button, Card, Col, Form, Row, Nav } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "../ComboBox.jsx";
import ColormapRange from "../ColormapRange.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ContourSelector from "../ContourSelector.jsx";
import AreaQuiverSelector from "./AreaQuiverSelector.jsx";
import ImageSize from "../ImageSize.jsx";
import CustomPlotLabels from "../CustomPlotLabels.jsx";
import DatasetPanel from "../DatasetPanel.jsx";
import SubsetPanel from "../SubsetPanel.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const AreaWindow = (props) => {
  const { t: _ } = props;

  // UI state
  const [currentTab, setCurrentTab] = useState(props.init?.currentTab || 1);

  // Scale settings
  const [scale, setScale] = useState(props.init?.scale || "auto");
  const [autoScale, setAutoScale] = useState(props.init?.autoScale || true);

  // Colormap settings
  const [leftColormap, setLeftColormap] = useState(
    props.init?.leftColormap || "default"
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
      variable: "none",
      magnitude: "length",
      colormap: "default",
    }
  );

  const [contour, setContour] = useState(
    props.init?.contour || {
      variable: "none",
      colormap: "default",
      levels: "auto",
      legend: true,
      hatch: false,
    }
  );

  // Sync scale when dataset0.variable changes
  useEffect(() => {
    if (!autoScale) {
      setScale(props.dataset0.variable.scale);
    }
  }, [props.dataset0.variable]);

  const handleQuiverUpdate = (key, value) => {
    setQuiver(typeof value === "object" ? { ...quiver, ...value } : value);
  };

  const handleContourUpdate = (key, value) => {
    setContour(typeof value === "object" ? { ...contour, ...value } : value);
  };

  const compareChanged = (checked) => {
    const newScale = checked
      ? autoScale
        ? "auto"
        : [-10, 10]
      : props.dataset0.variable.scale;
    setScale(newScale);
    props.setCompareDatasets(checked);
  };

  const toggleAutoScale = () => {
    let newScale = "auto";
    if (autoScale) {
      newScale = props.compareDatasets
        ? [-10, 10]
        : props.dataset0.variable.scale;
    }
    setScale(newScale);
    setAutoScale((p) => !p);
  };

  const updatePlotSize = (key, value) => {
    if (key === "size") {
      setPlotSize(value);
    } else if (key === "dpi") {
      setPlotDpi(value);
    }
  };

  // Prepare UI segments
  const plotOptions = (
    <div>
      <ImageSize
        id="size"
        onUpdate={updatePlotSize}
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
        {props.compareDatasets && !autoScale && (
          <ComboBox
            id="colormap_diff"
            state={diffColormap}
            onUpdate={(_, value) => setDiffColormap(value)}
            title={_("Diff. Colourmap")}
            url="/api/v2.0/plot/colormaps"
          >
            {_("colourmap_help")}
            <img src="/api/v2.0/plot/colormaps.png/" alt="" />
          </ComboBox>
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
        <AreaQuiverSelector
          id="quiver"
          state={quiver}
          onUpdate={handleQuiverUpdate}
          dataset={props.dataset0.id}
          title={_("Arrows")}
        >
          {_("arrows_help")}
        </AreaQuiverSelector>

        {/* Contour Selector drop down menu */}
        <ContourSelector
          id="contour"
          state={contour}
          onUpdate={handleContourUpdate}
          dataset={props.dataset0.id}
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
      dataset={props.dataset0}
      area={props.plotData.coordinates}
    />
  );

  const datasetCard = (
    <Card id="left_map" variant="primary">
      <Card.Header>
        {props.compareDatasets ? _("Left Map (Anchor)") : _("Main Map")}
      </Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetPanel
          id="area-window-dataset0-panel"
          onUpdate={props.updateDataset0}
          showQuiverSelector={false}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset0}
        />
        {!props.compareDatasets && (
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
        )}
      </Card.Body>
    </Card>
  );

  const compareDatasetCard = props.compareDatasets && (
    <Card id="right_map" variant="primary">
      <Card.Header>{_("Right Map")}</Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetPanel
          id="area-window-dataset1-panel"
          onUpdate={props.updateDataset1}
          showQuiverSelector={false}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset1}
        />
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

    const plotQuery = {
      dataset: props.dataset0.id,
      scale: scale.toString(),
      name: props.names[0],
      type: "map",
      colormap: props.compareDatasets
        ? diffColormap.toString()
        : leftColormap.toString(),
      time: props.dataset0.time.id,
      area,
      depth: props.dataset0.depth,
      bathymetry: bathymetry,
      quiver,
      contour,
      showarea: showArea,
      variable: props.dataset0.variable.id,
      projection: props.mapSettings.projection,
      interp: props.mapSettings.interpType,
      radius: props.mapSettings.interpRadius,
      neighbours: props.mapSettings.interpNeighbours,
      ...(props.compareDatasets &&
        props.dataset1.time.id > 0 && {
          compare_to: {
            dataset: props.dataset1.id,
            variable: props.dataset1.variable.id,
            time: props.dataset1.time.id,
            depth: props.dataset1.depth,
            scale: "auto",
            scale_diff: scale?.toString(),
            colormap_diff: diffColormap.toString(),
          },
        }),
    };

    const permlink_subquery = {
      currentTab,
      scale,
      scale_diff: scale.toString(),
      leftColormap: leftColormap.toString(),
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
        plotType="map"
        query={plotQuery}
        permlink_subquery={permlink_subquery}
        featureId={props.plotData.id}
        action={props.action}
        size={plotSize}
        dpi={plotDpi}
      />
    );
  }

  return (
    <div className="AreaWindow Window">
      <Nav variant="tabs" activeKey={currentTab} onSelect={setCurrentTab}>
        <Nav.Item>
          <Nav.Link eventKey={1} disabled>
            
            {_("Map")}
          
          </Nav.Link>
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
  dataset1: PropTypes.object.isRequired,
  compareDatasets: PropTypes.bool,
  variable: PropTypes.string,
  projection: PropTypes.string,
  dataset0: PropTypes.object.isRequired,
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
