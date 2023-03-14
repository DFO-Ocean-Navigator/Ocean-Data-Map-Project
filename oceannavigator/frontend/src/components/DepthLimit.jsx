import React from "react";
import NumberBox from "./NumberBox.jsx";
import {Form} from "react-bootstrap";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

class DepthLimit extends React.Component {
  constructor(props) {
    super(props);
        
    if (isNaN(this.props.state) || this.props.state == false) {
      this.state = {
        limit: false,
        value: 200,
      };
    } else {
      this.state = {
        limit: true,
        value: parseInt(this.props.state),
      };
    }

    // Function bindings
    this.enableChecked = this.enableChecked.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }
  
  enableChecked(e) {
    this.setState({
      limit: e.target.checked,
    });
    if (e.target.checked) {
      this.props.onUpdate(this.props.id, this.state.value);
    } else {
      this.props.onUpdate(this.props.id, false);
    }
  }

  onUpdate(key, value) {
    this.props.onUpdate(this.props.id, value);
  }

  updateParent() {
    this.props.onUpdate(this.props.id, this.state.value);
  }

  render() {
    _("Depth Limit");
    _("Limit Depth");
    return (
      <div className='DepthLimit input'>
        <h1>{_("Depth Limit")}</h1>

        <Form.Check onChange={this.enableChecked}>
          {_("Limit Depth")}
        </Form.Check>
        <div style={{ "display": this.state.limit ? "block" : "none" }}>
          <NumberBox
            key='depth'
            id='depth'
            state={this.state.value}
            onUpdate={this.onUpdate}
            title={_("Depth Limit")}
          />
        </div>
      </div>
    );
  }
}

//***********************************************************************
DepthLimit.propTypes = {
  onUpdate: PropTypes.func,
  id: PropTypes.string,
  state: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
};

export default withTranslation()(DepthLimit);
