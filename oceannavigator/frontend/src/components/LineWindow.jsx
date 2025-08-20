import React, { useState, useEffect } from "react";
import { Accordion, Card, Nav, Row, Col, Button } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./ColormapRange.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ImageSize from "./ImageSize.jsx";
import TransectLimiter from "./TransectLimiter.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import PropTypes from "prop-types";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { withTranslation } from "react-i18next";

const LineWindow = (props) => {
  const { t: _ } = props;

  // UI state
  const [selected, setSelected] = useState(props.init?.selected || 1);

  // Scale settings
  const [scales, setScales] = useState({
    scale: props.init?.scale || props.dataset_0.variable_scale + ",auto",
    scale_1: props.init?.scale_1 || props.dataset_1.variable_scale + ",auto",
    scale_diff: props.init?.scale_diff || "-10,10,auto",
  });

  // Colormap settings
  const [colormaps, setColormaps] = useState({
    main: props.init?.colormap || "default",
    right: props.init?.colormap_right || "default",
    diff: props.init?.colormap_diff || "default",
  });

  // Plot settings
  const [plotSettings, setPlotSettings] = useState({
    size: props.init?.size || "10x7",
    dpi: props.init?.dpi || 144,
    titles: props.init?.plotTitles || Array(2).fill(""),
  });

  // Map and display settings
  const [displaySettings, setDisplaySettings] = useState({
    showmap: props.init?.showmap ?? true,
    surfacevariable: props.init?.surfacevariable || "none",
    selectedPlots: props.init?.selectedPlots || [0, 1, 1],
  });

  // Transect-specific settings
  const [transectSettings, setTransectSettings] = useState({
    linearthresh: props.init?.linearthresh || false,
    depth_limit: props.init?.depth_limit || false,
    profile_distance: props.init?.profile_distance || -1,
    show_profile: props.init?.show_profile || false,
  });

  // Initialize from props.init if provided
  useEffect(() => {
    if (props.init) {
      if (props.init.selected !== undefined) setSelected(props.init.selected);
      if (props.init.scale || props.init.scale_1 || props.init.scale_diff) {
        setScales(prev => ({
          ...prev,
          ...(props.init.scale && { scale: props.init.scale }),
          ...(props.init.scale_1 && { scale_1: props.init.scale_1 }),
          ...(props.init.scale_diff && { scale_diff: props.init.scale_diff }),
        }));
      }
      // Apply other init values as needed...
    }
  }, [props.init]);

  const onLocalUpdate = (key, value) => {
    if (Array.isArray(key)) {
      // Handle multiple key-value pairs
      const updates = {};
      key.forEach((k, i) => {
        updates[k] = value[i];
      });
      
      // Distribute updates to appropriate state groups
      Object.entries(updates).forEach(([k, v]) => {
        onLocalUpdate(k, v);
      });
      return;
    }

    // Handle single key-value updates
    if (key.includes("scale")) {
      setScales(prev => ({ ...prev, [key]: value }));
    } else if (key.includes("colormap") || key === "colormap_right" || key === "colormap_diff") {
      const colorKey = key === "colormap" ? "main" :
                      key === "colormap_right" ? "right" :
                      key === "colormap_diff" ? "diff" : key;
      setColormaps(prev => ({ ...prev, [colorKey]: value }));
    } else if (["size", "dpi"].includes(key)) {
      setPlotSettings(prev => ({ ...prev, [key]: value }));
    } else if (["showmap", "surfacevariable", "selectedPlots"].includes(key)) {
      setDisplaySettings(prev => ({ ...prev, [key]: value }));
    } else if (["linearthresh", "depth_limit", "profile_distance", "show_profile"].includes(key)) {
      setTransectSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const onSelect = (key) => {
    setSelected(parseInt(key));
  };

  const updatePlotTitle = (title) => {
    const idx = selected - 1;
    setPlotSettings(prev => {
      const titles = [...prev.titles];
      titles[idx] = title;
      return { ...prev, titles };
    });
  };

  const handleProfileCheck = (_, value) => {
    setTransectSettings(prev => ({
      ...prev,
      show_profile: value,
      profile_distance: value ? 0 : -1,
    }));
  };

  // UI segments
  const plotOptions = (
    <>
      <ImageSize
        id="size"
        state={plotSettings.size}
        onUpdate={onLocalUpdate}
        title={_("Saved Image Size")}
      />
      <CustomPlotLabels
        id="title"
        title={_("Plot Title")}
        plotTitle={plotSettings.titles[selected - 1]}
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
              state={scales.scale_diff}
              onUpdate={onLocalUpdate}
              title={_("Diff. Variable Range")}
            />
          )}
        <CheckBox
          id="showmap"
          checked={displaySettings.showmap}
          onUpdate={onLocalUpdate}
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
          state={displaySettings.surfacevariable}
          onUpdate={onLocalUpdate}
          title={_("Surface Variable")}
          url={`/api/v2.0/dataset/${props.dataset_0.id}/variables`}
        >
          {_("surfacevariable_help")}
        </ComboBox>
        <TransectLimiter
          id="linearthresh"
          state={transectSettings.linearthresh}
          onUpdate={onLocalUpdate}
          title={_("Exponential Plot")}
          parameter={_("Linear Threshold")}
        >
          {_("linearthresh_help")}
        </TransectLimiter>
        <TransectLimiter
          id="depth_limit"
          state={transectSettings.depth_limit}
          onUpdate={onLocalUpdate}
          title={_("Limit Depth")}
          parameter={_("Depth")}
        />
        <CheckBox
          id="show_profile"
          checked={transectSettings.show_profile}
          onUpdate={handleProfileCheck}
          title={_("Extract Profile Plot")}
        />
        {transectSettings.show_profile && (
          <div className="slider-container">
            <Slider
              min={0}
              max={100}
              marks={{
                0: "0km",
                25: (props.line_distance / 1000 / 4).toFixed(1),
                50: (props.line_distance / 1000 / 2).toFixed(1),
                75: (((props.line_distance / 1000) * 3) / 4).toFixed(1),
                100: (props.line_distance / 1000).toFixed(1),
              }}
              onAfterChange={(x) =>
                onLocalUpdate(
                  "profile_distance",
                  (x / 100) * props.line_distance
                )
              }
            />
          </div>
        )}
        {props.dataset_compare &&
          props.dataset_0.variable === props.dataset_1.variable && (
            <ComboBox
              id="colormap_diff"
              state={colormaps.diff}
              onUpdate={onLocalUpdate}
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
          state={colormaps.main}
          onUpdate={onLocalUpdate}
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
          state={colormaps.right}
          onUpdate={onLocalUpdate}
          title={_("Colour Map")}
          url="/api/v2.0/plot/colormaps"
        >
          {_("colourmap_help")}
          <img src="/plot/colormaps.png/" alt="" />
        </ComboBox>
      </Card.Body>
    </Card>
  );

  // Build plot query
  const baseQuery = {
    dataset: props.dataset_0.id,
    quantum: props.dataset_0.quantum,
    name: props.names[0],
    size: plotSettings.size,
    dpi: plotSettings.dpi,
    plotTitle: plotSettings.titles[selected - 1],
  };

  let plot_query = {};
  if (selected === 1) {
    plot_query = {
      ...baseQuery,
      type: "transect",
      variable: props.dataset_0.variable,
      path: props.plotData.coordinates,
      scale: scales.scale,
      colormap: colormaps.main,
      showmap: displaySettings.showmap,
      time: props.dataset_0.time,
      linearthresh: transectSettings.linearthresh,
      surfacevariable: displaySettings.surfacevariable,
      depth_limit: transectSettings.depth_limit,
      profile_distance: transectSettings.profile_distance,
      selectedPlots: displaySettings.selectedPlots.toString(),
      ...(props.dataset_compare &&
        props.dataset_0.variable === props.dataset_1.variable && {
          compare_to: {
            dataset: props.dataset_1.id,
            scale: scales.scale_1,
            scale_diff: scales.scale_diff,
            colormap: colormaps.right,
            colormap_diff: colormaps.diff,
          },
        }),
    };
  } else {
    plot_query = {
      ...baseQuery,
      type: "hovmoller",
      starttime: props.dataset_0.starttime,
      endtime: props.dataset_0.time,
      depth: props.dataset_0.depth,
      ...(props.dataset_compare &&
        props.dataset_0.variable === props.dataset_1.variable && {
          compare_to: {
            dataset: props.dataset_1.id,
            scale: scales.scale_1,
            scale_diff: scales.scale_diff,
            colormap: colormaps.right,
            colormap_diff: colormaps.diff,
          },
        }),
    };
  }

  // Create permlink_subquery from current state
  const permlink_subquery = {
    selected,
    ...scales,
    colormap: colormaps.main,
    colormap_right: colormaps.right,
    colormap_diff: colormaps.diff,
    ...plotSettings,
    ...displaySettings,
    ...transectSettings,
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
  line_distance: PropTypes.number,
  names: PropTypes.array,
  plotData: PropTypes.object,
  action: PropTypes.func,
  init: PropTypes.object,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(LineWindow);