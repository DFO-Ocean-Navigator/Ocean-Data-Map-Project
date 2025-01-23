import React, { useState, useRef, useEffect } from "react";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import ReactGA from "react-ga";

import { DATASET_DEFAULTS, MAP_DEFAULTS } from "./Defaults.js";
import Map from "./map/Map.jsx";
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
import TrackWindow from "./TrackWindow.jsx";
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
  const mapRef = useRef();
  const typeRef = useRef("point");
  const featureRef = useRef([]);
  const [dataset0, setDataset0] = useState(DATASET_DEFAULTS);
  const [dataset1, setDataset1] = useState(DATASET_DEFAULTS);
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
  const [class4Id, setClass4Id] = useState();
  const [class4Type, setClass4Type] = useState("ocean_predict");
  const [mapFeatures, setMapFeatures] = useState([]);
  const [drawnFeatures, setDrawnFeatures] = useState([]);
  const [vectorId, setVectorId] = useState(null);
  const [vectorType, setVectorType] = useState("point");
  const [vectorCoordinates, setVectorCoordinates] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState([]);
  const [names, setNames] = useState([]);
  const [observationArea, setObservationArea] = useState([]);
  const [subquery, setSubquery] = useState();
  const [showPermalink, setShowPermalink] = useState(false);
  const [multiSelect, setMultiSelect] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState([]);

  useEffect(() => {
    ReactGA.ga("send", "pageview");

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

    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keyup", upHandler);
    };
  }, []);

  const upHandler = (e) => {
    if (e.key === "Shift") {
      setMultiSelect(false);
    }
  };

  const action = (name, arg, arg2, arg3) => {
    let featIdx = null;
    let updatedFeatures = null;
    switch (name) {
      case "startDrawing":
        setVectorId(null);
        mapRef.current.startDrawing();
        break;
      case "stopDrawing":
        mapRef.current.stopDrawing();
        setDrawnFeatures([]);
        break;
      case "vectorType":
        // TODO: rename
        typeRef.current = arg;
        setVectorType(arg);
        setDrawnFeatures((prevFeatures) =>
          updateFeatType(prevFeatures, typeRef.current)
        );
        break;
      case "undoMapFeature":
        if (drawnFeatures.length > 0) {
          setDrawnFeatures((prevFeatures) => {
            return prevFeatures.slice(0, prevFeatures.length - 1);
          });
        } else {
          featureRef.current = featureRef.current.slice(
            0,
            featureRef.current.length - 1
          );
          setMapFeatures((prevFeatures) => {
            return prevFeatures.slice(0, prevFeatures.length - 1);
          });
        }
        break;
      case "clearPoints":
        // TODO: update
        setVectorCoordinates([]);
        setSelectedCoordinates([]);
        setVectorId(null);
        break;
      case "resetMap":
        // TODO: update
        mapRef.current.resetMap();
        break;
      case "addPoints":
        // TODO: remove
        setVectorCoordinates((prevCoordinates) => [...prevCoordinates, ...arg]);
        break;
      case "drawNewFeature":
        setDrawnFeatures((prevFeatures) => {
          if (typeRef.current === "point" || prevFeatures.length === 0) {
            let newFeat = {
              id: "id" + Math.random().toString(16).slice(2),
              type: typeRef.current,
              selected: false,
              coords: arg,
            };
            return [...prevFeatures, newFeat];
          } else {
            return [
              {
                id: prevFeatures[0].id,
                type: prevFeatures[0].type,
                selected: false,
                coords: [...prevFeatures[0].coords, ...arg],
              },
            ];
          }
        });
        break;
      case "saveFeature":
        featureRef.current = [...featureRef.current, ...arg];
        setMapFeatures((prevFeatures) => [...prevFeatures, ...arg]);
        setDrawnFeatures([]);
        break;
      case "updateFeatureCoordinate":
        featIdx = mapFeatures.findIndex((feat) => {
          return feat.id === arg;
        });

        updatedFeatures = [...mapFeatures];
        if (arg2[0] >= updatedFeatures[featIdx].coords.length) {
          updatedFeatures[featIdx].coords.push([0, 0]);
        } else {
          updatedFeatures[featIdx].coords[arg2[0]][arg2[1]] = arg3;
        }
        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "updateFeatureType":
        featIdx = mapFeatures.findIndex((feat) => {
          return feat.id === arg;
        });

        updatedFeatures = [...mapFeatures];
        let prevType = updatedFeatures[featIdx].type;
        let nextType = arg2;

        if (nextType === "point" && prevType !== "point") {
          let newFeats = updateFeatType([updatedFeatures[featIdx]], nextType);
          updatedFeatures.splice(featIdx, 1, ...newFeats);
        } else {
          updatedFeatures[featIdx].type = arg2;
        }
        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "combinePointFeatures":
        featIdx = mapFeatures.reduce(
          (result, feat, idx) => (feat.selected ? result.concat(idx) : result),
          []
        );

        let selectedCoords = mapFeatures.reduce((result, feat) => {
          if (feat.selected) {
            result.push(feat.coords[0]);
          }
          return result;
        }, []);

        let newFeat = {
          id: "id" + Math.random().toString(16).slice(2),
          type: "line",
          selected: true,
          coords: selectedCoords,
        };

        updatedFeatures = [...mapFeatures];
        updatedFeatures.splice(featIdx[0], 1, newFeat);
        updatedFeatures = updatedFeatures.filter((feat) => {
          return !arg.includes(feat.id);
        });
        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "removeFeature":
        featIdx = mapFeatures.findIndex((feat) => {
          return feat.id === arg;
        });
        updatedFeatures = [...mapFeatures];
        updatedFeatures.splice(featIdx, 1);
        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "selectFeatures":
        updatedFeatures = [...featureRef.current];
        featIdx = updatedFeatures.reduce(
          (result, feat, idx) =>
            arg.includes(feat.id) ? result.concat(idx) : result,
          []
        );

        updatedFeatures.map((feat) => {
          feat.selected = false;
          return feat;
        });

        if (featIdx.length > 1) {
          for (let idx of featIdx) {
            if (updatedFeatures[idx].type === "point")
              updatedFeatures[idx].selected = true;
          }
        } else {
          updatedFeatures[featIdx[0]].selected = true;
        }

        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "deselectFeatures":
        updatedFeatures = [...featureRef.current];
        featIdx = updatedFeatures.reduce(
          (result, feat, idx) =>
            arg.includes(feat.id) ? result.concat(idx) : result,
          []
        );

        for (let idx of featIdx) {
          updatedFeatures[idx].selected = false;
        }

        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "removeFeatureCoord":
        featIdx = mapFeatures.findIndex((feat) => {
          return feat.id === arg;
        });
        updatedFeatures = [...mapFeatures];

        if (updatedFeatures[featIdx].coords.length === 1) {
          updatedFeatures.splice(featIdx, 1);
        } else {
          updatedFeatures[featIdx].coords.splice(arg2, 1);
        }
        featureRef.current = updatedFeatures;
        setMapFeatures(updatedFeatures);
        break;
      case "selectPoints":
        // TODO: update
        if (!arg) {
          setSelectedCoordinates(vectorCoordinates);
        } else {
          setSelectedCoordinates(arg);
        }
        break;
      case "plot":
        // TODO: update
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
        // TODO: update
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
      case "showAlert":
        setShowAlert(true);
        setAlertMessage(arg);
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
          break;
        case "multiSelect":
          setMultiSelect(value[i]);
          break;
      }
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

  const updateFeatType = (features, nextType) => {
    let updatedFeat = [];

    if (features.length > 0) {
      let prevType = features[0].type;

      if (
        prevType === "point" &&
        (nextType === "line" || nextType === "area")
      ) {
        let nextCoords = features.map((feat) => {
          return feat.coords[0];
        });
        updatedFeat = [
          {
            id: features[0].id,
            type: nextType,
            selected: features[0].selected,
            coords: nextCoords,
          },
        ];
      } else if (
        (prevType === "line" || prevType === "area") &&
        nextType === "point"
      ) {
        let nextCoords = features[0].coords;
        updatedFeat = nextCoords.map((coord) => {
          return {
            id: "id" + Math.random().toString(16).slice(2),
            type: nextType,
            selected: features[0].selected,
            coords: [coord],
          };
        });
      } else {
        updatedFeat = features;
        updatedFeat[0].type = nextType;
      }
    }
    return updatedFeat;
  };

  const generatePermLink = (permalinkSettings) => {
    let query = {};
    // We have a request from Point/Line/AreaWindow component.

    query.subquery = subquery;
    query.showModal = uiSettings.showModal;
    query.modalType = uiSettings.modalType;
    query.names = names;
    query.vectorId = vectorId;
    query.vectorType = vectorType;
    query.vectorCoordinates = vectorCoordinates;
    query.selectedCoordinates = selectedCoordinates;

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
      const line_distance = mapRef.current.getLineDistance(selectedCoordinates);
      modalBodyContent = (
        <LineWindow
          dataset_0={dataset0}
          dataset_1={dataset1}
          line={selectedCoordinates}
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
    case "track":
      modalBodyContent = (
        <TrackWindow
          dataset={dataset0}
          track={selectedCoordinates}
          names={names}
          onUpdate={updateDataset0}
          init={subquery}
          action={action}
          obs_query={vectorId}
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
          mapFeatures={mapFeatures}
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
        features={[...mapFeatures, ...drawnFeatures]}
        vectorId={vectorId}
        vectorType={vectorType}
        class4Type={class4Type}
        updateState={updateState}
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
        drawnFeatures={drawnFeatures}
        updateMapSettings={updateMapSettings}
        updateDataset0={updateDataset0}
        updateDataset1={updateDataset1}
        uiSettings={uiSettings}
        updateUI={updateUI}
        compareDatasets={compareDatasets}
        action={action}
        showCompare={true}
        vectorType={vectorType}
      />
      <ToggleLanguage />
      <LinkButton action={action} />
      <MapTools uiSettings={uiSettings} updateUI={updateUI} action={action} />
      {multiSelect ? null : (
        <Modal
          show={uiSettings.showModal}
          onHide={closeModal}
          dialogClassName="full-screen-modal"
          size={modalSize}
        >
          <Modal.Header
            closeButton
            closeVariant="white"
            closeLabel={__("Close")}
          >
            <Modal.Title>{modalTitle}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{modalBodyContent}</Modal.Body>
          <Modal.Footer>
            <Button onClick={closeModal}>{__("Close")}</Button>
          </Modal.Footer>
        </Modal>
      )}
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
      {showAlert ? (
        <Alert
          variant="warning"
          onClose={() => setShowAlert(false)}
          dismissible
        >
          <Alert.Heading>{alertMessage[0]}</Alert.Heading>
          <p>{alertMessage[1]}</p>
        </Alert>
      ) : null}
    </div>
  );
}

export default withTranslation()(OceanNavigator);
