import React from "react";
import SelectBox from "./SelectBox.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

const PlotTypes = Object.freeze({
  "magnitude": 0,
  "parallel": 1,
  "perpendicular": 2,
});

export default class VelocitySelector extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      velocity_plots: [false, true, true] 
    };

    this.updatePlotType = this.updatePlotType.bind(this);

  }

  updatePlotType(id, checked) {
    
    if (checked !== this.state.velocity_plots[PlotTypes[id]]) {
      const temp = this.state.velocity_plots;
      temp[PlotTypes[id]] = checked;

      this.setState({
        velocity_plots: temp
      });

      this.props.updateSelectedPlots(this.state.velocity_plots);
    }
  }

  render() {

    return (
      <div>
        <SelectBox
          key='magnitude'
          state={this.state.velocity_plots[PlotTypes["magnitude"]]}
          id='magnitude'
          onUpdate={this.updatePlotType}
          title={_("Magnitude")}
        >
          {_("show_magnitude")}
        </SelectBox>  

        <SelectBox
          key='parallel'
          state={this.state.velocity_plots[PlotTypes["parallel"]]}
          id='parallel'
          onUpdate={this.updatePlotType}
          title={_("Parallel")}
        >
          {_("show_parallel")}
        </SelectBox>
        
        <SelectBox
          key='perpendicular'
          state={this.state.velocity_plots[PlotTypes["perpendicular"]]}
          id='perpendicular'
          onUpdate={this.updatePlotType}
          title={_("Perpendicular")}
        >
          {_("show_perpendicular")}
        </SelectBox>
      </div>

    );
  }
}

VelocitySelector.propTypes = {
  title: PropTypes.string,
  updateSelectedPlots: PropTypes.func,
};