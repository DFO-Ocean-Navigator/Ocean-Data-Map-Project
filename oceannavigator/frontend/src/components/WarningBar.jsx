import React from "react";
import {Alert} from "react-bootstrap";

import { withTranslation } from "react-i18next";

class WarningBar extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      show: true
    };

    // Function bindings
    this.handleDismiss = this.handleDismiss.bind(this);
  }

  handleDismiss() {
    this.setState({ show: false });
  }

  render() {
    if(this.state.show){
      return (
        <Alert bsStyle="warning" onDismiss={this.handleDismiss}>
              Class 4 datasets currently static. Temporal Coverage: Jan 2019 
              to Jan 2022, partial coverage Feb-May 2022 (Ocean Predict) and 
              Feb 2022 to May 2022 (RIOPS Assimilation Observation).
        </Alert>
      );
    }

    return(<div></div>);
  }
}

export default withTranslation()(WarningBar);
