import React from "react";
import { Button } from "react-bootstrap";

import { withTranslation } from "react-i18next";

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
      props.action("loadFeatures", "observation_tracks", result);
    } else {
      props.action("loadFeatures", "observation_points", result);
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

  const handleClass4 = () => {
    props.updateUI({ modalType: "class4Selector", showModal: true });
  };

  return (
    <div className={"obs-tools"}>
      <Button className="plot-button" onClick={handleAll}>
        {__("All")}
      </Button>
      <Button className="plot-button" onClick={handleArea}>
      {__("Select Area")}
      </Button>
      <Button className="plot-button" onClick={handlePoint}>
        {__("Select point")}
      </Button>
      {/* <Button className="plot-button" onClick={handleDrifters}>
        {__("Show Active Drifters")}
      </Button> */}
      <Button className="plot-button" onClick={handleClass4}>
        {__("Class4")}
      </Button>
      <Button className="close-button" onClick={handleClose}>
        {__("Close")}
      </Button>
    </div>
  );
}

export default withTranslation()(ObservationTools);
