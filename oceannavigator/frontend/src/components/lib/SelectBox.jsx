import React from "react";
import { FormGroup, ControlLabel, FormControl, Modal, Button } from "react-bootstrap";
import PropTypes from "prop-types";

import Icon from "./Icon";

import { withTranslation } from "react-i18next";

const fastEqual = require("fast-deep-equal/es6/react");

export class SelectBox extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showHelp: false,
    };

    this.toggleShowHelp = this.toggleShowHelp.bind(this);
  }

  toggleShowHelp() {
    this.setState(prevState => ({
      showHelp: !prevState.showHelp,
    }));
  }

  shouldComponentUpdate(nextProps, nextState) {
    return !fastEqual(this.props, nextProps) ||
      !fastEqual(this.state, nextState);
  }

  render() {
    let options = null;
    if (this.props.options) {
      options = this.props.options.map((option) => {
        return (
          <option
            key={`option-${option.id}`}
            value={option.id}
          >
            {option.value}
          </option>
        );
      });
    }

    const disabled = !Array.isArray(this.props.options) ||
                     !this.props.options.length;

    return (
      <>
        <FormGroup controlid={`formgroup-${this.props.id}-selectbox`}>
          <ControlLabel>{this.props.label}</ControlLabel>
          
          <Button
            onClick={this.toggleShowHelp}
            bsStyle="default"
            bsSize="xsmall"
            style={{"display": this.props.helpContent ? "block" : "none", "float": "right"}}
          >
            ?
          </Button>

          <FormControl
            componentClass="select"
            name={this.props.name}
            placeholder={disabled ? _("Loading...") : this.props.placeholder}
            onChange={(e) => {
              if (this.props.multiple) {
                this.props.onChange(e.target.name, e.target.selectedOptions);
              }
              else {
                this.props.onChange(e.target.name, e.target.value);
              }
            }}
            disabled={disabled}
            value={this.props.selected}
            multiple={this.props.multiple}
          >
            {options}
          </FormControl>
        </FormGroup>

        <Modal
          show={this.state.showHelp}
          onHide={this.toggleShowHelp}
          bsSize="large"
          dialogClassName="helpdialog"
          backdrop={true}
        >
          <Modal.Header closeButton closeLabel={_("Close")}>
            <Modal.Title>{_("Help")}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.props.helpContent}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.toggleShowHelp}>
              <Icon icon="close"/> {_("Close")}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

//***********************************************************************
SelectBox.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  multiple: PropTypes.bool,
  helpContent: PropTypes.arrayOf(PropTypes.object),
};

SelectBox.defaultProps = {
  multiple: false,
  helpContent: null,
};

export default withTranslation()(SelectBox);
