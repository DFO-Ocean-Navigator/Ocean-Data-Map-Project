import React from "react";
import {Alert} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class EnterLine extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      line: {
        startCoord: [],
        endCoord: []
      },
    };
  }

  setCoordData(state, id) {
    const newState = this.state;

    switch (id) {
      case "start":
        newState.line.startCoord[0] = state.coordinate[0]; // Lat
        newState.line.startCoord[1] = state.coordinate[1]; // Long
        break;
      case "end":
        newState.line.endCoord[0] = state.coordinate[0];
        newState.line.endCoord[1] = state.coordinate[1];
        break;
    }

    this.setState(newState);
    this.props.setCoordData(newState);
  }

  render() {
    return (
      <div className="EnterLine">
        <Alert bsStyle="warning">
          {_("Please enter numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <CoordInputPanel
          id="start"
          header={_("Start Coordinate")}
          setCoordData={this.setCoordData.bind(this)}
        />
        <CoordInputPanel
          id="end"
          header={_("End Coordinate")}
          setCoordData={this.setCoordData.bind(this)}
        />
      </div>
    );
  }
}

//***********************************************************************
EnterLine.propTypes = {
  setCoordData: PropTypes.func,
};
