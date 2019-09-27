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

    let id_list = []
    let value_list = []
    
    for (let elem in this.props.data) {
      if (elem['id'] === undefined || elem['value'] === undefined) {
      } else if (this.props.envType != undefined) {
        if (elem['envType'] === this.props.envType) {
          id_list.push(elem['id'])
          value_list.push(elem['value'])
        }
      } else {
        id_list.push(elem['id'])
        value_list.push(elem['value'])
      }
    }
    let idx_list = new Array(value_list.length)
    for (let i = 0; i < value_list.length; i += 1) {
      idx_list.push(i)
    }
    //for (let i = 0; i < value_list.length; i += 1) {
    
    //}
    if (id_list === [] || value_list === []) {
      id_list = ['ERROR']
      value_list = ['ERROR']
    }

    this.state = {
      id_list: id_list,
      idx_list: idx_list,
      value_list: value_list,
    }

    this._mounted = false;

    this.handleChange = this.handleChange.bind(this);
    this.updateValues = this.updateValues.bind(this);
  }

  updateValues() {
    let id_list = []
    let value_list = []
    for (let elem in this.props.data) {
      elem = this.props.data[elem]
      if (elem['id'] === undefined || elem['value'] === undefined) {
        console.error("Data empty or malformed")
      } else if (this.props.envType != undefined) {
        if (elem['envType'] === this.props.envType) {
          id_list.push(elem['id'])
          value_list.push(elem['value'])
        }
      } else {
        id_list.push(elem['id'])
        value_list.push(elem['value'])
      }
    }
    let idx_list = new Array(value_list.length)
    for (let i = 0; i < value_list.length; i += 1) {
      idx_list.push(i)
    }
    if (id_list === [] || value_list === []) {
      console.error("NO DATA TO LOAD")
      id_list = ['ERROR']
      value_list = ['ERROR']
    }
    this.setState({
      id_list: id_list,
      idx_list: idx_list,
      value_list: value_list,
    })
  }

  componentDidMount() {
    this._mounted = true;   //Component mounted
    this.updateValues();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.data != prevProps.data) {
      this.updateValues();
    }
  }

  componentWillUnmount() {
    this._mounted = false;  //Component not mounted
  }

  handleChange(e) {
      this.props.localUpdate(this.props.name, e.target.value)
  }

  render() {
    
    let self = this;
    const options = this.state.idx_list.map(function(o) {
      var opts = {
        key: self.state.id_list[o],
        value: self.state.id_list[o],
      };


      //Checks if each value in data has id or value
    
      return React.createElement("option", opts, self.state.value_list[o]);    //Creates Option that was found
    });

    let title = undefined;
    if (this.props.title !== undefined) {
      title = <h1 className='comboBoxTitle'>{_(this.props.title)}</h1>;
    }

    let div_class;
    if (this.props.className === undefined) {
      div_class = 'ComboBox input'
    } else {
      div_class = 'ComboBox input ' + this.props.className
    }

    return (
      <div key='ice' className={div_class}>
        {title}
        <FormControl
            componentClass="select"
            value={this.props.current}
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
IceComboBox.propTypes = {
    data: PropTypes.array,
    current: PropTypes.string,
    localUpdate: PropTypes.func,
}