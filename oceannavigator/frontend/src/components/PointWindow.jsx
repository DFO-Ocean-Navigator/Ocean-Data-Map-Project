import React, { useState, useEffect, useRef } from "react";
import { Card, Nav, Row, Col, Accordion } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import CheckBox from "./lib/CheckBox.jsx";
import ComboBox from "./ComboBox.jsx";
import LocationInput from "./LocationInput.jsx";
import ImageSize from "./ImageSize.jsx";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import PropTypes from "prop-types";
import { GetVariablesPromise } from "../remote/OceanNavigator.js";
import { useTranslation } from "react-i18next";

const TabEnum = {
  PROFILE: 1,
  CTD: 2,
  TS: 3,
  STICK: 4,
  SOUND: 5,
  OBSERVATION: 6,
  MOORING: 7,
};

const PointWindow = ({
  plotData,
  dataset_0: ds0,
  mapSettings,
  names,
  action,
  init,
  updateDataset,
  setCompareDatasets,
  swapViews,
}) => {
  const { t: _ } = useTranslation();
  const mountedRef = useRef(false);

  const [state, setState] = useState(() => ({
    selected: TabEnum.PROFILE,
    showmap: false,
    colormap: "default",
    datasetVariables: [],
    observation_variable: [0],
    size: "10x7",
    dpi: 144,
    plotTitles: Array(7).fill(""),
    dataset_0: {
      id: ds0.id,
      variable: [ds0.variable],
      variable_range: {},
      time: ds0.time,
      depth: ds0.depth,
      starttime: ds0.starttime,
      options: ds0.options,
    },
  }));

  // merge init
  useEffect(() => {
    if (init) setState((s) => ({ ...s, ...init }));
  }, [init]);

  // mounted flag
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // populate variables on mount or dataset change
  useEffect(() => {
    GetVariablesPromise(state.dataset_0.id).then(
      (res) =>
        mountedRef.current &&
        setState((s) => ({
          ...s,
          datasetVariables: res.data.map((v) => v.id),
        })),
      (err) => console.error(err)
    );
  }, [state.dataset_0.id]);

  const onLocalUpdate = (key, value) => {
    if (!mountedRef.current) return;
    // handle dataset key specially
    if (key === "dataset") {
      setState((s) => ({ ...s, dataset_0: { ...s.dataset_0, ...value } }));
      if (value.variable.length === 1) {
        const v = value.variable[0];
        updateDataset("dataset", { ...value, variable: v });
      }
      return;
    }
    if (key === "points") {
      action("updatePoint", value);
      return;
    }
    setState((s) => {
      const upd = {};
      if (Array.isArray(key)) key.forEach((k, i) => (upd[k] = value[i]));
      else upd[key] = value;
      return { ...s, ...upd };
    });
  };

  const onSelect = (k) => {
    setState((s) => ({ ...s, selected: parseInt(k) }));
  };
  const updatePlotTitle = (title) => {
    setState((s) => {
      const arr = [...s.plotTitles];
      arr[s.selected - 1] = title;
      return { ...s, plotTitles: arr };
    });
  };

  // UI constants
  const {
    selected,
    showmap,
    datasetVariables,
    observation_variable,
    size,
    dpi,
    plotTitles,
    dataset_0,
  } = state;
  const only3d = [TabEnum.PROFILE, TabEnum.OBSERVATION].includes(selected);
  const showDepthSelector = selected === TabEnum.MOORING;
  const showTimeRange = [TabEnum.STICK, TabEnum.MOORING].includes(selected);
  const showVarSelector = [TabEnum.PROFILE, TabEnum.MOORING].includes(selected);
  const multiVar = selected === TabEnum.PROFILE;
  const showAxisRange = [TabEnum.PROFILE, TabEnum.MOORING].includes(selected);

  const plotOptions = (
    <>
      <ImageSize
        id="size"
        state={size}
        onUpdate={onLocalUpdate}
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

  const global = (
    <Card variant="primary">
      <Card.Header>{_("Global Settings")}</Card.Header>
      <Card.Body>
        <DatasetSelector
          id="dataset_0"
          onUpdate={onLocalUpdate}
          showQuiverSelector={false}
          showVariableRange={false}
          showAxisRange={showAxisRange}
          showTimeRange={showTimeRange}
          showDepthSelector={showDepthSelector}
          mapSettings={mapSettings}
          variables={only3d ? "3d" : null}
          showVariableSelector={showVarSelector}
          showDepthsAll={showDepthSelector}
          multipleVariables={multiVar}
          mountedDataset={ds0}
        />
        <CheckBox
          id="showmap"
          checked={showmap}
          onUpdate={onLocalUpdate}
          title={_("Show Location")}
        >
          {_("showmap_help")}
        </CheckBox>
        {plotData.coordinates.length === 1 && (
          <LocationInput
            id="points"
            state={plotData.coordinates}
            title={_("Location")}
            onUpdate={onLocalUpdate}
          />
        )}
        <Accordion>
          <Accordion.Header>{_("Plot Options")}</Accordion.Header>
          <Accordion.Body>{plotOptions}</Accordion.Body>
        </Accordion>
      </Card.Body>
    </Card>
  );

  const multiDepthVector = selected === TabEnum.STICK && (
    <>
      <ComboBox
        id="variable"
        state={dataset_0.variable}
        onUpdate={onLocalUpdate}
        url={`/api/v2.0/dataset/${dataset_0.id}/variables?vectors_only=True`}
        title={_("Variable")}
        multiple
      >
        <h1>{_("Variable")}</h1>
      </ComboBox>
      <ComboBox
        id="depth"
        multiple
        state={dataset_0.depth}
        onUpdate={onLocalUpdate}
        url={`/api/v2.0/depth/?variable=${dataset_0.variable}&dataset=${dataset_0.id}`}
        title={_("Depth")}
      />
    </>
  );

  let observationVariableElem = null;
  if (plotData.observation) {
    if (typeof plotData.id === "number") {
      observationVariableElem = (
        <ComboBox
          id="observation_variable"
          multiple
          state={observation_variable}
          url={`/api/v2.0/observation/variables/station=${plotData.coordinates[0][2]}.json`}
          title={_("Observation Variable")}
          onUpdate={onLocalUpdate}
        />
      );
    } else {
      const data = plotData.coordinates[0][2].datatypes.map((o, i) => ({
        id: i,
        value: o.replace(/ \[.*\]/, ""),
      }));
      observationVariableElem = (
        <ComboBox
          id="observation_variable"
          multiple
          state={observation_variable}
          data={data}
          title={_("Observation Variable")}
          onUpdate={onLocalUpdate}
        />
      );
    }
  }

  // temp/salinity check
  const hasTemp = datasetVariables.some((v) => /temp/i.test(v));
  const hasSal = datasetVariables.some((v) => /salin/i.test(v));
  const hasTempSal = hasTemp && hasSal;

  // build base query
  const plot_query = {
    dataset: dataset_0.id,
    point: plotData.coordinates,
    showmap,
    names,
    size,
    dpi,
    plotTitle: plotTitles[selected - 1],
    type: "",
  };

  let inputs = [];
  switch (selected) {
    case TabEnum.PROFILE:
      Object.assign(plot_query, {
        type: "profile",
        time: dataset_0.time,
        variable: dataset_0.variable,
        variable_range: Object.values(dataset_0.variable_range),
      });
      inputs = [global];
      break;
    case TabEnum.CTD:
      plot_query.type = "profile";
      plot_query.time = dataset_0.time;
      plot_query.variable = `${hasTemp ? "votemper," : ""}${
        hasSal ? "vosaline" : ""
      }`;
      inputs = [global];
      break;
    case TabEnum.TS:
      Object.assign(plot_query, { type: "ts", time: dataset_0.time });
      inputs = [global];
      break;
    case TabEnum.SOUND:
      Object.assign(plot_query, { type: "sound", time: dataset_0.time });
      inputs = [global];
      break;
    case TabEnum.OBSERVATION:
      plot_query.type = "observation";
      plot_query.observation = [plotData.id];
      plot_query.observation_variable = observation_variable;
      inputs = [global, observationVariableElem];
      break;
    case TabEnum.MOORING:
      Object.assign(plot_query, {
        type: "timeseries",
        variable: dataset_0.variable,
        variable_range: Object.values(dataset_0.variable_range),
        starttime: dataset_0.starttime,
        endtime: dataset_0.time,
        depth: dataset_0.depth,
        colormap: state.colormap,
        interp: mapSettings.interpType,
        radius: mapSettings.interpRadius,
        neighbours: mapSettings.interpNeighbours,
      });
      inputs = [global];
      if (dataset_0.depth === "all")
        inputs.push(
          <ComboBox
            key="colormap"
            id="colormap"
            state={state.colormap}
            onUpdate={onLocalUpdate}
            url="/api/v2.0/plot/colormaps"
            title={_("Colourmap")}
          >
            {" "}
            <img src="/plot/colormaps.png/" alt="" />{" "}
          </ComboBox>
        );
      break;
    case TabEnum.STICK:
      Object.assign(plot_query, {
        type: "stick",
        variable: dataset_0.variable,
        starttime: dataset_0.starttime,
        endtime: dataset_0.time,
        depth: dataset_0.depth,
      });
      inputs = [global, multiDepthVector];
      break;
  }

  return (
    <div className="PointWindow Window">
      <Nav variant="tabs" activeKey={selected} onSelect={onSelect}>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.PROFILE}>{_("Profile")}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.CTD} disabled={!hasTempSal}>
            {_("CTD Profile")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.TS} disabled={!hasTempSal}>
            {_("T/S Diagram")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.SOUND} disabled={!hasTempSal}>
            {_("Sound Speed Profile")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey={TabEnum.OBSERVATION}
            disabled={plotData.coordinates[0][2] === undefined}
          >
            {_("Observation")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</Nav.Link>
        </Nav.Item>
        {/* <Nav.Item><Nav.Link eventKey={TabEnum.STICK}>{_("Stick")}</Nav.Link></Nav.Item> */}
      </Nav>
      <Row className="plot-window-container">
        <Col lg={2} className="settings-col">
          {inputs}
        </Col>
        <Col lg={10} className="plot-col">
          <PlotImage
            query={plot_query}
            permlink_subquery={{ selected, starttime: dataset_0.starttime }}
            action={action}
          />
        </Col>
      </Row>
    </div>
  );
};

PointWindow.propTypes = {
  plotData: PropTypes.object.isRequired,
  mapSettings: PropTypes.object,
  names: PropTypes.array,
  action: PropTypes.func,
  init: PropTypes.object,
  updateDataset: PropTypes.func,
};

export default PointWindow;
