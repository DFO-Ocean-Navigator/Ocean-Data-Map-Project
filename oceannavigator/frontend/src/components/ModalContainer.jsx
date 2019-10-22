import React from "react";
import PropTypes from "prop-types";
import {Button} from 'react-bootstrap';
import PointWindow from "./PointWindow.jsx";
import LineWindow from "./LineWindow.jsx";
import AreaWindow from "./AreaWindow.jsx";
import DrifterWindow from "./DrifterWindow.jsx";
import Class4Window from "./Class4Window.jsx";
import SelectMapLayer from "./SelectMapLayer.jsx";

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

    console.warn("INIT: ", this.props.init)
    if (this.props.init !== undefined) {
      this.state = {
        selected: true,
      }
    } else {
      this.state = {
        selected: false,
        data: {},
        data_compare: {}
      }
    }

    this.selectLayer = this.selectLayer.bind(this);
    this.selectCompare = this.selectCompare.bind(this);
    this.apply = this.apply.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.urlData !== prevProps.urlData) {
      if (this.props.urlData !== undefined) {
        this.setState({
          selected: true,
          data: this.props.urlData
        })
      }
    }
  }

  selectLayer(data) {
    this.setState({
      data: data,
      //selected: true
    })
  }

  selectCompare(data) {
    this.setState({
      data_compare: data,
      dataset_compare: true,
    })
  }

  apply() {
    if (Object.keys(this.state.data).length === 0) {
      this.setState({
        data: this.state.data_compare,
        dataset_compare: false,
      }, () => {
        this.setState({
          selected: true
        })
      })
    } else {
      this.setState({
        selected: true
      })
    }
  }

  render() {

    let modalTitle = ''
    let modalContent = ''
    //let data = this.props.data['left']


    if (this.state.selected) {
      // Selects the type of Shape / Obs
      switch (this.props.modal) {
        case "point":
          modalContent = (
            <PointWindow
              data={this.state.data}  // Non compare data
              data_compare={this.state.data_compare !== undefined ? this.state.data_compare : {}}
              dataset_compare={this.state.dataset_compare}
              point={this.props.point}
              names={this.props.names}
              onUpdate={this.props.onUpdate}
              init={this.props.init}
              action={this.props.action}
              showHelp={this.props.showHelp}
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
              data={this.state.data}   // Non compare data
              data_compare={this.state.data_compare !== undefined ? this.state.data_compare : {}}
              dataset_compare={this.state.dataset_compare}
              line={this.props.line}
              names={this.props.names}
              onUpdate={this.props.updateState}
              init={this.props.init}
              action={this.props.action}
              showHelp={this.props.showHelp}
              swapViews={this.props.swapViews}
            />
          );

          modalTitle = "(" + this.props.line[0].map(function (ll) {
            return formatLatLon(ll[0], ll[1]);
          }).join("), (") + ")";
          break;
        case "area":
          modalContent = (
            <AreaWindow
              data={this.state.data}
              data_compare={this.state.data_compare !== undefined ? this.state.data_compare : {}}
              area={this.props.area}
              names={this.props.names}
              projection={this.props.projection}
              onUpdate={this.props.updateState}
              init={this.props.init}
              dataset_compare={this.state.dataset_compare}
              showHelp={this.props.showHelp}
              action={this.props.action}
              swapViews={this.props.swapViews}
              options={this.props.options}
            />
          );

          modalTitle = "";
          break;
        case "drifter":
          modalContent = (
            <DrifterWindow
              data={this.state.data}
              drifter={this.props.drifter}
              names={this.props.names}
              onUpdate={this.props.updateState}
              init={this.props.init}
              action={this.props.action}
            />
          );

          modalTitle = "";
          break;
        case "class4":
          modalContent = (
            <Class4Window
              dataset={this.state.data.dataset}
              class4id={this.props.class4}
              init={this.props.init}
              action={this.props.action}
            />
          );
          modalTitle = "";
          break;
      }

    } else if (this.props.map !== null) {
      modalContent = [<div>Unfortunately multi-layer plotting is not currently supported. Please select a layer before continuing</div>]
      
      modalContent.push(<SelectMapLayer
        map={this.props.map}
        name="Primary Layer:"
        select={this.selectLayer}
      ></SelectMapLayer>)
      
      modalContent.push(
        <SelectMapLayer
          map={this.props.map2}
          name="Comparison Layer:"
          select={this.selectCompare}
        ></SelectMapLayer>
      )

      let dataAvailable = true;
      console.warn("DATA KEYS: ", Object.keys(this.state.data), Object.keys(this.state.data_compare))
      if (Object.keys(this.state.data).length !== 0 || Object.keys(this.state.data_compare).length !== 0) {
        dataAvailable = false;
      }

      modalContent.push(
        <Button
          onClick={this.apply}
          disabled={dataAvailable}
        >PLOT</Button>
      )

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
