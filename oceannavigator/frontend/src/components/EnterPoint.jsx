import React from "react";
import {Alert} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class EnterPoint extends React.Component {

  render() {
    return (
      <div className="EnterPoint">
        <Alert bsStyle="warning">
          {_("Please enter numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <CoordInputPanel
          header={_("Lat/Long Pair")}
          setCoordData={this.props.setCoordData}
        />
      </div>
    );
  }
}

//***********************************************************************
EnterPoint.propTypes = {
  setCoordData: PropTypes.func,
};

export default withTranslation()(EnterPoint);
