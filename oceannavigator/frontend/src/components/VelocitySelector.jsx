import React from "react";
import CheckBox from "./lib/CheckBox.jsx";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

const PlotTypes = Object.freeze({
  "magnitude": 0,
  "parallel": 1,
  "perpendicular": 2,
});

class VelocitySelector extends React.Component {

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
        <CheckBox
          key='magnitude'
          checked={this.state.velocity_plots[PlotTypes["magnitude"]]}
          id='magnitude'
          onUpdate={this.updatePlotType}
          title={_("Magnitude")}
        >
          {_("show_magnitude")}
        </CheckBox>  

        <CheckBox
          key='parallel'
          checked={this.state.velocity_plots[PlotTypes["parallel"]]}
          id='parallel'
          onUpdate={this.updatePlotType}
          title={_("Parallel")}
        >
          {_("show_parallel")}
        </CheckBox>
        
        <CheckBox
          key='perpendicular'
          checked={this.state.velocity_plots[PlotTypes["perpendicular"]]}
          id='perpendicular'
          onUpdate={this.updatePlotType}
          title={_("Perpendicular")}
        >
          {_("show_perpendicular")}
        </CheckBox>
      </div>

    );
  }
}

VelocitySelector.propTypes = {
  title: PropTypes.string,
  updateSelectedPlots: PropTypes.func,
};

export default withTranslation()(VelocitySelector);
