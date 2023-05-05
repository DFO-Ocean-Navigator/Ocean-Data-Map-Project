import React, { useEffect, useState } from "react";
import { Nav, Row, Col, ListGroup } from "react-bootstrap";

import { GetDatasetsPromise } from "../remote/OceanNavigator.js";

function InfoHelpWindow(props) {
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState("giops_day");
  const [content, setContent] = useState(null);

  useEffect(() => {
    GetDatasetsPromise().then((result) => {
      setAvailableDatasets(result.data);
      setContent(
        <iframe className="content-iframe" src={result.data[0].help}></iframe>
      );
    });
  }, []);

  const helpChanged = (dataset) => {
    let selected = availableDatasets.filter((ds) => {
      return ds.id === dataset;
    });
    setContent(
      <iframe className="content-iframe" src={selected[0].help}></iframe>
    );
    setSelectedItem(dataset);
  };

  let options = null;
  switch (selectedTab) {
    case 0:
      options = availableDatasets.map((dataset) => {
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
    case 1:
      break;
  }

  return (
    <div className="InfoHelpWindow">
      <Nav
        variant="tabs"
        activeKey={selectedTab}
        onSelect={(key) => setSelectedTab(parseInt(key))}
      >
        <Nav.Item>
          <Nav.Link eventKey={0}>{"Dataset Info"}</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey={1}>{"Help"}</Nav.Link>
        </Nav.Item>
      </Nav>
      <Row>
        <Col className="options-col" lg={2}>
          <ListGroup>{options}</ListGroup>
        </Col>
        <Col className="options-col" lg={10}>
          {content}
        </Col>
      </Row>
    </div>
  );
}

export default InfoHelpWindow;
