import React, { useState, useRef, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import ReactGA from "react-ga";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import Map from "./Map/Map.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";
import ScaleViewer from "./ScaleViewer.jsx";
import PresetFeaturesWindow from "./PresetFeaturesWindow.jsx";
import ModifyFeaturesWindow from "./ModifyFeaturesWindow/ModifyFeaturesWindow.jsx";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import AnnotationTextWindow from "./AnnotationTextWindow.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
import SettingsWindow from "./SettingsWindow.jsx";
import InfoHelpWindow from "./InfoHelpWindow.jsx";
import Class4Selector from "./Class4Selector.jsx";
import Class4Window from "./Class4Window.jsx";
import TrackWindow from "./TrackWindow.jsx";
import Permalink from "./Permalink.jsx";
import ToggleLanguage from "./ToggleLanguage.jsx";
import LinkButton from "./LinkButton.jsx";

import { withTranslation } from "react-i18next";
import AnnotationButton from "./AnnotationButton.jsx";
import { PlotWindowManager, PlotSidePanel, usePlotWindowManager } from './PlotWindowManager.jsx';


function formatLatLon(latitude, longitude) {
  latitude = latitude > 90 ? 90 : latitude;
  latitude = latitude < -90 ? -90 : latitude;
  longitude = longitude > 180 ? longitude - 360 : longitude;
  longitude = longitude < -180 ? 360 + longitude : longitude;
  let formatted = "";
  formatted += Math.abs(latitude).toFixed(4) + " ";
  formatted += latitude >= 0 ? "N" : "S";
  formatted += ", ";
  formatted += Math.abs(longitude).toFixed(4) + " ";
  formatted += longitude >= 0 ? "E" : "W";
  return formatted;
}

function OceanNavigator(props) {
  const mapRef = useRef();
  const [dataset0, setDataset0] = useState(DATASET_DEFAULTS);
  const [dataset1, setDataset1] = useState(DATASET_DEFAULTS);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [compareDatasets, setCompareDatasets] = useState(false);
  const [mapSettings, setMapSettings] = useState({
    projection: "EPSG:3857", // Map projection
    basemap: "topo",
    extent: [],
    hideDataLayer: false,
    ...MAP_DEFAULTS,
  });
  const [uiSettings, setUiSettings] = useState({
    showModal: false,
    modalType: "",
    showDrawingTools: false,
    showObservationTools: false,
  });
  const [mapState, setMapState] = useState({});
  const [plotData, setPlotData] = useState({});
  const [class4Type, setClass4Type] = useState("ocean_predict");
  const [featureType, setFeatureType] = useState("Point");
  const [names, setNames] = useState([]);
  const [observationArea, setObservationArea] = useState([]);
  const [subquery, setSubquery] = useState();
  const [showPermalink, setShowPermalink] = useState(false);

  useEffect(() => {
    ReactGA.ga("send", "pageview");

    if (window.location.search.length > 0) {
      try {
        const query = JSON.parse(
          decodeURIComponent(window.location.search.replace("?query=", ""))
        );

        for (let key in query) {
          switch (key) {
            case "dataset0":
              setDataset0(query.dataset0);
              break;
            case "dataset1":
              setDataset1(query.dataset1);
              setCompareDatasets(query.compareDatasets);
              break;
            case "mapSettings":
              setMapSettings(query.mapSettings);
              break;
          }
        }

        setTimeout(() => {
          let selectedIds = [];
          for (let feature of query.features) {
            mapRef.current.addNewFeature(feature.id);
            mapRef.current.updateFeatureGeometry(
              feature.id,
              feature.type,
              feature.coords
            );
            if (feature.selected) {
              selectedIds.push(feature.id);
            }
          }
          mapRef.current.selectFeatures(selectedIds);
          if (query.showModal) {
            let plotData = mapRef.current.getPlotData();
            setPlotData(plotData);
          }
          updateUI({ modalType: query.modalType, showModal: query.showModal });
          setSubquery(query.subquery);
        }, 1000);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);


  // Effect to update existing plot windows when main data changes
useEffect(() => {
  plotWindows.forEach(window => {
    if (window.plotData && window.plotData.type) {
      const updatedComponent = createPlotComponent(window.plotData.type, window.plotData);
      updatePlotComponent(window.id, updatedComponent);
    }
  });
}, [dataset0.id, dataset0.variable, dataset0.time, dataset0.depth, dataset1.id, dataset1.variable, dataset1.time, dataset1.depth, compareDatasets, mapSettings.projection, mapSettings.interpType, mapSettings.interpRadius, mapSettings.interpNeighbours]);


const {
  plotWindows,
  createPlotWindow,
  updatePlotWindow,
  updatePlotComponent,
  closePlotWindow,
  minimizePlotWindow,
  restorePlotWindow,
  bringToFront
} = usePlotWindowManager();


const generatePlotWindowId = (type, coordinates) => {
  const timestamp = Date.now();
  const coordStr = coordinates ? coordinates.slice(0, 2).join(',') : '';
  return `${type}_${coordStr}_${timestamp}`;
};

const generatePlotWindowTitle = (type, coordinates) => {
  switch (type) {
    case "Point":
      const coordTitle = coordinates.map((p) => formatLatLon(p[0], p[1])).join(", ");
      return `Point Plot - ${coordTitle}`;
    case "LineString":
      return `Line Plot - (${coordinates.map(ll => formatLatLon(ll[0], ll[1])).join("), (")})`;
    case "Polygon":
      return `Area Plot - ${coordinates.length} vertices`;
    case "track":
      return `Track Plot`;
    case "class4":
      return `Class 4 Analysis - ${coordinates?.name || 'Observation'}`;
    default:
      return `${type} Plot`;
  }
};

const createPlotComponent = (type, plotData) => {
  // Always use current state, not stored state
  const commonProps = {
    plotData,
    dataset_0: dataset0,  // Always current dataset0
    dataset_1: dataset1,  // Always current dataset1
    mapSettings,          // Always current mapSettings
    names,
    updateDataset0,
    updateDataset1,
    init: subquery,
    action,
    dataset_compare: compareDatasets,  // Always current compare state
    setCompareDatasets,
    key: `${type}_${Date.now()}`, // Force re-render with unique key
  };

  switch (type) {
    case "Point":
      return <PointWindow {...commonProps} />;
    case "LineString":
      const line_distance = mapRef.current ? mapRef.current.getLineDistance(plotData.coordinates) : 0;
      return <LineWindow {...commonProps} line_distance={line_distance} />;
    case "Polygon":
      return <AreaWindow {...commonProps} />;
    case "track":
      return <TrackWindow {...commonProps} dataset={dataset0} track={plotData.coordinates} />;
    case "class4":
      return (
        <Class4Window
          dataset={dataset0.id}
          plotData={plotData}
          class4type={plotData.class4type || class4Type}
          init={subquery}
          action={action}
          key={`class4_${Date.now()}`}
        />
      );
    default:
      return <div key={Date.now()}>Unknown plot type: {type}</div>;
  }
};
  const action = (name, arg, arg2) => {
    switch (name) {
      case "startFeatureDraw":
        mapRef.current.startFeatureDraw();
        break;
      case "stopFeatureDraw":
        mapRef.current.stopFeatureDraw();
        break;
      case "featureType":
        setFeatureType(arg);
        break;
      case "undoMapFeature":
        mapRef.current.undoFeature();
        break;
      case "clearFeatures":
        mapRef.current.removeFeatures("all");
        break;
      case "resetMap":
        mapRef.current.resetMap();
        if (uiSettings.showDrawingTools) {
          mapRef.current.startFeatureDraw();
        }
        break;
case "plot":
  let newPlotData = mapRef.current.getPlotData();
  if (newPlotData.type) {
    // Create a new plot window instead of showing a modal
    const windowId = generatePlotWindowId(newPlotData.type, newPlotData.coordinates);
    const windowTitle = generatePlotWindowTitle(newPlotData.type, newPlotData.coordinates);
    const plotComponent = createPlotComponent(newPlotData.type, newPlotData);
    
    // Store plotData with the window for future updates
    createPlotWindow(windowId, windowTitle, plotComponent, { plotData: newPlotData });
    setPlotData(newPlotData);
  }
  break;
      case "selectedFeatureIds":
        setSelectedFeatureIds(arg);
        break;
      case "loadFeatures":
        closeModal();
        mapRef.current.loadFeatures(arg, arg2);
        break;
      case "drawObsPoint":
        // Enable point selection in both maps
        mapRef.current.drawObsPoint();
        break;
      case "drawObsArea":
        mapRef.current.drawObsArea();
        break;
      case "setObsArea":
        if (arg) {
          setObservationArea(arg);
          updateUI({ modalType: "observationSelect", showModal: true });
        }
        break;
      case "class4Type":
        setClass4Type(arg);
        break;
      case "toggleCompare":
        setCompareDatasets((prevCompare) => {
          return !prevCompare;
        });
        break;
      case "permalink":
        setSubquery(null);
        setShowPermalink(true);
        break;
    }
  };

  const updateMapState = (key, value) => {
    setMapState((prevMapState) => {
      return {
        ...prevMapState,
        [key]: value,
      };
    });
  };

  const updateDataset0 = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset0(value);
        break;
      default:
        setDataset0((prevDataset) => {
          return {
            ...prevDataset,
            [key]: value,
          };
        });
    }
  };

  const updateDataset1 = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset1(value);
        break;
      default:
        setDataset1((prevDataset) => {
          return {
            ...prevDataset,
            [key]: value,
          };
        });
    }
  };

  const updateUI = (newSettings) => {
    setUiSettings((prevUISettings) => {
      return { ...prevUISettings, ...newSettings };
    });
  };

  const closeModal = () => {
    setUiSettings((prevUiSettings) => {
      return {
        ...prevUiSettings,
        showModal: false,
        modalType: "",
      };
    });
  };

  const updateMapSettings = (key, value) => {
    setMapSettings((prevMapSettings) => {
      let newMapSettings = {
        ...prevMapSettings,
        [key]: value,
      };
      return newMapSettings;
    });
  };

  const generatePermLink = (permalinkSettings) => {
    let query = {};
    // We have a request from Point/Line/AreaWindow component.

    query.subquery = subquery;
    query.showModal = uiSettings.showModal;
    query.modalType = uiSettings.modalType;
    query.features = mapRef.current.getFeatures();

    // We have a request from the Permalink component.
    for (let setting in permalinkSettings) {
      if (permalinkSettings[setting] === true) {
        switch (setting) {
          case "dataset0":
            query.dataset0 = dataset0;
            break;
          case "dataset1":
            query.dataset1 = dataset1;
            query.compareDatasets = compareDatasets;
            break;
          case "mapSettings":
            query.mapSettings = mapSettings;
            break;
        }
      }
    }

    return (
      window.location.origin +
      window.location.pathname +
      `?query=${encodeURIComponent(JSON.stringify(query))}`
    );
  };

  let modalBodyContent = null;
  let modalTitle = "";
  let modalSize = "lg";
  switch (uiSettings.modalType) {
    case "Point":
      modalBodyContent = (
        <PointWindow
          dataset_0={dataset0}
          plotData={plotData}
          mapSettings={mapSettings}
          updateDataset={updateDataset0}
          init={subquery}
          action={action}
        />
      );
      modalTitle = plotData.coordinates.map((p) => formatLatLon(p[0], p[1]));
      modalTitle = modalTitle.join(", ");
      break;
    case "LineString":
      const line_distance = mapRef.current.getLineDistance(
        plotData.coordinates
      );
      modalBodyContent = (
        <LineWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          plotData={plotData}
          line_distance={line_distance}
          mapSettings={mapSettings}
          names={names}
          onUpdate={updateDataset0}
          updateDataset0={updateDataset0}
          updateDataset1={updateDataset0}
          init={subquery}
          action={action}
          dataset_compare={compareDatasets}
          setCompareDatasets={setCompareDatasets}
        />
      );

      modalTitle =
        "(" +
        plotData.coordinates
          .map(function (ll) {
            return formatLatLon(ll[0], ll[1]);
          })
          .join("), (") +
        ")";
      break;
    case "Polygon":
      modalBodyContent = (
        <AreaWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          plotData={plotData}
          mapSettings={mapSettings}
          names={names}
          updateDataset0={updateDataset0}
          updateDataset1={updateDataset1}
          init={subquery}
          action={action}
          dataset_compare={compareDatasets}
          setCompareDatasets={setCompareDatasets}
        />
      );

      modalTitle = "";
      break;
    case "track":
      modalBodyContent = (
        <TrackWindow
          dataset={dataset0}
          track={coordinates}
          names={names}
          onUpdate={updateDataset0}
          init={subquery}
          action={action}
        />
      );

      modalTitle = "";
      break;
    case "presetFeatures":
      modalBodyContent = <PresetFeaturesWindow action={action} />;
      modalTitle = "Preset Features";
      break;
    case "editFeatures":
      modalBodyContent = (
        <ModifyFeaturesWindow
          selectedFeatureIds={selectedFeatureIds}
          action={action}
          updateUI={updateUI}
          mapRef={mapRef}
        />
      );
      modalTitle = __("Edit Map Features");
      break;
    case "annotation":
      modalBodyContent = (
        <AnnotationTextWindow mapRef={mapRef} updateUI={updateUI} />
      );
      modalTitle = __("Add Annotation Label");
      modalSize = "md";
      break;
    case "observationSelect":
      modalBodyContent = (
        <ObservationSelector area={observationArea} action={action} />
      );
      modalTitle = "Select Observations";
      break;
    case "class4Selector":
      modalBodyContent = (
        <Class4Selector
          class4Type={class4Type}
          action={action}
          updateUI={updateUI}
        />
      );
      modalTitle = "Select Class4";
      modalSize = "sm";
      break;
    case "class4":
      modalBodyContent = (
        <Class4Window
          dataset={dataset0.id}
          plotData={plotData}
          class4type={class4Type}
          init={subquery}
          action={action}
        />
      );
      modalTitle = "Class4";
       // NEW CODE (creates plot window):
  if (plotData && plotData.id) {
    const class4PlotData = {
      ...plotData,
      type: "class4",
      class4type: class4Type
    };
    
    const windowId = `class4_${plotData.id}_${Date.now()}`;
    const windowTitle = `Class 4 Analysis - ${plotData.name || plotData.id}`;
    const plotComponent = createPlotComponent("class4", class4PlotData);
    
    createPlotWindow(windowId, windowTitle, plotComponent, { plotData: class4PlotData });
  }
      break;
    case "settings":
      modalBodyContent = (
        <SettingsWindow
          mapSettings={mapSettings}
          updateMapSettings={updateMapSettings}
        />
      );
      modalTitle = __("Settings");
      break;
    case "info-help":
      modalBodyContent = <InfoHelpWindow />;
      modalTitle = __("Info/Help");
      break;
  }

  return (
    <div className="OceanNavigator">
      <ScaleViewer
        dataset={dataset0}
        mapSettings={mapSettings}
        onUpdate={updateDataset0}
        mapState={mapState}
      />
      {compareDatasets ? (
        <ScaleViewer
          dataset={dataset1}
          mapSettings={mapSettings}
          onUpdate={updateDataset0}
          mapState={mapState}
          right={true}
        />
      ) : null}
      <Map
        ref={mapRef}
        mapSettings={mapSettings}
        dataset0={dataset0}
        dataset1={dataset1}
        featureType={featureType}
        class4Type={class4Type}
        action={action}
        updateMapSettings={updateMapSettings}
        updateUI={updateUI}
        updateMapState={updateMapState}
        compareDatasets={compareDatasets}
      />
      <MapInputs
        dataset0={dataset0}
        dataset1={dataset1}
        mapSettings={mapSettings}
        updateMapSettings={updateMapSettings}
        updateDataset0={updateDataset0}
        updateDataset1={updateDataset1}
        uiSettings={uiSettings}
        updateUI={updateUI}
        compareDatasets={compareDatasets}
        action={action}
        showCompare={true}
        featureType={featureType}
      />
      <ToggleLanguage />
      <AnnotationButton
        uiSettings={uiSettings}
        updateUI={updateUI}
        action={action}
      />
      <LinkButton action={action} />
      <MapTools uiSettings={uiSettings} updateUI={updateUI} action={action} />
      <Modal
        show={uiSettings.showModal}
        onHide={closeModal}
        dialogClassName="full-screen-modal"
        size={modalSize}
      >
        <Modal.Header closeButton closeVariant="white" closeLabel={__("Close")}>
          <Modal.Title>{modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalBodyContent}</Modal.Body>
        <Modal.Footer>
          <Button onClick={closeModal}>{__("Close")}</Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showPermalink}
        onHide={() => setShowPermalink(false)}
        dialogClassName="permalink-modal"
        backdrop={true}
      >
        <Modal.Header closeButton closeVariant="white" closeLabel={__("Close")}>
          <Modal.Title>{__("Share Link")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Permalink
            modalType={uiSettings.modalType}
            compareDatasets={compareDatasets}
            generatePermLink={generatePermLink}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowPermalink(false)}>{__("Close")}</Button>
        </Modal.Footer>
      </Modal>
    
      <PlotWindowManager
        plotWindows={plotWindows}
        updatePlotWindow={updatePlotWindow}
        closePlotWindow={closePlotWindow}
        minimizePlotWindow={minimizePlotWindow}
        restorePlotWindow={restorePlotWindow}
      />

  <PlotSidePanel
    plotWindows={plotWindows}
    restorePlotWindow={restorePlotWindow}
    closePlotWindow={closePlotWindow}
  />
    </div>
  );
}

export default withTranslation()(OceanNavigator);
