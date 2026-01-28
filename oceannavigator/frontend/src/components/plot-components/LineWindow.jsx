import React, { useState, useEffect } from "react";
import { Accordion, Button, Card, Nav, Row, Col, Form } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "../lib/ComboBox.jsx";
import ColormapRange from "../ColormapRange.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ImageSize from "../ImageSize.jsx";
import TransectLimiter from "../TransectLimiter.jsx";
import DatasetPanel from "..//DatasetPanel.jsx";
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
  const [autoScale, setAutoScale] = useState(props.init?.autoScale || true);
  const [scaleDiff, setScaleDiff] = useState(props.init?.scale_diff || "auto");

  // Colormap settings
  const [mainColormap, setMainColormap] = useState(
    props.init?.colormap || "default",
  );
  const [rightColormap, setRightColormap] = useState(
    props.init?.colormap_right || "default",
  );
  const [diffColormap, setDiffColormap] = useState(
    props.init?.colormap_diff || "default",
  );

  // Plot settings
  const [plotSize, setPlotSize] = useState(props.init?.size || "10x7");
  const [plotDpi, setPlotDpi] = useState(props.init?.dpi || 144);
  const [plotTitles, setPlotTitles] = useState(
    props.init?.plotTitles || Array(2).fill(""),
  );

  // Map and display settings
  const [showMap, setShowMap] = useState(props.init?.showmap ?? true);
  const [surfaceVariable, setSurfaceVariable] = useState(
    props.init?.surfacevariable || "none",
  );
  const [selectedPlots, setSelectedPlots] = useState(
    props.init?.selectedPlots || [0, 1, 1],
  );

  // Transect-specific settings
  const [linearThresh, setLinearThresh] = useState(
    props.init?.linearthresh || false,
  );
  const [depthLimit, setDepthLimit] = useState(
    props.init?.depth_limit || false,
  );
  const [profileDistance, setProfileDistance] = useState(
    props.init?.profile_distance || -1,
  );
  const [showProfile, setShowProfile] = useState(
    props.init?.show_profile || false,
  );

  useEffect(() => {
    if (props.compareDatasets && showProfile) {
      setShowProfile(false);
      setProfileDistance(-1);
    }
  }, [props.compareDatasets]);

  const onSelect = (key) => {
    setSelected(parseInt(key));
  };

  const toggleAutoScale = () => {
    let newScale = "auto";
    if (autoScale) {
      newScale = props.compareDatasets
        ? [-10, 10]
        : props.dataset0.variable_scale;
    }
    setScaleDiff(newScale);
    setAutoScale((p) => !p);
  };

  const updatePlotSize = (key, value) => {
    if (key === "size") {
      setPlotSize(value);
    } else if (key === "dpi") {
      setPlotDpi(value);
    }
  };

  const updatePlotTitle = (title) => {
    const idx = selected - 1;
    setPlotTitles((prev) => {
      const titles = [...prev];
      titles[idx] = title;
      return titles;
    });
  };

  const handleProfileCheck = (e) => {
    setShowProfile(e.target.checked);
    setProfileDistance(e.target.checked ? 0 : -1);
  };

  const handleSliderChange = (x) => {
    setProfileDistance((x / 100) * props.plotData.distance);
  };

  // UI segments
  const plotOptions = (
    <>
      <ImageSize
        id="size"
        onUpdate={updatePlotSize}
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
          checked={props.compareDatasets}
          onUpdate={(_, checked) => props.setCompareDatasets(checked)}
          title={_("Compare Datasets")}
        />
        {/* <Button
          id="swap_views"
          style={{ display: props.compareDatasets ? "block" : "none" }}
          onClick={props.swapViews}
        >
          {_("Swap Views")}
        </Button> */}
        {props.compareDatasets && (
          <>
            <Form.Check
              type="checkbox"
              id={props.id + "_auto"}
              checked={autoScale}
              onChange={toggleAutoScale}
              label={"Auto Range"}
            />
            {autoScale ? null : (
              <ColormapRange
                id="scale_diff"
                state={scaleDiff}
                onUpdate={(_, value) => setScaleDiff(value)}
                title={_("Diff. Variable Range")}
              />
            )}
          </>
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
          key="surfacevariable"
          id="surfacevariable"
          selected={surfaceVariable}
          onChange={(_, value) => {
            setSurfaceVariable(value);
          }}
          label={_("Surface Variable")}
          url={`/api/v2.0/dataset/${props.dataset0.id}/variables`}
          includeNone={true}
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
        <Form.Check
          id="show_profile"
          checked={showProfile}
          onChange={handleProfileCheck}
          label={_("Extract Profile Plot")}
          disabled={props.compareDatasets}
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
              onChangeComplete={handleSliderChange}
            />
          </div>
        )}
        {props.compareDatasets && (
          <ComboBox
            key="colormap_diff"
            id="colormap_diff"
            selected={diffColormap}
            onChange={(_, value) => setDiffColormap(value)}
            label={_("Diff. Colourmap")}
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
        {props.compareDatasets ? _("Left Map (Anchor)") : _("Main Map")}
      </Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetPanel
          id="line-window-dataset0-panel"
          onUpdate={props.updateDataset0}
          hasDepth={selected === 1}
          showQuiverSelector={false}
          showDepthSelector={selected === 2}
          showTimeRange={selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset0}
        />
        <ComboBox
          key="colormap"
          id="colormap"
          selected={mainColormap}
          onChange={(_, value) => setMainColormap(value)}
          label={_("Colourmap")}
          url="/api/v2.0/plot/colormaps"
        >
          {_("colourmap_help")}
          <img src="/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  const rightDataset = props.compareDatasets && (
    <Card id="right_map" variant="primary">
      <Card.Header>{_("Right Map")}</Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetPanel
          id="line-window-dataset1-panel"
          onUpdate={props.updateDataset1}
          hasDepth={selected === 1}
          showQuiverSelector={false}
          showDepthSelector={selected === 2}
          showTimeRange={selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset1}
        />
        <ComboBox
          key="rightColormap"
          id="colormap_right"
          selected={rightColormap}
          onChange={(_, value) => setRightColormap(value)}
          label={_("Colourmap")}
          url="/api/v2.0/plot/colormaps"
        >
          {_("colourmap_help")}
          <img src="/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  let plotType;
  let plotQuery = {
    dataset: props.dataset0.id,
    name: props.names[0],
    variable: props.dataset0.variable.id,
    scale: "auto",
    path: props.plotData.coordinates,
    colormap: mainColormap.toString(),
    showmap: showMap,
  };

  if (selected === 1) {
    plotQuery = {
      ...plotQuery,
      time: props.dataset0.time.id,
      linearthresh: linearThresh,
      surfacevariable: surfaceVariable,
      depth_limit: depthLimit,
      profile_distance: profileDistance,
      selectedPlots: selectedPlots.toString(),
      ...(props.compareDatasets &&
        props.dataset1.time.id > 0 && {
          compare_to: {
            dataset: props.dataset1.id,
            variable: props.dataset1.variable.id,
            time: props.dataset1.time.id,
            scale: "auto",
            scale_diff: scaleDiff.toString(),
            colormap: rightColormap.toString(),
            colormap_diff: diffColormap.toString(),
          },
        }),
    };
    plotType = "transect";
  } else {
    plotQuery = {
      ...plotQuery,
      starttime: props.dataset0.starttime.id,
      endtime: props.dataset0.time.id,
      depth: props.dataset0.depth,
      ...(props.compareDatasets &&
        props.dataset1.time.id > 0 && {
          compare_to: {
            dataset: props.dataset1.id,
            variable: props.dataset1.variable.id,
            starttime: props.dataset1.starttime.id,
            endtime: props.dataset1.time.id,
            depth: props.dataset1.depth,
            scale: "auto",
            scale_diff: scaleDiff.toString(),
            colormap: rightColormap.toString(),
            colormap_diff: diffColormap.toString(),
          },
        }),
    };
    plotType = "hovmoller";
  }

  // Create permlink_subquery from current state
  const permlink_subquery = {
    selected,
    scale_diff: scaleDiff.toString(),
    colormap: mainColormap.toString(),
    colormap_right: rightColormap.toString(),
    colormap_diff: diffColormap.toString(),
    size: plotSize,
    dpi: plotDpi,
    plotTitles,
    showmap: showMap,
    surfacevariable: surfaceVariable,
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
          {selected === 1 ? transectSettingsCard : null}
        </Col>
        <Col lg={8} className="plot-col">
          <PlotImage
            plotType={plotType}
            query={plotQuery}
            permlink_subquery={permlink_subquery}
            featureId={props.plotData.id}
            action={props.action}
            size={plotSize}
            dpi={plotDpi}
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
  compareDatasets: PropTypes.bool,
  dataset0: PropTypes.object.isRequired,
  dataset1: PropTypes.object.isRequired,
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
