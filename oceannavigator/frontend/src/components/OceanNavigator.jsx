import { nominalTypeHack } from "prop-types";
import React, { useState, useRef, useEffect } from "react";
import { Button } from "react-bootstrap";
import Modal from "react-bootstrap/Modal";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import MainMap from "./MainMap.jsx";
import MapInputs from "./MapInputs.jsx";
import MapTools from "./MapTools.jsx";
import ScaleViewer from "./ScaleViewer.jsx";
import PresetFeaturesWindow from "./PresetFeaturesWindow.jsx";
import EnterCoordsWindow from "./EnterCoordsWindow.jsx";
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import ObservationSelector from "./ObservationSelector.jsx";
import SettingsWindow from "./SettingsWindow.jsx";
import InfoHelpWindow from "./InfoHelpWindow.jsx";
import Class4Selector from "./Class4Selector.jsx";
import Class4Window from "./Class4Window.jsx";
import Icon from "./lib/Icon.jsx";
import Permalink from "./Permalink.jsx";
import ToggleLanguage from "./ToggleLanguage.jsx";
import LinkButton from "./LinkButton.jsx";

import { withTranslation } from "react-i18next";

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
  const mapRef = useRef(null);
  const [dataset0, setDataset0] = useState(DATASET_DEFAULTS);
  const [dataset1, setDataset1] = useState(DATASET_DEFAULTS);
  const [compareDatasets, setCompareDatasets] = useState(false);
  const [mapSettings, setMapSettings] = useState({
    projection: "EPSG:3857", // Map projection
    basemap: "topo",
    extent: [],
    ...MAP_DEFAULTS,
  });
  const [uiSettings, setUiSettings] = useState({
    showModal: false,
    modalType: "",
    showDrawingTools: false,
    showObservationTools: false,
  });
  const [class4Id, setClass4Id] = useState();
  const [class4Type, setClass4Type] = useState("ocean_predict");
  const [vectorId, setVectorId] = useState(null);
  const [vectorType, setVectorType] = useState("point");
  const [vectorCoordinates, setVectorCoordinates] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState([]);
  const [names, setNames] = useState([]);
  const [observationArea, setObservationArea] = useState([]);
  const [subquery, setSubquery] = useState();
  const [showPermalink, setShowPermalink] = useState(false);

  useEffect(() => {
    if (window.location.search.length > 0) {
      try {
        const query = JSON.parse(
          decodeURIComponent(window.location.search.replace("?query=", ""))
        );
        updateUI({ modalType: query.modalType, showModal: query.showModal });
        setSubquery(query.subquery);
        setNames(query.names);
        setVectorId(query.vectorId);
        setVectorType(query.vectorType);
        setVectorCoordinates(query.vectorCoordinates);
        setSelectedCoordinates(query.selectedCoordinates);
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
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const action = (name, arg, arg2, arg3) => {
    switch (name) {
      case "startDrawing":
        setVectorId(null);
        mapRef.current.startDrawing();
        break;
      case "stopDrawing":
        mapRef.current.stopDrawing();
        break;
      case "vectorType":
        setVectorType(arg);
        break;
      case "undoPoints":
        setVectorCoordinates(
          vectorCoordinates.slice(0, vectorCoordinates.length - 1)
        );
        break;
      case "clearPoints":
        setVectorCoordinates([]);
        setSelectedCoordinates([]);
        setVectorId(null);
        break;
      case "resetMap":
        mapRef.current.resetMap();
        break;
      case "addPoints":
        setVectorCoordinates((prevCoordinates) => [...prevCoordinates, ...arg]);
        break;
      case "removePoint":
        let coords = vectorCoordinates.filter((coord, index) => index !== arg);
        setVectorCoordinates(coords);
        break;
      case "updatePoint":
        let newCoords = null;
        if (!isNaN(arg2) && !isNaN(arg3)) {
          newCoords = [...vectorCoordinates];
          newCoords[arg][arg2] = arg3;
        } else {
          newCoords = arg;
        }
        setVectorCoordinates(newCoords);
        break;
      case "selectPoints":
        if (!arg) {
          setSelectedCoordinates(vectorCoordinates);
        } else {
          setSelectedCoordinates(arg);
        }
        break;
      case "plot":
        if (vectorCoordinates.length > 0 || vectorId) {
          if (!vectorId) {
            setSelectedCoordinates(vectorCoordinates);
          }
          setUiSettings({
            ...uiSettings,
            showModal: true,
            modalType: vectorType,
          });
        }
        break;
      case "show":
        setVectorCoordinates([]);
        setSelectedCoordinates([]);
        closeModal();
        setClass4Type(arg3);
        mapRef.current.show(arg, arg2);
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
      case "class4Id":
        setClass4Id(arg);
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

  const updateState = (key, value) => {
    for (let i = 0; i < key.length; ++i) {
      switch (key[i]) {
        case "vectorId":
          setVectorId(value[i]);
          break;
        case "vectorType":
          setVectorType(value[i]);
          break;
        case "names":
          setNames(value[i]);
      }
    }
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
    if (subquery !== undefined) {
      query.subquery = subquery;
      query.showModal = true;
      query.modalType = uiSettings.modalType;
      query.names = names;
      query.vectorId = vectorId;
      query.vectorType = vectorType;
      query.vectorCoordinates = vectorCoordinates;
      query.selectedCoordinates = selectedCoordinates;
    }
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
    case "point":
      modalBodyContent = (
        <PointWindow
          dataset_0={dataset0}
          point={selectedCoordinates}
          mapSettings={mapSettings}
          names={names}
          updateDataset={updateDataset0}
          init={subquery}
          action={action}
        />
      );
      modalTitle = selectedCoordinates.map((p) => formatLatLon(p[0], p[1]));
      modalTitle = modalTitle.join(", ");
      break;
    case "line":
      modalBodyContent = (
        <LineWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          line={selectedCoordinates}
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
        selectedCoordinates
          .map(function (ll) {
            return formatLatLon(ll[0], ll[1]);
          })
          .join("), (") +
        ")";
      break;
    case "area":
      modalBodyContent = (
        <AreaWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          area={selectedCoordinates}
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
    case "presetFeatures":
      modalBodyContent = <PresetFeaturesWindow action={action} />;
      modalTitle = "Preset Features";
      break;
    case "enterCoords":
      modalBodyContent = (
        <EnterCoordsWindow
          action={action}
          updateUI={updateUI}
          vectorType={vectorType}
          vectorCoordinates={vectorCoordinates}
        />
      );
      modalTitle = __("Enter Coordinates");
      break;
    case "observationSelect":
      modalBodyContent = (
        <ObservationSelector area={observationArea} action={action} />
      );
      modalTitle = "Select Observations";
      break;
    case "class4Selector":
      modalBodyContent = <Class4Selector action={action} updateUI={updateUI} />;
      modalTitle = "Select Class4";
      modalSize = "sm";
      break;
    case "class4":
      modalBodyContent = (
        <Class4Window
          dataset={dataset0.id}
          class4id={class4Id}
          class4type={class4Type}
          init={subquery}
          action={action}
        />
      );
      modalTitle = "Class4";
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
      />
      {compareDatasets ? (
        <ScaleViewer
          dataset={dataset1}
          mapSettings={mapSettings}
          onUpdate={updateDataset0}
          right={true}
        />
      ) : null}
      <MainMap
        ref={mapRef}
        mapSettings={mapSettings}
        dataset0={dataset0}
        dataset1={dataset1}
        vectorId={vectorId}
        vectorType={vectorType}
        vectorCoordinates={vectorCoordinates}
        class4Type={class4Type}
        updateState={updateState}
        action={action}
        updateMapSettings={updateMapSettings}
        updateUI={updateUI}
        compareDatasets={compareDatasets}
      />
      <MapInputs
        dataset0={dataset0}
        dataset1={dataset1}
        mapSettings={mapSettings}
        updateDataset0={updateDataset0}
        updateDataset1={updateDataset1}
        uiSettings={uiSettings}
        updateUI={updateUI}
        compareDatasets={compareDatasets}
        action={action}
        showCompare={true}
        vectorType={vectorType}
        vectorCoordinates={vectorCoordinates}
      />
      <ToggleLanguage />
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
          <Modal.Title>
            <Icon icon="link" alt={"Share Link"} /> {__("Share Link")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Permalink
            modalType={uiSettings.modalType}
            compareDatasets={compareDatasets}
            generatePermLink={generatePermLink}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowPermalink(false)}>
            <Icon icon="close" alt={__("Close")} /> {__("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default withTranslation()(OceanNavigator);
