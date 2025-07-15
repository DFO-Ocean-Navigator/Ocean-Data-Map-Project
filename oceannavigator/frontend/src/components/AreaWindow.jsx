import React, { useState, useEffect, useRef } from "react";
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
import { useTranslation } from "react-i18next";
import { formToJSON } from "axios";

const AreaWindow = (props) => {
  const { t } = useTranslation();
  const mountedRef = useRef(false);

  // Initialize state with props and optional init overrides
  const [state, setState] = useState(() => ({
    currentTab: 1,
    scale: props.dataset_0.variable_scale + ",auto",
    scale_1: props.dataset_1.scale_1 + ",auto",
    scale_diff: "-10,10,auto",
    leftColormap: "default",
    rightColormap: "default",
    colormap_diff: "default",
    dataset_0: { ...props.dataset_0 },
    dataset_1: { ...props.dataset_1 },
    // Should dataset/variable changes in this window
    // propagate to the entire site?
    syncLocalToGlobalState: false,
    showarea: true,
    surfacevariable: "none",
    bathymetry: true, // Show bathymetry on map
    plotTitle: undefined,
    quiver: { variable: "", magnitude: "length", colormap: "default" },
    contour: {
      variable: "",
      colormap: "default",
      levels: "auto",
      legend: true,
      hatch: false,
    },
    size: "10x7", // Plot dimensions
    dpi: 144, // Plot DPI
    ...props.init,
  }));

  // Track mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync scale when dataset_0.variable changes
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      scale: props.dataset_0.variable_scale + ",auto",
    }));
  }, [props.dataset_0.variable]);

  const onLocalUpdate = (key, value) => {
    if (!mountedRef.current) return;
    // Handle nested state updates
    if (key === "dataset_0" || key === "dataset_1") {
      setState((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...value },
      }));
    } else if (key === "scale" && Array.isArray(value)) {
      setState((prev) => ({ ...prev, scale: `${value[0]},${value[1]}` }));
    } else if (Array.isArray(key)) {
      const updates = {};
      key.forEach((k, i) => {
        updates[k] = value[i];
      });
      setState((prev) => ({ ...prev, ...updates }));
    } else {
      setState((prev) => ({ ...prev, [key]: value }));
    }
  };

  const updatePlotTitle = (title) => {
    if (title !== state.plotTitle) {
      setState((prev) => ({ ...prev, plotTitle: title }));
    }
  };

  const compareChanged = (checked) => {
    const newScale = checked
      ? "-10,10,auto"
      : props.dataset_0.variable_scale + ",auto";
    setState((prev) => ({ ...prev, scale: newScale }));
    props.setCompareDatasets(checked);
  };

  const onTabChange = (index) =>
    setState((prev) => ({ ...prev, currentTab: index }));

  // Translation keys for side-effects (if needed)
  useEffect(() => {
    [
      "Dataset",
      "Time",
      "Start Time",
      "End Time",
      "Variable",
      "Variable Range",
      "Colourmap",
      "Show Bathymetry Contours",
      "Arrows",
      "Additional Contours",
      "Show Selected Area(s)",
      "Saved Image Size",
    ].forEach((key) => t(key));
  }, [t]);

  // Prepare UI segments
  const plotOptions = (
    <div>
      <ImageSize
        id="size"
        state={state.size}
        onUpdate={onLocalUpdate}
        title={t("Saved Image Size")}
      />
      <CustomPlotLabels
        id="title"
        title={t("Plot Title")}
        updatePlotTitle={updatePlotTitle}
        plotTitle={state.plotTitle}
      />
    </div>
  );

  const mapSettings = (
    <Card variant="primary">
      <Card.Header>{t("Area Settings")}</Card.Header>
      <Card.Body className="global-settings-card">
        <CheckBox
          id="dataset_compare"
          checked={props.dataset_compare}
          onUpdate={(_, checked) => compareChanged(checked)}
          title={t("Compare Datasets")}
        />

        {/* Displays Options for Compare Datasets */}
        <Button
          variant="default"
          style={{ display: props.dataset_compare ? "block" : "none" }}
          onClick={props.swapViews}
        >
          {t("Swap Views")}
        </Button>
        <ColormapRange
          auto
          id="scale"
          state={state.scale.split(",")}
          onUpdate={onLocalUpdate}
        />
        {props.dataset_compare &&
          state.dataset_0.variable === props.dataset_1.variable && (
            <ComboBox
              id="colormap_diff"
              state={state.colormap_diff}
              def="default"
              onUpdate={onLocalUpdate}
              url="/api/v2.0/plot/colormaps"
              title={t("Diff. Colourmap")}
            >
              <img src="/api/v2.0/plot/colormaps.png/" alt="" />
            </ComboBox>
          )}
        {/* End of Compare Datasets options */}
        <CheckBox
          id="bathymetry"
          checked={state.bathymetry}
          onUpdate={onLocalUpdate}
          title={t("Show Bathymetry Contours")}
        />
        <CheckBox
          id="showarea"
          checked={state.showarea}
          onUpdate={onLocalUpdate}
          title={t("Show Selected Area(s)")}
        />
        {/* Arrow Selector Drop Down menu */}
        <QuiverSelector
          id="quiver"
          state={state.quiver}
          onUpdate={onLocalUpdate}
          dataset={state.dataset_0.id}
          title={t("Arrows")}
        />
        {/* Contour Selector drop down menu */}
        <ContourSelector
          id="contour"
          state={state.contour}
          onUpdate={onLocalUpdate}
          dataset={state.dataset_0.id}
          title={t("Additional Contours")}
        />
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
      dataset={props.dataset_0}
      area={props.plotData.coordinates}
    />
  );

  const datasetCard = (
    <Card id="left_map" variant="primary">
      <Card.Header>
        {props.dataset_compare ? t("Left Map (Anchor)") : t("Main Map")}
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
          state={state.leftColormap}
          def="default"
          onUpdate={onLocalUpdate}
          url="/api/v2.0/plot/colormaps"
          title={t("Colourmap")}
        >
          <img src="/api/v2.0/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  const compareDatasetCard = props.dataset_compare && (
    <Card id="right_map" variant="primary">
      <Card.Header>{t("Right Map")}</Card.Header>
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
          state={state.rightColormap}
          def="default"
          onUpdate={onLocalUpdate}
          url="/api/v2.0/plot/colormaps"
          title={t("Colourmap")}
        >
          <img src="/api/v2.0/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  // Build plot query for Tab 1
  let content = null;
  if (state.currentTab === 1) {
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
      scale: state.scale,
      name: props.name,
      type: "map",
      colormap: state.leftColormap,
      time: props.dataset_0.time,
      area,
      depth: props.dataset_0.depth,
      bathymetry: state.bathymetry,
      quiver: state.quiver,
      contour: state.contour,
      showarea: state.showarea,
      variable: props.dataset_0.variable,
      projection: props.mapSettings.projection,
      size: state.size,
      dpi: state.dpi,
      interp: props.mapSettings.interpType,
      radius: props.mapSettings.interpRadius,
      neighbours: props.mapSettings.interpNeighbours,
      plotTitle: state.plotTitle,
      ...(props.dataset_compare && {
        compare_to: {
          ...props.dataset_1,
          dataset: props.dataset_1.id,
          scale: state.scale_1,
          scale_diff: state.scale_diff,
          colormap: state.rightColormap,
          colormap_diff: state.colormap_diff,
        },
      }),
    };

    content = (
      <PlotImage
        query={plot_query}
        permlink_subquery={state}
        action={props.action}
      />
    );
  }

  return (
    <div className="AreaWindow Window">
      <Nav variant="tabs" activeKey={state.currentTab} onSelect={onTabChange}>
        <Nav.Item>
          <Nav.Link eventKey={1}>{t("Map")}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row className="plot-window-container">
        <Col className="settings-col" lg={2}>
          {mapSettings}
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
//***********************************************************************
AreaWindow.propTypes = {
  plotData: PropTypes.object.isRequired,
  generatePermLink: PropTypes.func,
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
  setCompareDatasets: PropTypes.func.isRequired,
  updateDataset0: PropTypes.func.isRequired,
  updateDataset1: PropTypes.func.isRequired,
  mapSettings: PropTypes.object.isRequired,
};

export default AreaWindow;
