import React from "react";
import ComboBox from "./ComboBox.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class ObservationSelector extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: {
        ship: [],
        trip: [],
      },
      ship: props.state.ship,
      trip: props.state.trip,
    };
  }

  // Load data
  componentDidMount() {
    $.ajax({
      url: "/api/observation/meta.json",
      dataType: "json",
      success: function(data) {
        this.setState({
          data: data,
        });
      }.bind(this),
      error: function(r, status, err) {
        console.error("/api/observation/meta.json", status, err.toString());
      },
    });
  }

  onUpdate(keys, values) {
    const newState = {
      ship: this.state.ship,
      trip: this.state.trip,
    };
    this.props.select(newState);
    for (let i = 0; i < keys.length; i++) {
      newState[keys[i]] = values[i];
    }

    this.setState(newState);
  }

  render() {
    const ship = this.state.data.ship.map(function(o) {
      return { id: o, value: o, };
    });
    const trip = this.state.data.trip.map(function(o) {
      return { id: o, value: o, };
    });
    _("Ship");
    _("Trip");
    return (
      <div className='ObservationSelector'>
        <div className='inputs'>
          <ComboBox
            key='ship'
            id='ship'
            state={this.state.ship}
            multiple
            title={_("Ship")}
            data={ship}
            onUpdate={this.onUpdate.bind(this)}
          />
          <ComboBox
            key='trip'
            id='trip'
            state={this.state.trip}
            multiple
            title={_("Trip")}
            data={trip}
            onUpdate={this.onUpdate.bind(this)}
          />
        </div>
      </div>
    );
  }
}

//***********************************************************************
ObservationSelector.propTypes = {
  select: PropTypes.func,
  state: PropTypes.object,
  ship: PropTypes.array,
  trip: PropTypes.array,
};
