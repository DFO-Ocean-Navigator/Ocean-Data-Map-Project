import React, { useState, useEffect } from "react";
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
import { withTranslation } from "react-i18next";

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
  t: _,
}) => {
  // UI state
  const [selected, setSelected] = useState(init?.selected || TabEnum.PROFILE);

  // Display settings
  const [displaySettings, setDisplaySettings] = useState({
    showmap: init?.showmap || false,
    colormap: init?.colormap || "default",
  });

  // Data state
  const [dataState, setDataState] = useState({
    datasetVariables: init?.datasetVariables || [],
    observation_variable: init?.observation_variable || [0],
  });

  // Plot settings
  const [plotSettings, setPlotSettings] = useState({
    size: init?.size || "10x7",
    dpi: init?.dpi || 144,
    plotTitles: init?.plotTitles || Array(7).fill(""),
  });

  // Dataset state - keep as single object due to complexity
  const [dataset_0, setDataset_0] = useState(
    init?.dataset_0 || {
      id: ds0.id,
      variable: [ds0.variable],
      variable_range: {},
      time: ds0.time,
      depth: ds0.depth,
      starttime: ds0.starttime,
      options: ds0.options,
    }
  );

 // merge init
  useEffect(() => {
    if (init) {
      if (init.selected !== undefined) setSelected(init.selected);
      if (init.showmap !== undefined || init.colormap !== undefined) {
        setDisplaySettings(prev => ({
          ...prev,
          ...(init.showmap !== undefined && { showmap: init.showmap }),
          ...(init.colormap !== undefined && { colormap: init.colormap }),
        }));
      }
    }
  }, [init]);

  useEffect(() => {
    GetVariablesPromise(dataset_0.id).then(
      (res) => {
        setDataState(prev => ({
          ...prev,
          datasetVariables: res.data.map((v) => v.id),
        }));
      },
      (err) => console.error(err)
    );
  }, [dataset_0.id]);

  const onLocalUpdate = (key, value) => {
    // handle dataset key specially
    if (key === "dataset") {
      setDataset_0(prev => ({ ...prev, ...value }));
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

    // Route updates to appropriate state groups
    if (["showmap", "colormap"].includes(key)) {
      setDisplaySettings(prev => ({ ...prev, [key]: value }));
    } else if (["datasetVariables", "observation_variable"].includes(key)) {
      setDataState(prev => ({ ...prev, [key]: value }));
    } else if (["size", "dpi"].includes(key)) {
      setPlotSettings(prev => ({ ...prev, [key]: value }));
    } else if (Array.isArray(key)) {
      const updates = {};
      key.forEach((k, i) => {
        updates[k] = value[i];
      });
      
      // Distribute updates to appropriate state groups
      Object.entries(updates).forEach(([k, v]) => {
        onLocalUpdate(k, v);
      });
    }
  };

  // Handles when a tab is selected
  const onSelect = (k) => {
    setSelected(parseInt(k));
  };

  //Updates Plot with User Specified Title
  const updatePlotTitle = (title) => {
    setPlotSettings(prev => {
      const arr = [...prev.plotTitles];
      arr[selected - 1] = title;
      return { ...prev, plotTitles: arr };
    });
  };

  // UI constants
  const { showmap, colormap } = displaySettings;
  const { datasetVariables, observation_variable } = dataState;
  const { size, dpi, plotTitles } = plotSettings;
  
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

  // Rendered across all tabs
  const global = (
    <Card key="globalSettings" variant="primary">
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

  // Show multidepth selector on for Stick tab
  const multiDepthVector = selected === TabEnum.STICK && (
    <>
      <div key="stickVectorDepth">
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
      </div>
    </>
  );

  let observationVariableElem = null;
  if (plotData.observation) {
    if (typeof plotData.id === "number") {
      observationVariableElem = (
        <ComboBox
          key="obsVarNumeric"
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
          key="obsVarNumeric"
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
  // Checks if the current dataset's variables contain Temperature
  // and Salinity. This is used to enable/disable some tabs.
  const hasTemp = datasetVariables.some((v) => /temp/i.test(v));
  const hasSal = datasetVariables.some((v) => /salin/i.test(v));
  const hasTempSal = hasTemp && hasSal;

  // Start constructing query for image
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
      // TODO: find index of matching variable in regex
      // since not all datasets call temp votemper
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
        colormap: colormap,
        interp: mapSettings.interpType,
        radius: mapSettings.interpRadius,
        neighbours: mapSettings.interpNeighbours,
      });
      inputs = [global];
      if (dataset_0.depth === "all")
        // Add Colormap selector
        inputs.push(
          <ComboBox
            key="colormap"
            id="colormap"
            state={colormap}
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

  // permlink_subquery from current state
  const permlink_subquery = {
    selected,
    starttime: dataset_0.starttime,
    ...displaySettings,
    ...plotSettings,
    ...dataState,
    dataset_0,
  };

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
            permlink_subquery={permlink_subquery}
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
  dataset_0: PropTypes.object.isRequired,
  setCompareDatasets: PropTypes.func,
  swapViews: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(PointWindow);