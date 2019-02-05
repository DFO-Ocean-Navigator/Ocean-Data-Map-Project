/* eslint react/no-deprecated: 0 */

import React from "react";
import $ from "jquery";
import jQuery from "jquery";
import {Modal, Button, FormControl} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class IceComboBox extends React.Component {
  constructor(props) {

    super(props);
    this._mounted = false;

    this.handleChange = this.handleChange.bind(this)
  }

  componentDidMount() {
    this._mounted = true;   //Component mounted
  }

  componentWillUnmount() {
    this._mounted = false;  //Component not mounted
  }

  handleChange(e) {
      this.props.localUpdate(this.props.current, e.target.value)
  }

  render() {
    const options = this.props.values.map(function(o) {
    
      var opts = {
        key: o,
        value: o,
      };


      //Checks if each value in data has id or value
    
      return React.createElement("option", opts, o);    //Creates Option that was found
    });

    return (
      <div key='ice' className='ComboBox input'>
        <FormControl
            componentClass="select"
            defaultValue='Failed to Load'
            onChange={this.handleChange}
            multiple={false}
        >
        {options}
        </FormControl>
      </div>
    );
    
  }
}

//***********************************************************************
IceComboBox.PropTypes = {
    key: PropTypes.string,
    values: PropTypes.array,
    current: PropTypes.string,
    localUpdate: PropTypes.string,
}