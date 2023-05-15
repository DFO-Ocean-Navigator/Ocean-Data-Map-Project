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
];

function InfoHelpWindow(props) {
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState("giops_day");
  const [content, setContent] = useState(null);

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
    });
  }, []);

  useEffect(() => {
    if (selectedTab === 0) {
      setContent(
        <iframe
          className="content-iframe"
          src="https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/"
        ></iframe>
      );
    } else if (selectedTab === 1) {
      let helpContent = null;
      if (availableDatasets.length > 0) {
        helpContent = availableDatasets[0].help;
      }
      setContent(
        <iframe className="content-iframe" src={helpContent}></iframe>
      );
    } else if (selectedTab === 2) {
      setContent(
        <iframe
          className="content-iframe"
          src="./data-help/derived-variables.html"
        ></iframe>
      );
    } else if (selectedTab === 3) {
      setContent(
        <iframe
          className="content-iframe"
          src="https://navigator.oceansdata.ca/docs"
        ></iframe>
      );
    }
  }, [selectedTab]);

  const helpChanged = (dataset) => {
    let selected = availableDatasets.filter((ds) => {
      return ds.id === dataset;
    });
    setContent(
      <iframe className="content-iframe" src={selected[0].help}></iframe>
    );
    setSelectedItem(dataset);
  };

  const sectionChanged = (sectionID) => {
    let selected = MANUAL_LINKS.filter((link) => {
      return link.id === sectionID;
    });
    setContent(
      <iframe className="content-iframe" src={selected[0].link}></iframe>
    );
  };

  const openNewTab = () => {
    let url = null;
    switch (selectedTab) {
      case 0:
        url = "https://dfo-ocean-navigator.github.io/Ocean-Navigator-Manual/";
        break;
      case 1:
        let selected = availableDatasets.filter((ds) => {
          return ds.id === selectedItem;
        });
        url = selected[0].help;
        break;
      case 4:
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
      listOptions = availableDatasets.map((dataset) => {
        return (
          <ListGroup.Item
            key={dataset.id}
            id={dataset.id}
            active={dataset.id === selectedItem}
            action
            onClick={(e) => {
              helpChanged(e.target.id);
            }}
          >
            {dataset.value}
          </ListGroup.Item>
        );
      });
      break;
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
          <Nav.Link eventKey={3}>{"Instructional Videos"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={4}>{"API Documentation"}</Nav.Link>
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


{/* <div className="video-responsive">
<iframe
  width="853"
  height="480"
  src={`https://www.youtube.com/embed/dtJKI4qDpWI`}
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowFullScreen
  title="Embedded youtube"
/>
</div> */}