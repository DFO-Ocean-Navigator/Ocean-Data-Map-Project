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
import AnnotationButton from "./AnnotationButton.jsx";
import { withTranslation } from "react-i18next";
import { MinimizedPlotBar, ActivePlotsContainer } from "./PlotComponents.jsx";

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
  const [minimizedPlots, setMinimizedPlots] = useState([]);
  const [activePlots, setActivePlots] = useState([]);
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

  const createPlotComponent = (plotData, plotId) => {
    const { type } = plotData;
    const commonProps = {
      plotData,
      dataset_0: dataset0,
      dataset_1: dataset1,
      mapSettings,
      names,
      updateDataset0,
      updateDataset1,
      init: subquery,
      action,
      dataset_compare: compareDatasets,
      setCompareDatasets,
      key: plotId,
    };

    switch (type) {
      case "Point":
        return <PointWindow {...commonProps} updateDataset={updateDataset0} />;
      case "LineString":
        const line_distance =
          mapRef.current?.getLineDistance?.(plotData.coordinates) || 0;
        return (
          <LineWindow
            {...commonProps}
            line_distance={line_distance}
            onUpdate={updateDataset0}
          />
        );
      case "Polygon":
        return <AreaWindow {...commonProps} />;
      case "track":
        return (
          <TrackWindow
            {...commonProps}
            dataset={dataset0}
            track={plotData.coordinates}
            onUpdate={updateDataset0}
          />
        );
      case "class4":
        return (
          <Class4Window
            dataset={dataset0.id}
            plotData={plotData}
            class4type={plotData.class4type || class4Type}
            init={subquery}
            action={action}
            key={plotId}
          />
        );
      default:
        return <div key={plotId}>Unknown plot type: {type}</div>;
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
          const plotId = newPlotData.id;

          const existingMinimized = minimizedPlots.find(
            (plot) => plot.id === plotId
          );
          if (existingMinimized) {
            action("restorePlot", plotId);
            return;
          }

          const newActivePlot = {
            id: plotId,
            plotData: newPlotData,
            component: createPlotComponent(newPlotData, plotId),
          };

          setActivePlots((prev) => {
            const newActivePlots = [...prev];
            if (newActivePlots.length >= 2) {
              const oldestPlot = newActivePlots.shift();
              setMinimizedPlots((prevMin) => [...prevMin, oldestPlot]);
            }
            return [...newActivePlots, newActivePlot];
          });

          updateUI({ showModal: true });
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
      case "minimizePlot":
        const plotToMinimize = activePlots.find((plot) => plot.id === arg);
        if (plotToMinimize) {
          setMinimizedPlots((prev) => [
            ...prev,
            {
              id: plotToMinimize.id,
              plotData: plotToMinimize.plotData,
            },
          ]);

          setActivePlots((prev) => prev.filter((plot) => plot.id !== arg));

          if (activePlots.length === 1) {
            updateUI({ showModal: false, modalType: "" });
            setPlotData({});
          }
        }
        break;
      case "restorePlot":
        const plotToRestore = minimizedPlots.find((plot) => plot.id === arg);
        if (plotToRestore) {
          const restoredPlot = {
            id: plotToRestore.id,
            plotData: plotToRestore.plotData,
            component: createPlotComponent(
              plotToRestore.plotData,
              plotToRestore.id
            ),
          };

          setActivePlots((prev) => {
            const newActivePlots = [...prev];

            if (newActivePlots.length >= 2) {
              const oldestPlot = newActivePlots.shift();
              setMinimizedPlots((prevMin) => [
                ...prevMin.filter((p) => p.id !== arg),
                {
                  id: oldestPlot.id,
                  plotData: oldestPlot.plotData,
                },
              ]);
            }

            return [...newActivePlots, restoredPlot];
          });

          setMinimizedPlots((prev) => prev.filter((plot) => plot.id !== arg));
          updateUI({ showModal: true });
          setPlotData(plotToRestore.plotData);
        }
        break;
      case "closePlot":
        if (arg) {
          setActivePlots((prev) => {
            const filtered = prev.filter((plot) => plot.id !== arg);
            if (filtered.length === 0) {
              updateUI({ showModal: false, modalType: "" });
              setPlotData({});
            }
            return filtered;
          });
          setMinimizedPlots((prev) => prev.filter((plot) => plot.id !== arg));
        } else {
          setActivePlots([]);
          updateUI({ showModal: false, modalType: "" });
          setPlotData({});
        }
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
  // Swap dataset0 and dataset1
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
    query.subquery = subquery;
    query.showModal = uiSettings.showModal;
    query.modalType = uiSettings.modalType;
    query.features = mapRef.current.getFeatures();

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

  const isNonPlotModal = uiSettings.showModal && activePlots.length === 0;

  let modalBodyContent = null;
  let modalTitle = "";
  let modalSize = "lg";

  if (isNonPlotModal) {
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

      <MinimizedPlotBar
        minimizedPlots={minimizedPlots}
        onRestore={(plotId) => action("restorePlot", plotId)}
        onClose={(plotId) => action("closePlot", plotId)}
      />
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
      <MapTools
        uiSettings={uiSettings}
        updateUI={updateUI}
        action={action}
      />
      <Modal
        show={isNonPlotModal}
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
