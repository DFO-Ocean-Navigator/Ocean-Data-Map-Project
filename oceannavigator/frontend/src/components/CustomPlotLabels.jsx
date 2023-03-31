/* eslint react/no-deprecated: 0 */
/*
  Created: 05/15/2018 
  Noah Gallant

  Modified: 05/16/2018
  
  Component Allowing for Custom Plot Titles provided by the user

*/

import React from "react";
import { Row, Button, OverlayTrigger, Tooltip } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import PropTypes from "prop-types";
import Icon from "./lib/Icon.jsx";

import { withTranslation } from "react-i18next";

class CustomPlotLabels extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      userProvidedTitle: props.plotTitle, //Holds user defined plot title
    };

    this.updateParent = this.updateParent.bind(this);
    this.updateState = this.updateState.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ userProvidedTitle: nextProps.plotTitle });
  }

  //Updates new title value as user types
  updateState(e) {
    this.setState({
      userProvidedTitle: e.target.value, //Changes stored title value
    });
  }

  //Updates title on button click
  updateParent(e) {
    if (e.target.id === "titleBox") {
      e.preventDefault();
    }

    this.props.updatePlotTitle(this.state.userProvidedTitle);
  }

  render() {
    return (
      <div className="custom-plot-labels">
        <div>
          <h1 className="plot-label-title">{this.props.title}</h1>
          <Row>
            <Form //Keeps everything in the same row
              style={{
                paddingLeft: "15px",
                paddingRight: "15px",
              }}
              id="titleBox"
              onSubmit={this.updateParent} //Calls when user hits enter
            >
              {/* Updated Plot Title Input Field*/}
              <Form.Control
                value={this.state.userProvidedTitle}
                ref={(input) => (this.textInput = input)}
                style={{ width: "83%" }}
                type="text"
                onChange={this.updateState}
                placeholder={_("Default")}
              ></Form.Control>

              {/* Update Plot Title Button */}
              <OverlayTrigger
                placement="right"
                overlay={<Tooltip id="tooltip">{_("Apply Title")}</Tooltip>}
              >
                <Button onClick={this.updateParent}>Apply</Button>
              </OverlayTrigger>
            </Form>
          </Row>
        </div>
      </div>
    );
  }
}

//***********************************************************************
CustomPlotLabels.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  updatePlotTitle: PropTypes.func,
  plotTitle: PropTypes.string,
};

export default withTranslation()(CustomPlotLabels);
