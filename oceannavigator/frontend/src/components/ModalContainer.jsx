import React from "react";
import PropTypes from "prop-types";

import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import DrifterWindow from "./DrifterWindow.jsx";
import Class4Window from "./Class4Window.jsx";

const i18n = require("../i18n.js");

function formatLatLon(latitude, longitude) {
    let formatted = "";
    formatted += Math.abs(latitude).toFixed(4) + " ";
    formatted += (latitude >= 0) ? "N" : "S";
    formatted += ", ";
    formatted += Math.abs(longitude).toFixed(4) + " ";
    formatted += (longitude >= 0) ? "E" : "W";
    
    return formatted;
  }

export default class ModalContainer extends React.Component {
  constructor(props) {
    super(props);
    
  }

  render() {    
    
    let layer = Object.keys(this.props.data)[0]
    let modalTitle = ''
    let modalContent = ''

    switch(this.props.modal) {
        case "point":
        modalContent = (
          <PointWindow
            data={this.props.data}
            //dataset={this.props.data[layer]['dataset']}
            //quantum={this.props.data[layer]['quantum']}
            point={this.props.point}
            //variable={this.props.data[layer]['variable']}
            //depth={this.props.data[layer]['depth']}
            //time={this.props.data[layer].time} // ????
            //starttime={this.props.data[layer].time} // ????
            //scale={this.props.data[layer]['scale']}
            //colormap={this.props.data[layer]['colourmap']}
            names={this.props.names}
            onUpdate={this.props.onUpdate}
            init={this.props.init}
            dataset_compare={this.props.dataset_compare}
            //dataset_1={this.props.dataset_1}
            action={this.props.action}
            showHelp={this.props.toggleCompareHelp}
            swapViews={this.props.swapViews}
          />
        );
        modalTitle = formatLatLon(
          this.props.point[0][0],
          this.props.point[0][1]
        );
        break;
      case "line":
        modalContent = (
          <LineWindow
            dataset_0={this.props.data[layer]['dataset']}
            quantum={this.props.data[layer]['quantum']}
            line={this.props.data[layer].line}
            variable={this.props.variable}
            depth={this.props.data[layer].depth}
            time={this.props.data[layer].time}
            starttime={this.props.data[layer].time}
            scale={this.props.data[layer].scale}
            scale_1={this.props.data[layer].scale}
            colormap={this.props.data[layer].colourmap}
            names={this.props.names}
            onUpdate={this.props.updateState}
            init={this.props.init}
            dataset_compare={this.props.dataset_compare}
            dataset_1={this.props.data[layer].dataset}
            action={this.props.action}
            showHelp={this.props.toggleCompareHelp}
            swapViews={this.props.swapViews}
          />
        );

        modalTitle = "(" + this.state.line[0].map(function(ll) {
          return formatLatLon(ll[0], ll[1]);
        }).join("), (") + ")";
        break;
      case "area":
        modalContent = (
          <AreaWindow
            dataset_0={this.state}
            area={this.state.area}
            scale={this.state.scale}
            scale_1={this.state.scale_1}
            colormap={this.state.colormap}
            names={this.state.names}
            depth={this.state.depth}
            projection={this.state.projection}
            variable={this.state.variable}
            onUpdate={this.updateState}
            init={this.state.subquery}
            dataset_compare={this.state.dataset_compare}
            dataset_1={this.state.dataset_1}
            showHelp={this.toggleCompareHelp}
            action={this.action}
            swapViews={this.swapViews}
            options={this.state.options}
          />
        );

        modalTitle = "";
        break;
      case "drifter":
        modalContent = (
          <DrifterWindow
            dataset={this.state.dataset}
            quantum={this.state.dataset_quantum}
            drifter={this.state.drifter}
            variable={this.state.variable}
            scale={this.state.scale}
            names={this.state.names}
            depth={this.state.depth}
            onUpdate={this.updateState}
            init={this.state.subquery}
            action={this.action}
          />
        );

        modalTitle = "";
        break;
      case "class4":
        modalContent = (
          <Class4Window
            class4id={this.state.class4}
            init={this.state.subquery}
            action={this.action}
          />
        );
        modalTitle = "";
        break;
    }

    return (
        <div>
            {modalContent}
        </div>
    );
  }
}

//***********************************************************************
ModalContainer.propTypes = {
    modal: PropTypes.string
};
