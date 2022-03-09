import React from "react";
import {Alert} from "react-bootstrap";
import CoordInputPanel from "./CoordInputPanel.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";
import Icon from "./lib/Icon.jsx";
import {Button} from "react-bootstrap";

class EnterPoint extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      coordinate: [],
      addPointCoordModal: false,
      lastAdded :null
    };
  this.onAdd = this.onAdd.bind(this);
  }

  setCoordData(state, id) {
    const newState = this.state;
    newState.coordinate[0] = state.coordinate[0]; // Lat
    newState.coordinate[1] = state.coordinate[1]; // Long
    this.setState(newState);
    this.props.setCoordData(newState);
    if( (this.state.coordinate[0]) && (this.state.coordinate[1]) ){
      this.setState({addPointCoordModal:true})
    }
  }

  onAdd () {
    var newState = this.state;
    this.setState(prevState => ({
      coordinate: [prevState.coordinate, newState]
    }))
    this.props.addCoordData(newState, this.props.id); // Update Added List
    this.setState({lastAdded:this.state.coordinate})
  }

  render() {
    return (
      <div className="EnterPoint">
        <Alert bsStyle="warning">
          {_("Please enter numerical values. Example: 3.14, or 314e-2, or 0.0314E+2.")}
        </Alert>
        <CoordInputPanel
          header={_("Lat/Long Pair")}
          setCoordData={this.setCoordData.bind(this)}
          key ={this.state.lastAdded}
        />
        <Button 
          bsStyle="primary"
          disabled  = {!this.state.addPointCoordModal}
          onClick={this.onAdd}>
          <Icon icon="check" /> Add
        </Button>            
      </div>
    );
  }
}

//***********************************************************************
EnterPoint.propTypes = {
  setCoordData: PropTypes.func,
};

export default withTranslation()(EnterPoint);