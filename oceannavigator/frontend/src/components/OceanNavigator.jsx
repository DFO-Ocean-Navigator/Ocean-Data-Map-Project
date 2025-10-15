import React, { useState, useRef, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import ReactGA from "react-ga";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import Map from "./Map/Map.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";
import ScaleViewer from "./ScaleViewer.jsx";
import ActivePlotsContainer from "./plot-components/ActivePlotsContainer.jsx";
import MinimizedPlotBar from "./plot-components/MinimizedPlotBar.jsx";
import PresetFeaturesWindow from "./PresetFeaturesWindow.jsx";
import ModifyFeaturesWindow from "./ModifyFeaturesWindow/ModifyFeaturesWindow.jsx";
import AnnotationButton from "./AnnotationButton.jsx";
import AnnotationTextWindow from "./AnnotationTextWindow.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
import SettingsWindow from "./SettingsWindow.jsx";
import InfoHelpWindow from "./InfoHelpWindow.jsx";
import Class4Selector from "./Class4Selector.jsx";
import Permalink from "./Permalink.jsx";
import ToggleLanguage from "./ToggleLanguage.jsx";
import LinkButton from "./LinkButton.jsx";

import { withTranslation } from "react-i18next";

function OceanNavigator(props) {
  const mapRef = useRef();
  const [dataset0, setDataset0] = useState(DATASET_DEFAULTS);
  const [dataset1, setDataset1] = useState(DATASET_DEFAULTS);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([]);
  const [compareDatasets, setCompareDatasets] = useState(false);
  const [mapSettings, setMapSettings] = useState({
    projection: "EPSG:3857",
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
  const [plotData, setPlotData] = useState([]);
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
            let newPlotData = mapRef.current.getPlotData();
            setPlotData(newPlotData);
          }
          updateUI({ modalType: query.modalType, showModal: query.showModal });
          setSubquery(query.subquery);
        }, 1000);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

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
        setPlotData([]);
        setSelectedFeatureIds([]);
        if (uiSettings.showDrawingTools) {
          mapRef.current.startFeatureDraw();
        }
        break;
      case "plot":
        let newPlotData = mapRef.current.getPlotData();
        if (!newPlotData) break;
        setPlotData((prevPlotData) => {
          const existingIdx = prevPlotData.findIndex(
            (data) => data.id === newPlotData.id
          );
          if (existingIdx > -1) {
            return prevPlotData.map((p, idx) => ({
              ...p,
              active: idx === existingIdx,
            }));
          } else {
            return [...prevPlotData, newPlotData];
          }
        });
        break;
      case "updatePlots":
        setPlotData(arg);
        break;
      case "closePlot":
        setPlotData((prevPlotData) =>
          prevPlotData.filter((plot) => plot.id !== arg.id)
        );
        break;
      case "selectedFeatureIds":
        setSelectedFeatureIds(arg);
        break;
      case "loadFeatures":
        closeModal();
        mapRef.current.loadFeatures(arg, arg2);
        break;
      case "drawObsPoint":
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
        setCompareDatasets((prevCompare) => !prevCompare);
        break;
      case "permalink":
        setSubquery(null);
        setShowPermalink(true);
        break;
    }
  };

  const updateMapState = (key, value) => {
    setMapState((prevMapState) => ({
      ...prevMapState,
      [key]: value,
    }));
  };

  const updateDataset0 = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset0(value);
        break;
      default:
        setDataset0((prevDataset) => ({
          ...prevDataset,
          [key]: value,
        }));
    }
  };

  const updateDataset1 = (key, value) => {
    switch (key) {
      case "dataset":
        setDataset1(value);
        break;
      default:
        setDataset1((prevDataset) => ({
          ...prevDataset,
          [key]: value,
        }));
    }
  };

  const updateUI = (newSettings) => {
    setUiSettings((prevUISettings) => ({
      ...prevUISettings,
      ...newSettings,
    }));
  };

  const closeModal = () => {
    setUiSettings((prevUiSettings) => ({
      ...prevUiSettings,
      showModal: false,
      modalType: "",
    }));
  };
  const swapViews = () => {
    const tempDataset = dataset0;
    setDataset0(dataset1);
    setDataset1(tempDataset);
  };

  const updateMapSettings = (key, value) => {
    setMapSettings((prevMapSettings) => ({
      ...prevMapSettings,
      [key]: value,
    }));
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
      <MinimizedPlotBar plotData={plotData} action={action} />
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
      <ActivePlotsContainer
        plotData={plotData}
        dataset0={dataset0}
        dataset1={dataset1}
        mapSettings={mapSettings}
        names={names}
        updateDataset0={updateDataset0}
        updateDataset1={updateDataset1}
        subquery={subquery}
        action={action}
        compareDatasets={compareDatasets}
        setCompareDatasets={setCompareDatasets}
        class4Type={class4Type}
        swapViews={swapViews}
      />
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
    </div>
  );
}

export default withTranslation()(OceanNavigator);
