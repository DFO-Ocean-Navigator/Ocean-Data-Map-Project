import React from "react";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import {PanelGroup, Panel} from "react-bootstrap";

var i18n = require("../i18n.js");

class MapInputs extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    _("Variable Range");
    _("Show Bathymetry Contours");

    const className = this.props.state.sidebarOpen ? "MapInputs open" : "MapInputs";

    return (
      <div className={className}>
        <Panel
          header="Global Map Settings" 
          expanded
          bsStyle='primary'
        >
          <ComboBox
            key='projection'
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
            key='basemap'
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
            key='bathymetry'
            id='bathymetry'
            state={this.props.state.bathymetry}
            onUpdate={this.props.changeHandler}
            title={_("Show Bathymetry Contours")}
          />
          <SelectBox
            key='dataset_compare'
            id='dataset_compare'
            state={this.props.state.dataset_compare}
            onUpdate={this.props.changeHandler}
            title={_("Compare Datasets")}
          />
        </Panel>
        <Panel
          header={this.props.state.dataset_compare ? "Left View" : "Primary View"}
          expanded
          bsStyle='primary'
          >
          <DatasetSelector
            key='dataset_0'
            id='dataset_0'
            state={this.props.state}
            onUpdate={this.props.changeHandler}
            depth={true}
          />
        </Panel>
        <div style={{"display": this.props.state.dataset_compare ? "block" : "none"}}>
          <Panel
            header="Right View"
            expanded
            bsStyle='primary'
          >
            <DatasetSelector
              key='dataset_1'
              id='dataset_1'
              state={this.props.state.dataset_1}
              onUpdate={this.props.changeHandler}
              depth={true}
            />
          </Panel>
        </div>
        <Range
          key='scale'
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
          default_scale={this.props.state.variable_scale}
        ></Range>
      </div>
    );
  }
}

export default MapInputs;

