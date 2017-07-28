import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {Panel} from "react-bootstrap";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

export default class MapInputs extends React.Component {
 
  render() {
    _("Variable Range");
    _("Show Bathymetry Contours");

    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";

    return (
      <div className={className}>
        <Panel
          collapsible
          defaultExpanded
          header={_("Global Map Settings")} 
          bsStyle='primary' 
        >
          <ComboBox
            id='projection'
            state={this.props.state.projection}
            onUpdate={this.props.changeHandler}
            data={[
              { id: "EPSG:3857", value: _("Global") },
              { id: "EPSG:32661", value: _("Arctic") },
              { id: "EPSG:3031", value: _("Antarctic") },
            ]}
            title={_("Projection")}
          />
          <ComboBox
            id='basemap'
            state={this.props.state.basemap}
            onUpdate={this.props.changeHandler}
            data={[
              {
                id: "topo",
                value: _("ETOPO1 Topography"),
                attribution: "Topographical Data from ETOPO1 1 Arc-Minute Global Relief Model. NCEI, NESDIR, NOAA, U.S. Department of Commerce"
              },
              {
                id: "ocean",
                value: _("Esri Ocean Basemap"),
                attribution: "Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri"
              },
              {
                id: "world",
                value: _("Esri World Imagery"),
                attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
              },
            ]}
            title={_("Basemap")}
          />
          <SelectBox
            id='bathymetry'
            state={this.props.state.bathymetry}
            onUpdate={this.props.changeHandler}
            title={_("Show Bathymetry Contours")}
          />
          <SelectBox
            id='dataset_compare'
            state={this.props.state.dataset_compare}
            onUpdate={this.props.changeHandler}
            title={_("Compare Datasets")}
          />
          <SelectBox
            id='syncRanges'
            onUpdate={this.props.changeHandler}
            title={_("Sync Variable Ranges")}
            style={{display: this.props.state.dataset_compare ? "block" : "none"}}
          />
        </Panel>

        <Panel
          collapsible
          defaultExpanded
          header={this.props.state.dataset_compare ? "Left View" : "Primary View"}
          bsStyle='primary'
        >
          <DatasetSelector
            id='dataset_0'
            state={this.props.state}
            onUpdate={this.props.changeHandler}
            depth={true}
          />
          <Range
            id='scale'
            state={this.props.state.scale}
            def=''
            onUpdate={this.props.changeHandler}
            title={_("Variable Range")}
            autourl={"/api/range/" +
              this.props.state.dataset + "/" +
              this.props.state.projection + "/" +
              this.props.state.extent.join(",") + "/" +
              this.props.state.depth + "/" +
              this.props.state.time + "/" +
              this.props.state.variable + ".json"
            }
            dataset_compare={this.props.state.dataset_compare}
            default_scale={this.props.state.variable_scale}
          ></Range>
        </Panel>

        <div style={{"display": this.props.state.dataset_compare ? "block" : "none"}}>
          <Panel
            collapsible
            defaultExpanded
            header="Right View"
            bsStyle='primary'
          >
            <DatasetSelector
              id='dataset_1'
              state={this.props.state.dataset_1}
              onUpdate={this.props.changeHandler}
              depth={true}
            />
            <Range
              key='scale_1'
              id='scale_1'
              state={this.props.state.scale_1}
              def=''
              onUpdate={this.props.changeHandler}
              title={_("Variable Range")}
              autourl={"/api/range/" +
                this.props.state.dataset_1.dataset + "/" +
                this.props.state.projection + "/" +
                this.props.state.extent.join(",") + "/" +
                this.props.state.dataset_1.depth + "/" +
                this.props.state.dataset_1.time + "/" +
                this.props.state.dataset_1.variable + ".json"
              }
              default_scale={this.props.state.dataset_1.variable_scale}
            ></Range>
          </Panel>

        </div>
        
      </div>
    );
  }
}

//***********************************************************************
MapInputs.propTypes = {
  state: PropTypes.object,
  sidebarOpen: PropTypes.bool,
  basemap: PropTypes.string,
  scale: PropTypes.string,
  scale_1: PropTypes.string,
  bathymetry: PropTypes.bool,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  projection: PropTypes.string,
  depth: PropTypes.number,
  time: PropTypes.number,
  variable_scale: PropTypes.array,
  extent: PropTypes.array,
  changeHandler: PropTypes.func,
};
