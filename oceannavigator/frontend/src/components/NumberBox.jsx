import React from "react";
import {Modal, Button} from "react-bootstrap";
// import NumericInput from "react-numeric-input";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class NumberBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.state
    };

    // Function bindings
    this.updateParent = this.updateParent.bind(this);
    this.changed = this.changed.bind(this);
    this.keyPress = this.keyPress.bind(this);
    this.closeHelp = this.closeHelp.bind(this);
    this.showHelp = this.showHelp.bind(this);
  }

  updateParent() {
    this.props.onUpdate(this.props.id, this.state.value);
  }

  changed(num, str) {
    clearTimeout(this.timeout);
    
    this.setState({
      value: num,
    });

    this.timeout = setTimeout(this.updateParent, 1250);
  }

  keyPress(e) {
    var key = e.which || e.keyCode;
    if (key === 13) {
      this.changed();
      this.updateParent();
      return false;
    } else {
      return true;
    }
  }

  closeHelp() {
    this.setState({
      showHelp: false
    });
  }

  showHelp() {
    this.setState({
      showHelp: true
    });
  }

  render() {
    var hasHelp = (
      this.props.children != null &&
      this.props.children.length > 0
    );
    return (
      <div className='NumberBox input'>
        <h1>{this.props.title}
          <span
            onClick={this.showHelp}
            style={{"display": hasHelp ?  "block" : "none"}}
          >?</span>
        </h1>

        <Modal
          show={this.state.showHelp}
          onHide={this.closeHelp}
          bsSize="large"
          dialogClassName="helpdialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>{
              _("titlehelp", {title: this.props.title})
            }</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {this.props.children}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={this.closeHelp}><Icon icon="close" /> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor={this.props.id}>{_("Value:")}</label>
              </td>
              <td>
                <input
                  type="number"
                  value={this.state.value}
                  onChange={this.changed}
                  // onBlur={this.updateParent}
                  // onKeyPress={this.keyPress}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

//***********************************************************************
NumberBox.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.number,
};

export default withTranslation()(NumberBox);
