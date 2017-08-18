import React from "react";
import {Alert, Well, Checkbox} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class EnterArea extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showAreaPoint4: false,
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
          {_("Please enter numerical values with numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <Well>
          <Checkbox
            inline
            checked={this.state.showAreaPoint4}
            onChange={this.handleChange}
          >
            {_("Enable 4-point (quad) area mode.")}
          </Checkbox>
        </Well>
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
        <div style={{display: this.state.showAreaPoint4 ? "block" : "none"}}>
          <CoordInputPanel
            id="4"
            header={_("Point 4")}
            setCoordData={this.setCoordData}
          />
        </div>
      </div>
    );
  }
}

//***********************************************************************
EnterArea.propTypes = {
  setCoordData: PropTypes.func,
};
