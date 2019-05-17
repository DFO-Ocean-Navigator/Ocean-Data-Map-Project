/* eslint react/no-deprecated: 0 */

import React from "react";
import $ from "jquery";
import jQuery from "jquery";
import {Modal, Button, FormControl} from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class ComboBox extends React.Component {
  constructor(props) {

    super(props);
    
    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      data: [],
      url: null
    };

    // Function bindings
    this.handleChange = this.handleChange.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.closeHelp = this.closeHelp.bind(this);
  }

  componentDidMount() {
    this._mounted = true;   //Component mounted
    this.populate(this.props);
  }

  componentWillUnmount() {
    this._mounted = false;  //Component not mounted
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.url !== this.state.url || nextProps.data !== this.props.data) {
      this.populate(nextProps);
    }
  }

  // Fired when new option is selected
  handleChange(e) {
    let value = e.target.value; // Name of new selected option

    if (this.props.multiple) {
      value = [];
      const options = e.target.options;
      
      for (let i = 0; i < options.length; ++i) {
        if (options[i].selected) {
          value.push(options[i].value);
        }
      }
    }
    
    if (typeof(this.props.onUpdate) === "function") {
      // State key ID: "variable", "dataset", "projection", etc.
      const keys = [this.props.id];
      // And their associative values
      const values = [value];
      
      // Get index of selected option
      if (e.target.selectedIndex != -1) {
        const dataset = e.target.options[e.target.selectedIndex].dataset;

        // Construct keys and their associative value to be sent to 
        // OceanNavigator state
        for (let key in dataset) {
          
          // State key name ("variable_scale", "dataset_help", etc)
          keys.push(this.props.id + "_" + key);

          // State key value ("-5,30", "Sample dataset help...")
          values.push(dataset[key]);
        }
      }
      // Update OceanNavigator state
      this.props.onUpdate(keys, values);
    }
  }

  // Populates Drop down menu
  populate(props) {
    
    this.setState({
      url: props.url
    });

    
    if ("url" in props && "" !== props.url) /* Checks if URL exists and is not empty */ {
      $.ajax({
        url: props.url,
        dataType: "json",
        cache: true,
        
        //If server returns status code of 200 / it worked - Ajax call successful
        //
        // data filled by ajax
        //
        success: function (data) {
          if (this._mounted) {  //Combobox is mounted

            const ids = data.map(function (d) { return d.id;});  //stores data id
  
            if (
              (this.props.state == "" && typeof(this.props.state) == "string") ||
              this.props.state == "none"
            ) {
              if (jQuery.inArray("none", ids) == -1) {
                data.splice(0, 0, { "id": "none", "value": _("None") });
              }
            }
            this.setState({
              data: data,
            });

            const a = data.map(function (x) {
              return x.id;
            });

            let value = this.props.state;
            const floatValue = parseFloat(value);

            let notInList = false;
            if (value instanceof Array) {
              notInList = value.map(
                (el) => (
                  jQuery.inArray(el, a) == -1 &&
                jQuery.inArray(parseFloat(el), a) == -1
                )
              ).reduce((prev, cur) => prev || cur, false);
            } else {
              notInList = (
                jQuery.inArray(this.props.state, a) == -1 &&
                jQuery.inArray(floatValue, a) == -1
              );
            }
            if (
              notInList ||
            (this.props.state == "" && data.length > 0) ||
            this.props.state == "all"
            ) {
              if (props.multiple) {
                if (value == "all") {
                  value = data.map(function (d) {
                    return d.id;
                  });
                } else if (!Array.isArray(value)) {
                  value = [value];
                }
              }
            } else {
              if (data.length == 0) {
                value = props.def;
              } else if (data.length == 1) {
                value = ids[0];
              } else if (props.multiple && !Array.isArray(this.props.state)) {
                value = [this.props.state];
              } else {
                value = this.props.state;
              }
            }
            if (
              data.length > 0 &&
            !props.multiple &&
            jQuery.inArray(value, a) == -1 &&
            jQuery.inArray(floatValue, a) == -1
            ) {
              if (jQuery.inArray(0, a) != -1) {
                value = 0;
              } else {
                value = data[0].id;
              }
            }
            if (typeof (this.props.onUpdate) === "function") {
              props.onUpdate(props.id, value);
              if (a.indexOf(value) != -1) {
                const d = data[a.indexOf(value)];
                for (var key in d) {
                  if (d.hasOwnProperty(key) && key != "id" && key != "value") {
                    this.props.onUpdate(this.props.id + "_" + key, d[key]);
                  }
                }
              }
            }
          }
        }.bind(this),
        
        // On fail...
        error: function (xhr, status, err) {  
          if (this._mounted) {
            console.error(props.url, status, err.toString());
          }
        }.bind(this)
      });
    } else {
      this.setState({
        data: props.data
      });
      const value = this.props.state;

      if (typeof (props.onUpdate) === "function") {
        for (let i = 0; i < props.data.length; i++) {
          const d = props.data[i];
          if (d.id == value) {
            for (var key in d) {
              if (d.hasOwnProperty(key) && key != "id" && key != "value") {
                props.onUpdate(props.id + "_" + key, d[key]);
              }
            }
          }
        }
      }
    }
  }

  //Small help icon - OPENS
  showHelp() {
    this.setState({
      showHelp: true
    });
  }

  //Small help icon - CLOSES
  closeHelp() {
    this.setState({
      showHelp: false
    });
  }

  render() {

    //Creates one drop down function for each option sent back
    const options = this.state.data.map(function(o) {
      var opts = {
        key: o.id,
        value: o.id,
      };


      //Checks if each value in data has id or value
      for (let key in o) {
        if (key == "id" || key == "value") {
          continue;
        }
        if (o.hasOwnProperty(key)) {
          opts["data-" + key] = o[key];
        }
      }
      return React.createElement("option", opts, o.value);    //Creates Option that was found
    });

    if (this.state.data.length > 1) {
      var value = this.props.state;
      if (this.props.multiple && value == "all") {
        value = this.state.data.map(function(d) {
          return d.id;
        });
      }
      if (this.props.multiple && !Array.isArray(value)) {
        value = [value];
      }
      if (!this.props.multiple && Array.isArray(value)) {
        value = value[0];
      }

      const hasHelp =
        (this.props.children != null && this.props.children.length > 0) ||
        this.state.data.slice(-1)[0].hasOwnProperty("help");

      var helpOptions = [];
      if (this.state.data.slice(-1)[0].hasOwnProperty("help")) {
        helpOptions = this.state.data.map(function(d) {
          return (
            <p key={d.id}><em>{d.value}</em>:
              <span dangerouslySetInnerHTML={{ __html: d.help}} />
            </p>
          );
        });
      }

      return (
        <div key={this.props.url} className='ComboBox input'>
          <h1>
            {this.props.title}
            <span
              onClick={this.showHelp}
              style={{"display": hasHelp ? "block" : "none"}}
            >?</span>
          </h1>

          <Modal
            show={this.state.showHelp}
            onHide={this.closeHelp}
            bsSize="large"
            dialogClassName="helpdialog"
            backdrop={true}
          >
            <Modal.Header closeButton closeLabel={_("Close")}>
              <Modal.Title>{
                _("titlehelp", {title: this.props.title})
              }</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {this.props.children}
              {helpOptions}
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.closeHelp}><Icon icon="close"/> {_("Close")}</Button>
            </Modal.Footer>
          </Modal>

          <FormControl componentClass="select"
            size={
              Math.min(10, this.props.multiple ? this.state.data.length : 1)
            }
            value={value}
            onChange={this.handleChange}
            multiple={this.props.multiple}
          >
            {options}
          </FormControl>
        </div>
      );
    } else {
      return null;
    }
  }
}

//***********************************************************************
ComboBox.propTypes = {
  multiple: PropTypes.bool,
  title: PropTypes.string,
  data: PropTypes.array,
  state: PropTypes.oneOfType([PropTypes.string, 
    PropTypes.number, 
    PropTypes.array
  ]),
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  url: PropTypes.string,
};

