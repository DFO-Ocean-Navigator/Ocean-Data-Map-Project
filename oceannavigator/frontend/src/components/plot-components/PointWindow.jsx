import React, { useState, useEffect } from "react";
import { Card, Nav, Row, Col, Accordion } from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import CheckBox from "../lib/CheckBox.jsx";
import ComboBox from "../ComboBox.jsx";
import LocationInput from "../LocationInput.jsx";
import ImageSize from "../ImageSize.jsx";
import CustomPlotLabels from "../CustomPlotLabels.jsx";
import DatasetPanel from "../DatasetPanel.jsx";
import PropTypes from "prop-types";
import { useGetDatasetVariables } from "../../remote/queries.js";
import { withTranslation } from "react-i18next";

const TabEnum = {
  PROFILE: 1,
  CTD: 2,
  TS: 3,
  SOUND: 4,
  OBSERVATION: 5,
  MOORING: 6,
};

const PointWindow = ({
  plotData,
  dataset,
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
  const [plotDataset, setPlotDataset] = useState(
    init?.plotDataset || {
      ...dataset,
      variable: Array.isArray(dataset.variable)
        ? dataset.variable
        : [dataset.variable],
      axisRange: dataset.hasOwnProperty("axisRange")
        ? dataset.axisRange
        : { [dataset.variable.id]: null },
    }
  );
  const [only2d, setOnly2d] = useState(false);

  const variables = useGetDatasetVariables(plotDataset);

  useEffect(() => {
    const dataset2D =
      variables.data.length > 0 &&
      variables.data.every((v) => v.two_dimensional === true);

    if (dataset2D && selected !== TabEnum.MOORING) {
      setSelected(TabEnum.MOORING);
    }

    if (
      selected !== TabEnum.MOORING &&
      (plotDataset.variable[0]?.two_dimensional ||
        plotDataset.variable?.two_dimensional)
    ) {
      let variable = variables.data.find((v) => v.two_dimensional === false);
      handleDatasetUpdate("dataset", { ...plotDataset, variable: [variable] });
    }
    setOnly2d(dataset2D);
  }, [plotDataset]);

  const handleDatasetUpdate = (key, value) => {
    setPlotDataset((prev) => ({ ...prev, ...value }));
    if (value.variable && value.depth !== "all") {
      if (!Array.isArray(value.variable)) {
        updateDataset("dataset", { ...value, variable: value.variable });
      } else if (value.variable.length === 1) {
        updateDataset("dataset", { ...value, variable: value.variable[0] });
      }
    }
  };

  // Handles when a tab is selected
  const onSelect = (tab) => {
    tab = parseInt(tab);
    if (tab !== TabEnum.PROFILE && Array.isArray(plotDataset.variable)) {
      handleDatasetUpdate("dataset", {
        ...plotDataset,
        variable: plotDataset.variable[0],
      });
    }
    setSelected(tab);
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
  const showTimeRange = [TabEnum.MOORING].includes(selected);
  const showVarSelector = [TabEnum.PROFILE, TabEnum.MOORING].includes(selected);
  const multipleVariables = selected === TabEnum.PROFILE;
  const showAxisRange = [TabEnum.PROFILE, TabEnum.MOORING].includes(selected);

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

  // Rendered across all tabs
  const global = (
    <Card key="globalSettings" variant="primary">
      <Card.Header>{_("Global Settings")}</Card.Header>
      <Card.Body className="global-settings-card">
        <DatasetPanel
          id="point-window-dataset-panel"
          onUpdate={handleDatasetUpdate}
          showQuiverSelector={false}
          showVariableRange={false}
          showAxisRange={showAxisRange}
          showTimeRange={showTimeRange}
          showDepthSelector={showDepthSelector}
          mapSettings={mapSettings}
          hasDepth={only3d}
          showVariableSelector={showVarSelector}
          showAllDepths={showDepthSelector}
          multipleVariables={multipleVariables}
          mountedDataset={plotDataset}
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
  const hasTemp = variables.data.some((v) => /temp/i.test(v.value));
  const hasSal = variables.data.some((v) => /salin/i.test(v.value));
  const hasTempSal = hasTemp && hasSal;

  // Construct query for image
  let plotType = "";
  let plotQuery = {
    dataset: plotDataset.id,
    names: names,
  };
  let inputs = [global];
  let axisRange = Array.isArray(plotDataset.variable)
    ? plotDataset.variable.map((v) => plotDataset.axisRange[v.id])
    : plotDataset.axisRange[plotDataset.variable.id];

  switch (selected) {
    case TabEnum.PROFILE:
      plotQuery = {
        ...plotQuery,
        station: plotData.coordinates,
        showmap: showMap,
        time: plotDataset.time.id,
        variable: Array.isArray(plotDataset.variable)
          ? plotDataset.variable.map((v) => v.id)
          : plotDataset.variable.id,
        variable_range: axisRange,
      };
      plotType = "profile";
      break;
    case TabEnum.CTD:
      let tempId = variables.data.find((v) => /temp/i.test(v.value)).id;
      let salId = variables.data.find((v) => /salin/i.test(v.value)).id;
      plotQuery = {
        ...plotQuery,
        station: plotData.coordinates,
        showmap: showMap,
        time: plotDataset.time.id,
        variable: `${hasTemp ? `${tempId},` : ""}${hasSal ? `${salId}` : ""}`,
      };
      plotType = "profile";
      break;
    case TabEnum.TS:
      plotQuery = {
        ...plotQuery,
        station: plotData.coordinates,
        showmap: showMap,
        time: plotDataset.time.id,
      };
      plotType = "ts";
      break;
    case TabEnum.SOUND:
      plotQuery = {
        ...plotQuery,
        station: plotData.coordinates,
        showmap: showMap,
        time: plotDataset.time.id,
      };
      plotType = "sound";
      break;
    case TabEnum.OBSERVATION:
      plotQuery = {
        ...plotQuery,
        observation: [plotData.id],
        observation_variable: observationVariable,
      };
      plotType = "observation";
      inputs.push(observationVariableElem);
      break;
    case TabEnum.MOORING:
      plotQuery = {
        ...plotQuery,
        variable: Array.isArray(plotDataset.variable)
          ? plotDataset.variable.map((v) => v.id)
          : plotDataset.variable.id,
        variable_range: axisRange,
        showmap: showMap,
        station: plotData.coordinates,
        depth: plotDataset.depth,
        starttime: plotDataset.starttime.id,
        endtime: plotDataset.time.id,
        colormap: colormap,
        interp: mapSettings.interpType,
        radius: mapSettings.interpRadius,
        neighbours: mapSettings.interpNeighbours,
      };
      plotType = "timeseries";
      if (plotDataset.depth === "all")
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
  }

  // permlink_subquery from current state
  const permlink_subquery = {
    selected,
    starttime: plotDataset.starttime,
    showmap: showMap,
    colormap,
    size: plotSize,
    dpi: plotDpi,
    plotTitles,
    observation_variable: observationVariable,
    plotDataset,
  };

  return (
    <div className="PointWindow Window">
      <Nav variant="tabs" activeKey={selected} onSelect={onSelect}>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.PROFILE} disabled={only2d}>
            {_("Profile")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.CTD} disabled={!hasTempSal || only2d}>
            {_("CTD Profile")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.TS} disabled={!hasTempSal || only2d}>
            {_("T/S Diagram")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.SOUND} disabled={!hasTempSal || only2d}>
            {_("Sound Speed Profile")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            eventKey={TabEnum.OBSERVATION}
            disabled={!plotData.observation || only2d}
          >
            {_("Observation")}
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={TabEnum.MOORING}>{_("Virtual Mooring")}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row className="plot-window-container">
        <Col lg={2} className="settings-col">
          {inputs}
        </Col>
        <Col lg={10} className="plot-col">
          <PlotImage
            plotType={plotType}
            query={plotQuery}
            permlink_subquery={permlink_subquery}
            featureId={plotData.id}
            action={action}
            size={plotSize}
            dpi={plotDpi}
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
  dataset: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(PointWindow);
