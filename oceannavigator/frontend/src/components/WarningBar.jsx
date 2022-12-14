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
          *** Add warning here ***
        </Alert>
      );
    }

    return(<div></div>);
  }
}

export default withTranslation()(WarningBar);
