import React, { useState, useEffect, useRef } from "react";
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
import { useTranslation } from "react-i18next";

const LineWindow = (props) => {
  const { t: _ } = useTranslation();
  // Track if mounted to prevent no-op errors with the Ajax callbacks.
  const mountedRef = useRef(false);

  const [state, setState] = useState(() => ({
    selected: 1,
    scale: props.dataset_0.variable_scale + ",auto",
    scale_1: props.dataset_1.variable_scale + ",auto",
    scale_diff: "-10,10,auto",
    colormap: "default",
    colormap_right: "default", // Colourmap for second (right) plot
    colormap_diff: "default", // Colourmap for difference plot
    showmap: true,
    surfacevariable: "none",
    linearthresh: 0,
    size: "10x7",
    dpi: 144,
    depth_limit: false,
    plotTitles: Array(2).fill(""),
    selectedPlots: [0, 1, 1],
    profile_distance: -1,
    show_profile: false,
  }));

  useEffect(() => {
    if (props.init) setState((s) => ({ ...s, ...props.init }));
  }, [props.init]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onLocalUpdate = (key, value) => {
    if (!mountedRef.current) return;
    setState((s) => {
      const upd = {};
      if (Array.isArray(key)) {
        key.forEach((k, i) => (upd[k] = value[i]));
      } else {
        upd[key] = value;
      }
      return { ...s, ...upd };
    });
  };

  const onSelect = (key) => {
    setState((s) => ({ ...s, selected: parseInt(key) }));
  };

  const updatePlotTitle = (title) => {
    setState((s) => {
      const idx = s.selected - 1;
      const titles = [...s.plotTitles];
      titles[idx] = title;
      return { ...s, plotTitles: titles };
    });
  };

  const handleProfileCheck = (_, value) => {
    setState((s) => ({
      ...s,
      show_profile: value,
      profile_distance: value ? 0 : -1,
    }));
  };

  // UI segments
  const plotOptions = (
    <>
      <ImageSize
        id="size"
        state={state.size}
        onUpdate={onLocalUpdate}
        title={_("Saved Image Size")}
      />
      <CustomPlotLabels
        id="title"
        title={_("Plot Title")}
        plotTitle={state.plotTitles[state.selected - 1]}
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
              state={state.scale_diff}
              onUpdate={onLocalUpdate}
              title={_("Diff. Variable Range")}
            />
          )}
        <CheckBox
          id="showmap"
          checked={state.showmap}
          onUpdate={onLocalUpdate}
          title={_("Show Location")}
        >
          {_("showmap_help")}
        </CheckBox>
        <Accordion>
          <Accordion.Header>Plot Options</Accordion.Header>
          <Accordion.Body>{plotOptions}</Accordion.Body>
        </Accordion>
      </Card.Body>
    </Card>
  );

  const transectSettings = (
    <Card id="transect_settings" variant="primary">
      <Card.Header>{_("Transect Settings")}</Card.Header>
      <Card.Body>
        <ComboBox
          id="surfacevariable"
          state={state.surfacevariable}
          onUpdate={onLocalUpdate}
          title={_("Surface Variable")}
          url={`/api/v2.0/dataset/${props.dataset_0.id}/variables`}
        >
          {_("surfacevariable_help")}
        </ComboBox>
        <TransectLimiter
          id="linearthresh"
          state={state.linearthresh}
          onUpdate={onLocalUpdate}
          title={_("Exponential Plot")}
          parameter={_("Linear Threshold")}
        >
          {_("linearthresh_help")}
        </TransectLimiter>
        <TransectLimiter
          id="depth_limit"
          state={state.depth_limit}
          onUpdate={onLocalUpdate}
          title={_("Limit Depth")}
          parameter={_("Depth")}
        />
        <CheckBox
          id="show_profile"
          checked={state.show_profile}
          onUpdate={handleProfileCheck}
          title={_("Extract Profile Plot")}
        />
        {state.show_profile && (
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
              state={state.colormap_diff}
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
          variables={state.selected === 2 ? "all" : "3d"}
          showQuiverSelector={false}
          showDepthSelector={state.selected === 2}
          showTimeRange={state.selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_0}
        />
        <ComboBox
          id="colormap"
          state={state.colormap}
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
          variables={state.selected === 2 ? "all" : "3d"}
          showQuiverSelector={false}
          showDepthSelector={state.selected === 2}
          showTimeRange={state.selected === 2}
          showVariableRange={false}
          mapSettings={props.mapSettings}
          mountedDataset={props.dataset_1}
        />
        <ComboBox
          id="colormap_right"
          state={state.colormap_right}
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
    size: state.size,
    dpi: state.dpi,
    plotTitle: state.plotTitles[state.selected - 1],
  };

  let plot_query = {};
  if (state.selected === 1) {
    plot_query = {
      ...baseQuery,
      type: "transect",
      variable: props.dataset_0.variable,
      path: props.plotData.coordinates,
      scale: state.scale,
      colormap: state.colormap,
      showmap: state.showmap,
      time: props.dataset_0.time,
      linearthresh: state.linearthresh,
      surfacevariable: state.surfacevariable,
      depth_limit: state.depth_limit,
      profile_distance: state.profile_distance,
      selectedPlots: state.selectedPlots.toString(),
      ...(props.dataset_compare &&
        props.dataset_0.variable === props.dataset_1.variable && {
          compare_to: {
            dataset: props.dataset_1.id,
            scale: state.scale_1,
            scale_diff: state.scale_diff,
            colormap: state.colormap_right,
            colormap_diff: state.colormap_diff,
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
            scale: state.scale_1,
            scale_diff: state.scale_diff,
            colormap: state.colormap_right,
            colormap_diff: state.colormap_diff,
          },
        }),
    };
  }

  return (
    <div className="LineWindow Window">
      <Nav variant="tabs" activeKey={state.selected} onSelect={onSelect}>
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
          {transectSettings}
        </Col>
        <Col lg={8} className="plot-col">
          <PlotImage
            query={plot_query}
            permlink_subquery={state}
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

//***********************************************************************
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
};

export default LineWindow;
