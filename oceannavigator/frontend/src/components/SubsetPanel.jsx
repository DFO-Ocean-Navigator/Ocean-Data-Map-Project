import React from "react";
import {Nav, NavItem, Panel, Row,  Col, Button, 
    FormControl, FormGroup, ControlLabel, DropdownButton, MenuItem} from "react-bootstrap";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import TimePicker from "./TimePicker.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";
import {GetVariablesPromise} from "../remote/OceanNavigator.js";
const stringify = require("fast-stable-stringify");


export default class SubsetPanel extends React.Component {
    constructor(props) {
      super(props);
      this.state = {

      }
    }

    render(){
        const subsetPanel = (<Panel
            key='subset'
            defaultExpanded
            bsStyle='primary'
          >
            <Panel.Heading>{("Subset")}</Panel.Heading>
            <Panel.Collapse>
              <Panel.Body>
                <form>   
                <h1> Test </h1>      
       
                </form>
              </Panel.Body>
            </Panel.Collapse>
          </Panel>
          );
          return (
            <div>     
            {subsetPanel} 
            </div>
          );
    }
    
}
