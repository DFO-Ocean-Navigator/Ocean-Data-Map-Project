import React from "react";
import ComboBox from "./ComboBox.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class DrifterSelector extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      imei: [],
      wmo: [],
      deployment: [],
      imei_map: {},
      wmo_map: {},
      deployment_map: {},
    };

    // Function bindings
    this.onUpdate = this.onUpdate.bind(this);
  }

  componentDidMount() {
    this._mounted = true;

    $.ajax({
      url: "/api/drifters/meta.json",
      dataType: "json",
      success: function(data) {
        const imei = Object.keys(data.imei).filter(function (k) {
          const list = data.imei[k];
          return list.every(function (e) {
            return $.inArray(e, this.props.state) != -1;
          }.bind(this));
        }.bind(this));
        const wmo = Object.keys(data.wmo).filter(function (k) {
          const list = data.wmo[k];
          return list.every(function (e) {
            return $.inArray(e, this.props.state) != -1;
          }.bind(this));
        }.bind(this));
        const deployment = Object.keys(data.deployment).filter(function (k) {
          const list = data.deployment[k];
          return list.every(function (e) {
            return $.inArray(e, this.props.state) != -1;
          }.bind(this));
        }.bind(this));
        this.setState({
          imei_map: data["imei"],
          wmo_map: data["wmo"],
          deployment_map: data["deployment"],
          imei: imei,
          wmo: wmo,
          deployment: deployment,
        });

      }.bind(this),
      error: function(r, status, err) {
        console.error("/api/drifters/meta.json", status, err.toString());
      },
    });
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  onUpdate(keys, values) {
    const newState = {
      imei: this.state.imei,
      wmo: this.state.wmo,
      deployment: this.state.deployment,
    };
    for (let i = 0; i < keys.length; i++) {
      newState[keys[i]] = values[i];
    }

    this.props.select(Array.from(new Set([].concat.apply([], [].concat(
      newState.imei.map(function (o) {
        return this.state.imei_map[o];
      }.bind(this)),
      newState.wmo.map(function (o) {
        return this.state.wmo_map[o];
      }.bind(this)),
      newState.deployment.map(function (o) {
        return this.state.deployment_map[o];
      }.bind(this))
    )))));
    this.setState(newState);
  }

  render() {
    const imei = Array.from(
      new Set(
        Object.keys(this.state.imei_map)
      )
    ).sort().map(function(o) {
      return {
        id: o,
        value: o
      };
    });
    const wmo = Array.from(
      new Set(
        Object.keys(this.state.wmo_map)
      )
    ).sort().map(function(o) {
      return {
        id: o,
        value: o
      };
    });
    const deployment = Array.from(
      new Set(
        Object.keys(this.state.deployment_map)
      )
    ).sort().map(function(o) {
      return {
        id: o,
        value: o
      };
    });

    _("IMEI");
    _("WMO");
    _("Deployment");
    
    return (
      <div className='DrifterSelector'>
        <div className='inputs'>
          <ComboBox
            key='imei'
            id='imei'
            state={this.state.imei}
            multiple
            title={_("IMEI")}
            data={imei}
            onUpdate={this.onUpdate}
          />
          <ComboBox
            key='wmo'
            id='wmo'
            state={this.state.wmo}
            multiple
            title={_("WMO")}
            data={wmo}
            onUpdate={this.onUpdate}
          />
          <ComboBox
            key='deployment'
            id='deployment'
            state={this.state.deployment}
            multiple
            title={_("Deployment")}
            data={deployment}
            onUpdate={this.onUpdate}
          />
        </div>
      </div>
    );
  }
}

//***********************************************************************
DrifterSelector.propTypes = {
  select: PropTypes.func,
  state: PropTypes.array,
};
