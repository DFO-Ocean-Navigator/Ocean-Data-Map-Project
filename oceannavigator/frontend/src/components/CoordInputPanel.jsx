import React from "react";
import {Panel, Form, FormControl, ControlLabel} from "react-bootstrap";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

const DataInput = {
  LATITUDE: 0,
  LONGTITUDE: 1,
};

class CoordInputPanel extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinate: [],
    };
  }

  // Parses a given float
  str2float(targetValue) {
    const parsedValue = parseFloat(targetValue);

    if (parsedValue == null || isNaN(parsedValue)) {
      return 0.0;
    }
    return parsedValue;
  }

  // Update state based on input values
  onChange(target, coordType) {
    const newState = this.state;
    
    switch (coordType) {
      case DataInput.LATITUDE:
        newState.coordinate[0] = this.str2float(target.value);
        break;
      case DataInput.LONGTITUDE:
        newState.coordinate[1] = this.str2float(target.value);
        break;
    }
    
    this.props.setCoordData(newState, this.props.id); // Update parent
    this.setState(newState);
  }

  render() {
    return (
      <div className="coordInputPanel">
        <Panel
          bsStyle="primary"
          defaultExpanded
        >
          <Panel.Heading>{this.props.header}</Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <Form inline>
                <ControlLabel>{_("Latitude")}: </ControlLabel>
                <FormControl
                  type="text"
                  placeholder="0.0000"
                  onChange={e => this.onChange(e.target, DataInput.LATITUDE)}
                />
                <br />
                <ControlLabel>{_("Longtitude")}: </ControlLabel>
                <FormControl
                  type="text"
                  placeholder="0.0000"
                  onChange={e => this.onChange(e.target, DataInput.LONGTITUDE)}
                />
              </Form>
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      </div>
    );
  }
}

//***********************************************************************
CoordInputPanel.propTypes = {
  header: PropTypes.string,
  setCoordData: PropTypes.func,
  id: PropTypes.string,
};

export default withTranslation()(CoordInputPanel);
