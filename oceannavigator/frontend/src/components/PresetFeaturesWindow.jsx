import React, { useState, useEffect } from "react";

import { Card, ListGroup } from "react-bootstrap";

import {
  GetPresetPointsPromise,
  GetPresetLinesPromise,
  GetPresetAreasPromise,
} from "../remote/OceanNavigator.js";

const LOADING_IMAGE = require("../images/spinner.gif").default;

import { withTranslation } from "react-i18next";

function PresetFeaturesWindow(props) {
  const [pointItems, setPointItems] = useState(null);
  const [lineItems, setLineItems] = useState(null);
  const [areaItems, setAreaItems] = useState(null);

  useEffect(() => {
    GetPresetPointsPromise().then(
      (result) => {
        setPointItems(
          result.data.map(function (d) {
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
      },
      (error) => {
        console.error(error);
      }
    );

    GetPresetLinesPromise().then(
      (result) => {
        setLineItems(
          result.data.map(function (d) {
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
      },
      (error) => {
        console.error(error);
      }
    );

    GetPresetAreasPromise().then(
      (result) => {
        setAreaItems(
          result.data.map(function (d) {
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
      },
      (error) => {
        console.error(error);
      }
    );
  }, []);

  const handleClick = (e, type) => {
    props.action("show", type, e.target.id);
  };

  return (
    <div className="PresetFeaturesWindow">
      <Card className="features-card">
        <Card.Header>{__("Points")}</Card.Header>
        {pointItems ? (
          <ListGroup variant="flush">{pointItems}</ListGroup>
        ) : (
          <img src={LOADING_IMAGE} />
        )}
      </Card>
      <Card className="features-card">
        <Card.Header>{__("Lines")}</Card.Header>
        {lineItems ? (
          <ListGroup variant="flush">{lineItems}</ListGroup>
        ) : (
          <img src={LOADING_IMAGE} />
        )}
      </Card>
      <Card className="features-card">
        <Card.Header>{__("Areas")}</Card.Header>
        {areaItems ? (
          <ListGroup variant="flush">{areaItems}</ListGroup>
        ) : (
          <img src={LOADING_IMAGE} />
        )}
      </Card>
    </div>
  );
}

PresetFeaturesWindow.propTypes = {
  action: PropTypes.func,
  
};

action={action}
export default withTranslation()(PresetFeaturesWindow);
