import React from "react";
import {Alert, Button} from "react-bootstrap";

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
              New Feature: New observational datasets are now available.
              Please report any issues<Button bsStyle="link" href='https://github.com/DFO-Ocean-Navigator/Ocean-Data-Map-Project/labels/observations' target="_blank">here</Button>.
              They will be corrected in a future release. 
        </Alert>
      );
    }

    return(<div></div>);
  }
}

export default withTranslation()(WarningBar);
