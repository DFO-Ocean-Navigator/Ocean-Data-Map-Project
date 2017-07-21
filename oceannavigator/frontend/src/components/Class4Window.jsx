import React from "react";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import SelectBox from "./SelectBox.jsx";
import ImageSize from "./ImageSize.jsx";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

class Class4Window extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      forecast: "best",
      showmap: true,
      climatology: false,
      error: "none",
      size: "10x7",
      dpi: 72,
      models: [],
    };

    if (props.init != null) {
      $.extend(this.state, props.init);
    }
  }

  onLocalUpdate(key, value) {
    var newState = {};
    if (typeof(key) === "string") {
      newState[key] = value;
    } else {
      for (var i = 0; i < key.length; i++) {
        newState[key[i]] = value[i];
      }
    }
    this.setState(newState);
  }

  render() {
    const plot_query = {
      type: "class4",
      forecast: this.state.forecast,
      class4id: this.props.class4id,
      showmap: this.state.showmap,
      climatology: this.state.climatology,
      error: this.state.error,
      size: this.state.size,
      dpi: this.state.dpi,
      models: this.state.models,
    };
    const error_options = [
      {
        id: "none",
        value: _("None"),
      },
      {
        id: "observation",
        value: _("Value - Observation"),
      },
      {
        id: "climatology",
        value: _("Value - Climatology"),
      },
    ];

    _("Forecast");
    _("Show Location");
    _("Show Climatology");
    _("Additional Models");
    _("Show Error");
    _("Saved Image Size");

    return (
      <div className='Class4Window Window'>
        <div className='content'>
          <div className='inputs'>
            <ComboBox
              key='forecast'
              id='forecast'
              state={this.state.forecast}
              def=''
              url={
                "/api/class4/forecasts/" + this.props.class4id
              }
              title={_("Forecast")}
              onUpdate={this.onLocalUpdate.bind(this)}
            />
            <SelectBox
              key='showmap'
              id='showmap'
              state={this.state.showmap}
              onUpdate={this.onLocalUpdate.bind(this)}
              title={_("Show Location")}>{_("showmap_help")}</SelectBox>
            <SelectBox
              key='climatology'
              id='climatology'
              state={this.state.climatology}
              onUpdate={this.onLocalUpdate.bind(this)}
              title={_("Show Climatology")}>{_("climatology_help")}</SelectBox>
            <ComboBox
              key='models'
              id='models'
              state={this.state.models}
              multiple
              onUpdate={this.onLocalUpdate.bind(this)}
              url={"/api/class4/models/" + this.props.class4id}
              title={_("Additional Models")} />
            <ComboBox
              key='error'
              id='error'
              state={this.state.error}
              def=''
              data={error_options}
              title={_("Show Error")}
              onUpdate={this.onLocalUpdate.bind(this)} />
            <ImageSize
              key='size'
              id='size'
              state={this.state.size}
              onUpdate={this.onLocalUpdate.bind(this)}
              title={_("Saved Image Size")} />
          </div>
          <PlotImage
            query={plot_query}
            permlink={this.props.generatePermLink(this.state)}/>
          <br className='clear' />
        </div>
      </div>
    );
  }
}

//***********************************************************************
Class4Window.propTypes = {
  generatePermLink: PropTypes.func,
  class4id: PropTypes.object,
  init: PropTypes.object,
};

export default Class4Window;
