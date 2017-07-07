import React from "react";
import {Alert, Well, Checkbox} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";

const i18n = require("../i18n.js");

class EnterArea extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      areaCoords: [],
    };
  }

  setCoordData(state, id) {
    const newState = this.state;
    // Put updated coords into array
    newState.areaCoords[parseInt(id) - 1] = state.coordinate;

    this.setState(newState);
    this.props.setCoordData(newState); // Pass state to MapToolbar
  }

  render() {
    return (
      <div className="EnterArea">
        <Alert bsStyle="info">
          {_("Please enter at least 3 points with numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <CoordInputPanel
          id="1"
          header={_("Point 1")}
          setCoordData={this.setCoordData.bind(this)}
        />
        <CoordInputPanel
          id="2"
          header={_("Point 2")}
          setCoordData={this.setCoordData.bind(this)}
        />
        <CoordInputPanel
          id="3"
          header={_("Point 3")}
          setCoordData={this.setCoordData.bind(this)}
        />
        <CoordInputPanel
          id="4"
          header={_("Point 4")}
          setCoordData={this.setCoordData.bind(this)}
        />
      </div>
    );
  }
}

export default EnterArea;