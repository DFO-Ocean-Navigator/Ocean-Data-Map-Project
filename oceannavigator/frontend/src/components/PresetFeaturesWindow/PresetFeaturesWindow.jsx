import React, { useState, useEffect } from "react";

import { Card, ListGroup } from "react-bootstrap";

import TypeColumn from "./TypeColumn.jsx";

import {
  GetPresetPointsPromise,
  GetPresetLinesPromise,
  GetPresetAreasPromise,
} from "../../remote/OceanNavigator.js";

const LOADING_IMAGE = require("../../images/spinner.gif").default;

import { withTranslation } from "react-i18next";

function PresetFeaturesWindow(props) {
  const [pointItems, setPointItems] = useState({});
  const [lineItems, setLineItems] = useState({});
  const [areaItems, setAreaItems] = useState({});

  useEffect(() => {
    GetPresetPointsPromise().then(
      (result) => {
        setPointItems(result.data);
      },
      (error) => {
        console.error(error);
      }
    );
  });

  return (
    <div className="PresetFeaturesWindow">
      <TypeColumn features={pointItems}/>
    </div>
  );
}

export default withTranslation()(PresetFeaturesWindow);
