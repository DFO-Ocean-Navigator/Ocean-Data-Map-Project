import React, { useState, useEffect } from "react";
import { Accordion, Card, Nav, Row, Col, Button } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "../ComboBox.jsx";
import Range from "../ColormapRange.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ImageSize from "../ImageSize.jsx";
import TransectLimiter from "../TransectLimiter.jsx";
import DatasetSelector from "../DatasetSelector.jsx";
import CustomPlotLabels from "../CustomPlotLabels.jsx";
import PropTypes from "prop-types";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { withTranslation } from "react-i18next";

const LineWindow = (props) => {
  const { t: _ } = props;

  // UI state
  const [selected, setSelected] = useState(props.init?.selected || 1);

  // Scale settings
  const [scale, setScale] = useState(
    props.init?.scale || props.dataset_0.variable_scale + ",auto"
  );
  const [scale1, setScale1] = useState(
    props.init?.scale_1 || props.dataset_1.variable_scale + ",auto"
  );
  const [scaleDiff, setScaleDiff] = useState(
    props.init?.scale_diff || "-10,10,auto"
  );

  // Colormap settings
  const [mainColormap, setMainColormap] = useState(
    props.init?.colormap || "default"
  );
  const [rightColormap, setRightColormap] = useState(
    props.init?.colormap_right || "default"
  );
  const [diffColormap, setDiffColormap] = useState(
    props.init?.colormap_diff || "default"
  );

  // Plot settings
  const [plotSize, setPlotSize] = useState(props.init?.size || "10x7");
  const [plotDpi, setPlotDpi] = useState(props.init?.dpi || 144);
  const [plotTitles, setPlotTitles] = useState(
    props.init?.plotTitles || Array(2).fill("")
  );

  // Map and display settings
  const [showMap, setShowMap] = useState(props.init?.showmap ?? true);
  const [surfaceVariable, setSurfaceVariable] = useState(
    props.init?.surfacevariable || "none"
  );
  const [selectedPlots, setSelectedPlots] = useState(
    props.init?.selectedPlots || [0, 1, 1]
  );

  // Transect-specific settings
  const [linearThresh, setLinearThresh] = useState(
    props.init?.linearthresh || false
  );
  const [depthLimit, setDepthLimit] = useState(
    props.init?.depth_limit || false
  );
  const [profileDistance, setProfileDistance] = useState(
    props.init?.profile_distance || -1
  );
  const [showProfile, setShowProfile] = useState(
    props.init?.show_profile || false
  );

  const onSelect = (key) => {
    setSelected(parseInt(key));
  };

  const updatePlotTitle = (title) => {
    const idx = selected - 1;
    setPlotTitles((prev) => {
      const titles = [...prev];
      titles[idx] = title;
      return titles;
    });
  };

  const handleProfileCheck = (_, value) => {
    setShowProfile(value);
    setProfileDistance(value ? 0 : -1);
  };

  const handleSliderChange = (x) => {
    setProfileDistance((x / 100) * props.plotData.distance);
  };

  // UI segments
  const plotOptions = (
    <>
      <ImageSize
        id="size"
        state={plotSize}
        onUpdate={(_, value) => setPlotSize(value)}
        title={_("Saved Image Size")}
      />
      <CustomPlotLabels
        id="title"
        title={_("Plot Title")}
        plotTitle={plotTitles[selected - 1]}
        updatePlotTitle={updatePlotTitle}
      />
    </>
  );

  const globalSettings = (
    <Card id="global_settings" variant="primary">
      <Card.Header>{_("Global Settings")}</Card.Header>
      <Card.Body>
        <CheckBox
          id="dataset_compare"
          checked={props.dataset_compare}
          onUpdate={(_, checked) => props.setCompareDatasets(checked)}
          title={_("Compare Datasets")}
        />
        <Button
          id="swap_views"
          style={{ display: props.dataset_compare ? "block" : "none" }}
          onClick={props.swapViews}
        >
          {_("Swap Views")}
        </Button>
        {props.dataset_compare &&
          props.dataset_0.variable === props.dataset_1.variable && (
            <Range
              id="scale_diff"
              state={scaleDiff}
              onUpdate={(_, value) => setScaleDiff(value)}
              title={_("Diff. Variable Range")}
            />
          )}
        <CheckBox
          id="showmap"
          checked={showMap}
          onUpdate={(_, value) => setShowMap(value)}
          title={_("Show Location")}
        >
          {_("showmap_help")}
        </CheckBox>
        <Accordion>
          <Accordion.Header>{_("Plot Options")}</Accordion.Header>
          <Accordion.Body>{plotOptions}</Accordion.Body>
        </Accordion>
      </Card.Body>
    </Card>
  );

  const transectSettingsCard = (
    <Card id="transect_settings" variant="primary">
      <Card.Header>{_("Transect Settings")}</Card.Header>
      <Card.Body>
        <ComboBox
          id="surfacevariable"
          state={surfaceVariable}
          onUpdate={(_, value) => {
            let variableName = value;
            if (Array.isArray(value) && value.length > 0) {
              variableName = value[0];
            } else if (typeof value === "object" && value !== null) {
              variableName = value.id || value.name || value.variable || "none";
            } else if (typeof value !== "string") {
              variableName = String(value) || "none";
            }
            setSurfaceVariable(variableName);
          }}
          title={_("Surface Variable")}
          url={`/api/v2.0/dataset/${props.dataset_0.id}/variables`}
        >
          {_("surfacevariable_help")}
        </ComboBox>
        <TransectLimiter
          id="linearthresh"
          state={linearThresh}
          onUpdate={(_, value) => setLinearThresh(value)}
          title={_("Exponential Plot")}
          parameter={_("Linear Threshold")}
        >
          {_("linearthresh_help")}
        </TransectLimiter>
        <TransectLimiter
          id="depth_limit"
          state={depthLimit}
          onUpdate={(_, value) => setDepthLimit(value)}
          title={_("Limit Depth")}
          parameter={_("Depth")}
        />
        <CheckBox
          id="show_profile"
          checked={showProfile}
          onUpdate={handleProfileCheck}
          title={_("Extract Profile Plot")}
        />
        {showProfile && (
          <div className="slider-container">
            <Slider
              min={0}
              max={100}
              marks={{
                0: "0km",
                25: (props.plotData.distance / 1000 / 4).toFixed(1),
                50: (props.plotData.distance / 1000 / 2).toFixed(1),
                75: (((props.plotData.distance / 1000) * 3) / 4).toFixed(1),
                100: (props.plotData.distance / 1000).toFixed(1),
              }}
              onAfterChange={handleSliderChange}
            />
          </div>
        )}
        {props.dataset_compare &&
          props.dataset_0.variable === props.dataset_1.variable && (
            <ComboBox
              id="colormap_diff"
              state={diffColormap}
              onUpdate={(_, value) => setDiffColormap(value)}
              title={_("Diff. Colour Map")}
              url="/api/v2.0/plot/colormaps"
            >
              {_("colourmap_help")}
              <img src="/plot/colormaps.png/" alt="" />
            </ComboBox>
          )}
      </Card.Body>
    </Card>
  );

  const leftDataset = (
    <Card id="left_map" variant="primary">
      <Card.Header>
        {props.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
      </Card.Header>
      <Card.Body>
        <DatasetSelector
          id="dataset_0"
          onUpdate={props.updateDataset0}
          variables={selected === 2 ? "all" : "3d"}
          showQuiverSelector={false}
          showDepthSelector={selected === 2}
          showTimeRange={selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_0}
        />
        <ComboBox
          id="colormap"
          state={mainColormap}
          onUpdate={(_, value) => setMainColormap(value)}
          title={_("Colour Map")}
          url="/api/v2.0/plot/colormaps"
        >
          {_("colourmap_help")}
          <img src="/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  const rightDataset = props.dataset_compare && (
    <Card id="right_map" variant="primary">
      <Card.Header>{_("Right Map")}</Card.Header>
      <Card.Body>
        <DatasetSelector
          id="dataset_1"
          onUpdate={props.updateDataset1}
          variables={selected === 2 ? "all" : "3d"}
          showQuiverSelector={false}
          showDepthSelector={selected === 2}
          showTimeRange={selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_1}
        />
        <ComboBox
          id="colormap_right"
          state={rightColormap}
          onUpdate={(_, value) => setRightColormap(value)}
          title={_("Colour Map")}
          url="/api/v2.0/plot/colormaps"
        >
          {_("colourmap_help")}
          <img src="/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  const baseQuery = {
    dataset: props.dataset_0.id,
    quantum: props.dataset_0.quantum,
    name: props.names[0],
    size: plotSize,
    dpi: plotDpi,
    plotTitle: plotTitles[selected - 1],
  };

  let plot_query = {};
  if (selected === 1) {
    const safeSurfaceVariable =
      typeof surfaceVariable === "string" ? surfaceVariable : "none";

    plot_query = {
      ...baseQuery,
      type: "transect",
      variable: props.dataset_0.variable,
      path: props.plotData.coordinates,
      scale: scale,
      colormap: mainColormap,
      showmap: showMap,
      time: props.dataset_0.time,
      linearthresh: linearThresh,
      surfacevariable: safeSurfaceVariable,
      depth_limit: depthLimit,
      profile_distance: profileDistance,
      selectedPlots: selectedPlots.toString(),
      ...(props.dataset_compare && {
        compare_to: {
          ...props.dataset_1,
          dataset: props.dataset_1.id,
          scale: scale1,
          scale_diff: scaleDiff,
          colormap: rightColormap,
          colormap_diff: diffColormap,
        },
      }),
    };
  } else {
    plot_query = {
      ...baseQuery,
      type: "hovmoller",
      variable: props.dataset_0.variable,
      starttime: props.dataset_0.starttime,
      endtime: props.dataset_0.time,
      depth: props.dataset_0.depth,
      ...(props.dataset_compare &&
        props.dataset_0.variable === props.dataset_1.variable && {
          compare_to: {
            ...props.dataset_1,
            dataset: props.dataset_1.id,
            scale: scale1,
            scale_diff: scaleDiff,
            colormap: rightColormap,
            colormap_diff: diffColormap,
          },
        }),
    };
  }

  // Create permlink_subquery from current state
  const permlink_subquery = {
    selected,
    scale,
    scale_1: scale1,
    scale_diff: scaleDiff,
    colormap: mainColormap,
    colormap_right: rightColormap,
    colormap_diff: diffColormap,
    size: plotSize,
    dpi: plotDpi,
    plotTitles,
    showmap: showMap,
    surfacevariable:
      typeof surfaceVariable === "string" ? surfaceVariable : "none",
    selectedPlots,
    linearthresh: linearThresh,
    depth_limit: depthLimit,
    profile_distance: profileDistance,
    show_profile: showProfile,
  };

  return (
    <div className="LineWindow Window">
      <Nav variant="tabs" activeKey={selected} onSelect={onSelect}>
        <Nav.Item>
          <Nav.Link eventKey={1}>{_("Transect")}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={2}>{_("Hovmöller Diagram")}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row className="plot-window-container">
        <Col lg={2} className="settings-col">
          {globalSettings}
          {transectSettingsCard}
        </Col>
        <Col lg={8} className="plot-col">
          <PlotImage
            query={plot_query}
            permlink_subquery={permlink_subquery}
            action={props.action}
          />
        </Col>
        <Col lg={2} className="settings-col">
          {leftDataset}
          {rightDataset}
        </Col>
      </Row>
    </div>
  );
};

LineWindow.propTypes = {
  dataset_compare: PropTypes.bool,
  dataset_0: PropTypes.object.isRequired,
  dataset_1: PropTypes.object.isRequired,
  mapSettings: PropTypes.object.isRequired,
  setCompareDatasets: PropTypes.func.isRequired,
  swapViews: PropTypes.func.isRequired,
  updateDataset0: PropTypes.func.isRequired,
  updateDataset1: PropTypes.func.isRequired,
  names: PropTypes.array,
  plotData: PropTypes.object,
  action: PropTypes.func,
  init: PropTypes.object,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(LineWindow);
