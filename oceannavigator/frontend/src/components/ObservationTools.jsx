import React, { useState } from "react";
import { Button, ToggleButton } from "react-bootstrap";

function ObservationTools(props) {
  const observationSelect = (selection) => {
    let type = selection["type"];
    delete selection["type"];
    let result = Object.keys(selection)
      .map(function (key) {
        return `${key}=${selection[key]}`;
      })
      .join(";");
    if (type == "track") {
      props.action("show", "observation_tracks", result);
    } else {
      props.action("show", "observation_points", result);
    }
  };

  const handleClose = () => {
    props.updateUI({ showDrawingTools: false, showObservationTools: false });
  };

  const handleAll = () => {
    props.updateUI({ modalType: "observationSelect", showModal: true });
  };

  const handlePoint = () => {
    props.action("drawObsPoint");
  };

  const handleArea = () => {
    props.action("drawObsArea");
  };

  const handleDrifters = () => {
    let today = new Date();
    let start = new Date(new Date().setDate(today.getDate() - 30));
    observationSelect({
      start_date: start.toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      type: "track",
      quantum: "day",
      platform_type: ["drifter"],
    });
  };

  const handleClass4 = () => {};

  return (
    <div className="obs-tools">
      <Button className="plot-button" onClick={handleAll}>
        All
      </Button>
      <Button className="plot-button" onClick={handleArea}>
        Select Area
      </Button>
      <Button className="plot-button" onClick={handlePoint}>
        Select point
      </Button>
      <Button className="plot-button" onClick={handleDrifters}>
        Show Active Drifters
      </Button>
      <Button className="plot-button" onClick={handleClass4}>
        Class4
      </Button>
      <Button className="close-button" onClick={handleClose}>
        Close
      </Button>
    </div>
  );
}

export default ObservationTools;