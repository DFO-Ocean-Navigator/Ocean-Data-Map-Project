import React, { useEffect, useState } from "react";
import {
  Button,
  Nav,
  Row,
  Col,
  ListGroup,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

import { GetDatasetsPromise } from "../remote/OceanNavigator.js";

const MANUAL_LINKS = [
  {
    id: "Ocean Navigator Overview",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#ocean-navigator-overview",
    section_header: true,
  },
  {
    id: "Main Map",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#1-main-map",
  },
  {
    id: "Dataset Selection Panel",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#2-dataset-selection-panel",
  },
  {
    id: "Data Scale Viewer",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#3-data-scale-viewer",
  },
  {
    id: "Navigator Map Tools",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#4-navigator-map-tools",
  },
  {
    id: "Additional Options",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#5-additional-options",
  },
  {
    id: "Ocean Navigator Plot Windows",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#ocean-navigator-plot-windows",
    section_header: true,
  },
  {
    id: "Point",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#point",
  },
  {
    id: "Line",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#line",
  },
  {
    id: "Area",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#area",
  },
  {
    id: "Observation",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#observation",
  },
  {
    id: "Class4",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#class4",
  },
  {
    id: "Saving Plot Images and Data",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#saving-plot-images-and-data",
  },
  {
    id: "Using the Ocean Navigator",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#using-the-ocean-navigator",
    section_header: true,
  },
  {
    id: "Selecting Coordinates and Creating Plots with the Draw Point Coordinates Tool",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#selecting-coordinates-and-creating-plots-with-the-draw-point-coordinates-tool",
  },
  {
    id: "Selecting Coordinates and Creating Plots with the Enter Point Coordinates Tool",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#selecting-coordinates-and-creating-plots-with-the-enter-point-coordinates-tool",
  },
  {
    id: "Creating Plots via the Preset Features Menu",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#creating-plots-via-the-preset-features-menu",
  },
  {
    id: "Viewing Observation and Class4 Data",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#viewing-observation-and-class4-data",
  },
  {
    id: "Displaying Class4 Data",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#displaying-class4-data",
  },
  {
    id: "Comparing Datasets",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#comparing-datasets",
  },
  {
    id: "Changing Map Settings",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#changing-map-settings-",
  },
  {
    id: "Instructional Videos",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#instructional-videos",
    section_header: true,
  },
  {
    id: "Create Point plot and Virtual Mooring",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#create-point-plot-and-virtual-mooring",
  },
  {
    id: "Create Virtual Mooring for current and bearing data",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#create-virtual-mooring-for-current-and-bearing-data",
  },
  {
    id: "How to modify Point plot range and add multiple variables",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#how-to-modify-point-plot-range-and-add-multiple-variables",
  },
  {
    id: "Create Transect and Hovmöller plot",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#create-transect-and-hovm%C3%B6ller-plot",
  },
  {
    id: "Create Area plot and save *.csv",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#create-area-plot-and-save-csv",
  },
  {
    id: "Subset NetCDF file and save",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#subset-netcdf-file-and-save",
  },
  {
    id: "Creating plots using Enter Point Coordinates and adding quivers",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#creating-plots-using-enter-point-coordinates-and-adding-quivers",
  },
  {
    id: "Creating climatology plots for predefined areas",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#creating-climatology-plots-for-predefined-areas",
  },
  {
    id: "Plot Class4 data",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#plot-class4-data",
  },
  {
    id: "Compare datasets and save plot",
    link: "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/#compare-datasets-and-save-plot",
  },
];

const DATASET_LINKS = [
  {
    id: "Ocean Prediction Systems",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ocean-prediction-systems",
    section_header: true,
  },
  {
    id: "ECCC Datasets",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#eccc-datasets",
    section_header: true,
  },
  {
    id: "Global Ice Ocean Prediction System 1/4° Physics Analysis and Forecast Updated Daily (GIOPS)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#global-ice-ocean-prediction-system-14-physics-analysis-and-forecast-updated-daily-giops",
    sub_header: true,
  },
  {
    id: "GIOPS 10 Day Forecast 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#giops-10-day-forecast-3d--latlon",
  },
  {
    id: "GIOPS 10 Day Forecast Surface – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#giops-10-day-forecast-surface--latlon",
  },
  {
    id: "GIOPS Daily Historical 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#giops-daily-historical-3d--latlon",
  },
  {
    id: "GIOPS 3 hr mean Historical Surface - LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#giops-3-hr-mean-historical-surface---latlon",
  },
  {
    id: "Regional Ice Ocean Prediction System (RIOPS) 1/12°",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#regional-ice-ocean-prediction-system-riops-112",
    sub_header: true,
  },
  {
    id: "RIOPS Forecast 3D – Polar Stereographic",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#riops-forecast-3d--polar-stereographic",
  },
  {
    id: "RIOPS Forecast Surface – Polar Stereographic",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#riops-forecast-surface--polar-stereographic",
  },
  {
    id: "CCG RIOPS Forecast Surface - LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ccg-riops-forecast-surface---latlon",
  },
  {
    id: "Coastal Ice Ocean Prediction System (CIOPS)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#coastal-ice-ocean-prediction-system-ciops",
    sub_header: true,
  },
  {
    id: "CIOPS Forecast East 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-east-3d--latlon",
  },
  {
    id: "CIOPS Forecast East Surface – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-east-surface--latlon",
  },
  {
    id: "CIOPS Forecast West 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-west-3d--latlon",
  },
  {
    id: "CIOPS Forecast West Surface – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-west-surface--latlon",
  },
  {
    id: "CIOPS Forecast Salish Sea 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-salish-sea-3d--latlon",
  },
  {
    id: "CIOPS Forecast Salish Sea Surface - LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-forecast-salish-sea-surface---latlon",
  },
  {
    id: "CIOPS Historical Datasets",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-datasets",
  },
  {
    id: "CIOPS Historical East 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-east-3d--latlon",
  },
  {
    id: "CIOPS Historical East Surface – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-east-surface--latlon",
  },
  {
    id: "CIOPS Historical West 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-west-3d--latlon",
  },
  {
    id: "CIOPS Historical West Surface – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-west-surface--latlon",
  },
  {
    id: "CIOPS Historical Salish Sea 3D – LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-salish-sea-3d--latlon",
  },
  {
    id: "CIOPS Historical Salish Sea Surface - LatLon",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#ciops-historical-salish-sea-surface---latlon",
  },
  {
    id: "Global Deterministic Wave Prediction System (GDWPS)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#global-deterministic-wave-prediction-system-gdwps",
    sub_header: true,
  },
  {
    id: "Water Cycle Prediction System (WCPS)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#water-cycle-prediction-system-wcps",
    sub_header: true,
  },
  {
    id: "Copernicus Marine Service Datasets",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#copernicus-marine-service-datasets",
    section_header: true,
  },
  {
    id: "Global Ocean Physics Reanalysis (GLOBAL_MULTIYEAR_PHY_001_030)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#global-ocean-physics-reanalysis-global_multiyear_phy_001_030",
    sub_header: true,
  },
  {
    id: "Copernicus Marine Service Global Ocean 1/12 deg Physics Reanalysis (Daily)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#copernicus-marine-service-global-ocean-112-deg-physics-reanalysis-daily",
  },
  {
    id: "Copernicus Marine Service Global Ocean 1/12 deg Physics Reanalysis (Monthly)",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#copernicus-marine-service-global-ocean-112-deg-physics-reanalysis-monthly",
  },
  {
    id: "Climatology calculated from GLOBAL REANALYSIS PHY 001_030",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#climatology-calculated-from-global-reanalysis-phy-001_030",
    sub_header: true,
  },
  {
    id: "CMEMS Global Ocean PHYS Reanalysis Climatology 1/12 deg",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#cmems-global-ocean-phys-reanalysis-climatology-112-deg",
  },
  {
    id: "CMEMS Global Ocean PHYS Reanalysis Climatology (Monthly mean) 1/12 deg",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#cmems-global-ocean-phys-reanalysis-climatology-monthly-mean-112-deg",
  },
  {
    id: "CMEMS Global Ocean PHYS Reanalysis Climatology (Seasonal mean) 1/12 deg",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#cmems-global-ocean-phys-reanalysis-climatology-seasonal-mean-112-deg",
  },
  {
    id: "SalishSeaCast Datasets",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#salishseacast-datasets",
    section_header: true,
  },
  {
    id: "SalishSeaCast 3D Biology",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#salishseacast-3d-biology",
  },
  {
    id: "SalishSeaCast 3D Currents",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#salishseacast-3d-currents",
  },
  {
    id: "SalishSeaCast 3D Salinity & Temperature",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#salishseacast-3d-salinity--temperature",
  },
  {
    id: "SalishSeaCast 2D Sea Surface Height",
    link: "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/#salishseacast-2d-sea-surface-height",
  },
];

const INSTRUCTIONAL_VIDEOS = [
  { id: "rMVSFRfMrqE", title: "General Introduction" },
  { id: "gcmjtYSJs8c", title: "Create Point plot and Virtual Mooring" },
  {
    id: "pzzFh8cOLog",
    title: "Create Virtual Mooring for current and bearing data",
  },
  {
    id: "NbB9iOoagiA",
    title: "How to modify Point plot range and add multiple variables",
  },
  { id: "zYoSJq306XI", title: "Create Transect and Hovmöller plot" },
  { id: "pid28Nuh3CQ", title: "Create Area plot and save *.csv" },
  { id: "QIDEgiDuUqI", title: "Subset NetCDF file and save" },
  {
    id: "PqJ99yOG7WI",
    title: "Creating plots using Enter Point Coordinates and adding quivers",
  },
  {
    id: "MCCmcexArXA",
    title: "Creating climatology plots for predefined areas",
  },
  { id: "9hAgSWPVP9Q", title: "Plotting in-situ ocean Observation" },
  { id: "ABid30zxSfc", title: "Plot Class4 data" },
  { id: "tu44-hjqY0o", title: "Compare datasets and save plot" },
];

function VideoFrame(props) {
  return (
    <div className="video-responsive">
      <iframe
        width="853"
        height="480"
        src={`https://www.youtube.com/embed/${props.id}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={props.title}
      />
    </div>
  );
}

function InfoHelpWindow(props) {
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState("giops_day");
  const [content, setContent] = useState(null);

  useEffect(() => {
    switch (selectedTab) {
      case 0:
        setContent(
          <iframe
            className="content-iframe"
            src="https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/"
          ></iframe>
        );
        break;
      case 1:
        setContent(
          <iframe
            className="content-iframe"
            src="https://dfo-ocean-navigator.github.io/Dataset-Descriptions/"
          ></iframe>
        );
        break;
      case 2:
        setContent(
          <iframe
            className="content-iframe"
            src="./data-help/derived_variables.html"
          ></iframe>
        );
        break;
      case 3:
        setContent(
          <iframe
            className="content-iframe"
            src="./data-help/observation_definitions.html"
          ></iframe>
        );
        break;
      case 4:
        setContent(
          <VideoFrame
            id={INSTRUCTIONAL_VIDEOS[0].id}
            title={INSTRUCTIONAL_VIDEOS[0].title}
          />
        );
        setSelectedItem(INSTRUCTIONAL_VIDEOS[0].id);
        break;
      case 5:
        setContent(
          <iframe
            className="content-iframe"
            src="https://oceannavigator.ca/docs"
          ></iframe>
        );
        break;
    }
  }, [selectedTab]);

  const helpChanged = (sectionID) => {
    let selected = DATASET_LINKS.filter((link) => {
      return link.id === sectionID;
    });
    setContent(
      <iframe className="content-iframe" src={selected[0].link}></iframe>
    );
  };

  const sectionChanged = (sectionID) => {
    let selected = MANUAL_LINKS.filter((link) => {
      return link.id === sectionID;
    });
    setContent(
      <iframe className="content-iframe" src={selected[0].link}></iframe>
    );
  };

  const videoChanged = (videoId) => {
    let selected = INSTRUCTIONAL_VIDEOS.filter((link) => {
      return link.id === videoId;
    });
    setContent(<VideoFrame id={selected[0].id} title={selected[0].title} />);
    setSelectedItem(selected[0].id);
  };

  const openNewTab = () => {
    let url = null;
    let selected = null;
    switch (selectedTab) {
      case 0:
        url = "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/";
        break;
      case 1:
        url = "https://dfo-ocean-navigator.github.io/Dataset-Descriptions/";
        break;
        break;
      case 2:
        url = "./data-help/derived_variables.html";
        break;
      case 3:
        url = "./data-help/observation_definitions.html";
        break;
      case 4:
        url = `https://youtu.be/${selectedItem}`;
        break;
      case 5:
        url = "https://navigator.oceansdata.ca/docs";
        break;
    }

    window.open(url, "_blank");
  };

  let listOptions = null;
  switch (selectedTab) {
    case 0:
      listOptions = MANUAL_LINKS.map((link) => {
        return (
          <ListGroup.Item
            key={link.id}
            id={link.id}
            variant={link.section_header === true && "primary"}
            action
            onClick={(e) => {
              sectionChanged(e.target.id);
            }}
          >
            {link.id}
          </ListGroup.Item>
        );
      });
      break;
    case 1:
      listOptions = DATASET_LINKS.map((link) => {
        let variant = null;
        if (link.section_header === true) {
          variant = "primary";
        } else if (link.sub_header === true) {
          variant = "info";
        }
        return (
          <ListGroup.Item
            key={link.id}
            id={link.id}
            variant={variant}
            action
            onClick={(e) => {
              helpChanged(e.target.id);
            }}
          >
            {link.id}
          </ListGroup.Item>
        );
      });
      break;
    case 4:
      listOptions = INSTRUCTIONAL_VIDEOS.map((video) => {
        return (
          <ListGroup.Item
            key={video.id}
            id={video.id}
            active={video.id === selectedItem}
            action
            onClick={(e) => {
              videoChanged(e.target.id);
            }}
          >
            {video.title}
          </ListGroup.Item>
        );
      });
  }

  return (
    <div className="InfoHelpWindow">
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="tooltip">Open in new tab</Tooltip>}
      >
        <Button
          className="new-tab-button"
          onClick={() => {
            openNewTab();
          }}
        >
          <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
        </Button>
      </OverlayTrigger>
      <Nav
        variant="tabs"
        activeKey={selectedTab}
        onSelect={(key) => setSelectedTab(parseInt(key))}
      >
        <Nav.Item>
          <Nav.Link eventKey={0}>{"User Manual"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={1}>{"Dataset Info"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={2}>{"Derived Variables"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={3}>{"Observation Defintions"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={4}>{"Instructional Videos"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={5}>{"API Documentation"}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row>
        <Col className="options-col" lg={2}>
          <ListGroup>{listOptions}</ListGroup>
        </Col>
        <Col className="options-col" lg={10}>
          {content}
        </Col>
      </Row>
    </div>
  );
}

export default InfoHelpWindow;
