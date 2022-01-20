import React from "react";
import {Alert, Well, Checkbox} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class EnterArea extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      areaCoords: [],
    };

    // Function bindings
    this.handleChange = this.handleChange.bind(this);
    this.setCoordData = this.setCoordData.bind(this);
  }

  handleChange(e) {
    this.setState({showAreaPoint4: e.target.checked});
    // Pass updated checkbox value to MapToolbar
    this.props.setCoordData({showAreaPoint4: e.target.checked});
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
        <Alert bsStyle="warning">
          {_("Please enter numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <CoordInputPanel
          id="1"
          header={_("Point 1")}
          setCoordData={this.setCoordData}
        />
        <CoordInputPanel
          id="2"
          header={_("Point 2")}
          setCoordData={this.setCoordData}
        />
        <CoordInputPanel
          id="3"
          header={_("Point 3")}
          setCoordData={this.setCoordData}
        />
        <CoordInputPanel
          id="4"
          header={_("Point 4")}
          setCoordData={this.setCoordData}
        />
      </div>
    );
  }
}

//***********************************************************************
EnterArea.propTypes = {
  setCoordData: PropTypes.func,
};

export default withTranslation()(EnterArea);
