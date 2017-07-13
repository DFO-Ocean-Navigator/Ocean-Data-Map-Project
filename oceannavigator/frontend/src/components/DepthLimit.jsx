import React from "react";
import NumberBox from "./NumberBox.jsx";
import {Checkbox} from "react-bootstrap";

const i18n = require("../i18n.js");

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

        <Checkbox onChange={this.enableChecked.bind(this)}>
          {_("Limit Depth")}
        </Checkbox>
        <div style={{ "display": this.state.limit ? "block" : "none" }}>
          <NumberBox
            key='depth'
            id='depth'
            state={this.state.value}
            onUpdate={this.onUpdate.bind(this)}
            title={_("Depth Limit")}
          />
        </div>
      </div>
    );
  }
}

export default DepthLimit;
