import React, { useState, useEffect } from "react";

import { Card, ListGroup } from "react-bootstrap";

function PresetFeaturesWindow(props) {
  const [pointItems, setPointItems] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [areaItems, setAreaItems] = useState([]);

  useEffect(() => {
    setPointItems(
      props.points.map(function (d) {
        return (
          <ListGroup.Item
            key={d.id}
            id={d.id}
            action
            onClick={(e) => {
              handleClick(e, "point");
            }}
          >
            {d.name}
          </ListGroup.Item>
        );
      })
    );
    setLineItems(
      props.lines.map(function (d) {
        return (
          <ListGroup.Item
            key={d.id}
            id={d.id}
            action
            onClick={(e) => {
              handleClick(e, "line");
            }}
          >
            {d.name}
          </ListGroup.Item>
        );
      })
    );
    setAreaItems(
      props.areas.map(function (d) {
        return (
          <ListGroup.Item
            key={d.id}
            id={d.id}
            action
            onClick={(e) => {
              handleClick(e, "area");
            }}
          >
            {d.name}
          </ListGroup.Item>
        );
      })
    );
  }, [props]);

  const handleClick = (e, type) => {
    console.log([e, type]);
  };

  return (
    <div className="PresetFeaturesWindow">
      <Card className="features-card">
        <Card.Header>Points</Card.Header>
        <ListGroup variant="flush">{pointItems}</ListGroup>
      </Card>
      <Card className="features-card">
        <Card.Header>Lines</Card.Header>
        <ListGroup variant="flush">{lineItems}</ListGroup>
      </Card>
      <Card className="features-card">
        <Card.Header>Areas</Card.Header>
        <ListGroup variant="flush">{areaItems}</ListGroup>
      </Card>
    </div>
  );
}

export default PresetFeaturesWindow;
