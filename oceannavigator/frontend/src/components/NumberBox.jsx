import React from "react";
import {Modal, Button} from "react-bootstrap";
import NumericInput from "react-numeric-input";
import Icon from "./Icon.jsx";

const i18n = require("../i18n.js");

class NumberBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: this.props.state
    };
  }
  updateParent() {
    this.props.onUpdate(this.props.id, this.state.value);
  }
  changed(num, str) {
    clearTimeout(this.timeout);
    this.setState({
      value: num,
    });
    this.timeout = setTimeout(this.updateParent.bind(this), 500);
  }
  keyPress(e) {
    var key = e.which || e.keyCode;
    if (key == 13) {
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
            onClick={this.showHelp.bind(this)}
            style={{"display": hasHelp ?  "block" : "none"}}
          >?</span>
        </h1>

        <Modal
          show={this.state.showHelp}
          onHide={this.closeHelp.bind(this)}
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
            <Button onClick={this.closeHelp.bind(this)}><Icon icon="close" /> {_("Close")}</Button>
          </Modal.Footer>
        </Modal>

        <table>
          <tbody>
            <tr>
              <td>
                <label htmlFor={this.props.id}>{_("Value:")}</label>
              </td>
              <td>
                <NumericInput
                  value={this.state.value}
                  onChange={this.changed.bind(this)}
                  onBlur={this.updateParent.bind(this)}
                  onKeyPress={this.keyPress.bind(this)}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default NumberBox;
