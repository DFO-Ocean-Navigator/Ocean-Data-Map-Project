import React from "react";
import ComboBox from "./ComboBox.jsx";
import SelectBox from "./SelectBox.jsx";
var i18n = require("../i18n.js");

class ContourSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      levels: "-10,0,10",
    };
  }

  onUpdate(key, value) {
    if (!$.isArray(key)) {
      key = [key];
      value = [value];
    }

    var state = {};
    for (var i = 0; i < key.length; i++) {
      if (!this.props.state.hasOwnProperty(key[i])) {
        continue;
      }
      state[key[i]] = value[i];

    }
    var newState = jQuery.extend({}, this.props.state, state);
    this.props.onUpdate(this.props.id, newState);
  }

  levelsChanged(e) {
    clearTimeout(this.timeout);
    this.setState({
      levels: e.target.value,
    });
    this.timeout = setTimeout(this.updateLevels.bind(this), 500);
  }

  updateLevels() {
    clearTimeout(this.timeout);
    this.onUpdate("levels", this.state.levels);
  }

  onUpdateAuto(key, value) {
    if (value) {
      this.onUpdate("levels", "auto");
    } else {
      this.updateLevels();
    }
  }

  render() {
    var auto = this.props.state.levels == "auto";
    _("Crosshatch");
    _("Colourmap");
    _("Show Legend");
    _("Auto Levels");
    return (
            <div className='ContourSelector input'>
                <ComboBox id='variable' state={this.props.state.variable} def='' onUpdate={this.onUpdate.bind(this)} url={"/api/variables/?dataset=" + this.props.dataset} title={this.props.title}>{this.props.children}</ComboBox>
                <div className='sub' style={{"display": (this.props.state.variable == "none" || this.props.state.variable == "") ? "none" : "block"}}>
                    <SelectBox key='hatch' id='hatch' state={this.props.state.hatch} onUpdate={this.onUpdate.bind(this)} title={_("Crosshatch")}></SelectBox>
                    <div style={{"display": this.props.state.hatch ? "none" : "block"}}>
                        <ComboBox key='colormap' id='colormap' state={this.props.state.colormap} def='' onUpdate={this.onUpdate.bind(this)} url='/api/colormaps/' title={_("Colourmap")}>There are several colourmaps available. This tool tries to pick an appropriate default based on the variable type (Default For Variable). If you want to use any of the others, they are all selectable.<img src="/colormaps.png" /></ComboBox>
                    </div>
                    <SelectBox key='legend' id='legend' state={this.props.state.legend} onUpdate={this.onUpdate.bind(this)} title={_("Show Legend")}></SelectBox>
                    <h1>Levels</h1>
                    <SelectBox key='autolevels' id='autolevels' state={auto} onUpdate={this.onUpdateAuto.bind(this)} title={_("Auto Levels")}></SelectBox>
                    <input type="text" style={{"display": this.state.autolevels ? "none" : "inline-block"}} value={this.state.levels} onChange={this.levelsChanged.bind(this)} onBlur={this.updateLevels.bind(this)} />
                </div>
            </div>
    );
  }
}

export default ContourSelector;

