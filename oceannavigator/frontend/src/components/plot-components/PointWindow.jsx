import React, { useState, useEffect } from "react";
import { Card, Nav, Row, Col, Accordion } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ComboBox from "../ComboBox.jsx";
import LocationInput from "../LocationInput.jsx";
import ImageSize from "../ImageSize.jsx";
import CustomPlotLabels from "../CustomPlotLabels.jsx";
import DatasetSelector from "../DatasetSelector.jsx";
import PropTypes from "prop-types";
import { GetVariablesPromise } from "../../remote/OceanNavigator.js";
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
  t: _,
}) => {
  // UI state
  const [selected, setSelected] = useState(
    init?.selected || plotData.observation
      ? TabEnum.OBSERVATION
      : TabEnum.PROFILE
  );

  // Display settings
  const [showMap, setShowMap] = useState(init?.showmap || false);
  const [colormap, setColormap] = useState(init?.colormap || "default");

  // Data state
  const [datasetVariables, setDatasetVariables] = useState(
    init?.datasetVariables || []
  );
  const [observationVariable, setObservationVariable] = useState(
    init?.observation_variable || [0]
  );

  // Plot settings
  const [plotSize, setPlotSize] = useState(init?.size || "10x7");
  const [plotDpi, setPlotDpi] = useState(init?.dpi || 144);
  const [plotTitles, setPlotTitles] = useState(
    init?.plotTitles || Array(7).fill("")
  );

  // Dataset state - keep as single object due to complexity
  const [dataset_0, setDataset_0] = useState(
    init?.dataset_0 || {
      id: ds0.id,
      variable: ds0.variable,
      variable_range: [null],
      time: ds0.time,
      depth: ds0.depth,
      starttime: ds0.starttime,
      options: ds0.options,
    }
  );

  // Fetch dataset variables when dataset ID changes
  useEffect(() => {
    GetVariablesPromise(dataset_0.id).then(
      (res) => {
        setDatasetVariables(res.data.map((v) => v.id));
      },
      (err) => console.error(err)
    );
  }, [dataset_0.id]);

  const handleDatasetUpdate = (key, value) => {
    setDataset_0((prev) => ({ ...prev, ...value }));
    if (value.variable && value.variable.length === 1) {
      const v = value.variable[0];
      updateDataset("dataset", { ...value, variable: v });
    }
  };

  // Handles when a tab is selected
  const onSelect = (k) => {
    setSelected(parseInt(k));
  };

  const updatePlotSize = (key, value) => {
    if (key === "size") {
      setPlotSize(value);
    } else if (key === "dpi") {
      setPlotDpi(value);
    }
  };

  // Updates Plot with User Specified Title
  const updatePlotTitle = (title) => {
    setPlotTitles((prev) => {
      const arr = [...prev];
      arr[selected - 1] = title;
      return arr;
    });
  };

  // Handle points update
  const handlePointsUpdate = (key, value) => {
    action("updatePoint", value);
  };

  // UI constants
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
        state={plotSize}
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

  // Rendered across all tabs
  const global = (
    <Card key="globalSettings" variant="primary">
      <Card.Header>{_("Global Settings")}</Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetSelector
          id="dataset_0"
          onUpdate={handleDatasetUpdate}
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
          checked={showMap}
          onUpdate={(_, value) => setShowMap(value)}
          title={_("Show Location")}
        >
          {_("showmap_help")}
        </CheckBox>
        {/* {plotData.coordinates.length === 1 && (
          <LocationInput
            id="points"
            state={plotData.coordinates}
            title={_("Location")}
            onUpdate={handlePointsUpdate}
          />
        )} */}
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
          onUpdate={(key, value) => {
            setDataset_0((prev) => ({ ...prev, variable: value }));
          }}
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
          onUpdate={(key, value) => {
            setDataset_0((prev) => ({ ...prev, depth: value }));
          }}
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
          key="observation_variable"
          id="observation_variable"
          multiple
          state={observationVariable}
          url={`/api/v2.0/observation/variables/station=${plotData.coordinates[0][2]}.json`}
          title={_("Observation Variable")}
          onUpdate={(_, value) => setObservationVariable(value)}
        />
      );
    } else {
      const data = plotData.coordinates[0][2].datatypes.map((o, i) => ({
        id: i,
        value: o.replace(/ \[.*\]/, ""),
      }));
      observationVariableElem = (
        <ComboBox
          key="observation_variable"
          id="observation_variable"
          multiple
          state={observationVariable}
          data={data}
          title={_("Observation Variable")}
          onUpdate={(_, value) => setObservationVariable(value)}
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
    showmap: showMap,
    names: names,
    size: plotSize,
    dpi: plotDpi,
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
      plot_query.observation_variable = observationVariable;
      plot_query.variable = dataset_0.variable;
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
            onUpdate={(_, value) => setColormap(value)}
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
    showmap: showMap,
    colormap,
    size: plotSize,
    dpi: plotDpi,
    plotTitles,
    datasetVariables,
    observation_variable: observationVariable,
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
            disabled={!plotData.observation}
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
  t: PropTypes.func.isRequired,
};

export default withTranslation()(PointWindow);
