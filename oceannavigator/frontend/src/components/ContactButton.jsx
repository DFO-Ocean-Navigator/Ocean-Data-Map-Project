import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel, Button, Row, Col, Tabs, Tab} from "react-bootstrap";
import Icon from "./Icon.jsx";
import Options from "./Options.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class ContactButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showing: true,
      displayState: 'Add',
    };

    // Function bindings
    this.toggle = this.toggle.bind(this);
  }

  handleTabs(key) {
    this.setState({currentTab: key,});
  }



  toggle() {
    switch(this.state.showing) {
        case true:

            this.props.toggleTraffic(this.props.name, !this.state.showing);
            this.setState({
                showing: false,
            });
            break;

        case false:
                
            this.props.toggleTraffic(this.props.name, !this.state.showing);

            this.setState({
                showing: true,
            });
            break;
    }
  }

  render() {

    let add_remove = this.state.showing ? 'Add' : 'Remove';
    
    return (
        <div>
            <span>
            <div>
                {this.props.name}
            </div>
            <Button onClick={this.toggle}>
                {add_remove}
            </Button>
            </span>
        </div>
    );
  }
}

//***********************************************************************
ContactButton.propTypes = {
  name: PropTypes.string,
  toggleTraffic: PropTypes.func,
};