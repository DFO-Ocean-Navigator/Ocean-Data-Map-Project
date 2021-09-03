import { redraw } from "plotly.js";
import React, { Component} from "react";
import Plot from 'react-plotly.js';

const stringify = require("fast-stable-stringify");
const axios = require("axios");


export class AreaPlotter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {data: [],
                  layout: {},
                  frames: [],
                  config: {displaylogo: false},
                  depths: [],
                  datetimes: [],
                };
    this.getPlotData = this.getPlotData.bind(this);
  }

  componentDidMount() {
    this.setLayout();
    this.getPlotData();
  }

  async getPlotData() {

    const query = "/api/v1.0/area_data/?query=" + encodeURIComponent(stringify(this.props.query))
    const res = await axios(query);
    const data = await res;

    var newData = [ {
      z: data.data.data,
      type: 'heatmap'
      }, 
      {
      z: data.data.bathymetry,
      type: 'contour',
      colorscale: [[0,'rgb(50,50,50)'],[1,'rgb(50,50,50)']],
      showscale: false,
      contours:{
        coloring: 'lines',
        showlabels: true,
        }
      }
    ];
    this.setState({data: newData})
  }

  setLayout() {
    var newLayout = {
      width: 1000,
      height: 750,
      title : 'Area Plot',
      xaxis: {},
      yaxis: {},
    };

    this.setState({layout: newLayout})
  } 

  render() {
    return (
      <Plot
          data={this.state.data}
          layout={this.state.layout}
          frames={this.state.frames}
          config={this.state.config}
          onInitialized={(figure) => this.setState(figure)}
          onUpdate={(figure) => this.setState(figure)}
        />
    );
  }
}
