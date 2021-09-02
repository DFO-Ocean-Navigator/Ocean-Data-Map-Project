import { redraw } from "plotly.js";
import React, { Component} from "react";
import Plot from 'react-plotly.js';

const stringify = require("fast-stable-stringify");
const axios = require("axios");


export class PointPlotter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {data: [],
                  layout: {},
                  frames: [],
                  config: {displaylogo: false},
                  depths: [],
                  datetimes: [],
                };

    this.getProfileData = this.getProfileData.bind(this);
    this.getTsData = this.getTsData.bind(this);
  }

  componentDidMount() {
    // use switch here instead of ifs
    
    if (this.props.plotType === 'profile') {
      this.formatDepths();
      this.formatDatetimes();
      this.profileLayout(this.props.variable);
      this.getProfileData(this.props.variable); 
    } else if (this.props.plotType === 'timeseries') {
      this.tsLayout(this.props.variable);
      this.getTsData(this.props.variable); 
    }
  } 

  shouldComponentUpdate(nextProps) {

    // need better way to manage updates...
      if (nextProps.dataset !== this.props.dataset) {
        if (this.props.plotType === 'profile'){
          this.formatDepths();
          this.formatDatetimes();
        }
      } 
      
     if (nextProps.variable !== this.props.variable) {
      if (this.props.plotType === 'profile') {
        this.profileLayout(this.props.variable);
        this.getProfileData(this.props.variable); 
      } else if (this.props.plotType === 'timeseries') {
        this.tsLayout(this.props.variable);
        this.getTsData(this.props.variable); 
      }
    }
    return true;
  }

  profileLayout(variable) {
    var newLayout = {
      width: 1000,
      height: 750,
      xaxis: {},
      yaxis: {
        autorange: "reversed",
        title : "Depth (m)",
      },
      showlegend: true
    };

    var subplots = [];
    var annotations = []; // hacky way to add titles to subplots (Ploty doesn't support subplot titles)
    for (let i = 0; i < variable.length; i++) {
      var idx = (i + 1).toString();
      if (i === 0) {
        subplots.push('xy')
        annotations.push({
          text: variable[i],
          showarrow: false,
          x: 0,
          xref: "x domain",
          y: 1.1,
          yref: "y domain"
        },)
      } else {
        newLayout["xaxis" + idx] = {}
        subplots.push('x' + idx + 'y')
        annotations.push({
          text: variable[i],
          showarrow: false,
          x: 0,
          xref: "x" + idx + " domain",
          y: 1.1,
          yref: "y domain"
        },)
      }
    } 

    newLayout['grid'] = {rows: 1, 
                    columns: variable.length, 
                    subplots:[subplots]
                };

    newLayout['annotations'] = annotations;

    this.setState({layout: newLayout})
  }

  tsLayout(variable) {
    var newLayout = {
      width: 1000,
      height: 750,
      title : variable[0],
      xaxis: {rangeslider: {}},
      yaxis: {
        title : variable[0],
      },
      showlegend: true
    };

    this.setState({layout: newLayout})
  }  

  formatDepths() {
    // remove 'Bottom' from depths
    var d = [...this.props.depths];
    if (d[0] === "Bottom"){
      d.shift();
    }
  
    var depths = [];
    for (let i = 0; i < d.length; i++) {
      if (this.props.plotType === 'profile') {
        depths.push(parseInt(d[i]))
      } else {
        depths.push(d[i])
      }
    }
    this.setState({depths: depths})
  }

  formatDatetimes() {
  
    var datetimes = [];
    var d = [...this.props.datetimes];
    for (let i = 0; i < d.length; i++) {
      var dt = d[i].replace('T', ' ')
      dt = dt.replace('+00:00', '')
      datetimes.push(dt)
    }
    this.setState({datetimes: datetimes})
  } 

  async getProfileData(variable) {
    var q = {};
    for (let j = 0; j < this.props.timestamps.length; j++){
      for (let i = 0; i < variable.length; i++){
        q = {
          dataset: this.props.dataset,
          variable: variable[i],
          point: this.props.point,
          starttime: this.props.timestamps[j],
          endtime: this.props.timestamps[j],
          plotType: this.props.plotType
        };
    
        const query = "/api/v1.0/point_data/?query=" + encodeURIComponent(stringify(q))
    
        const res = await axios(query);
        const data = await res;
        var newData = [...this.state.data];
        newData.push({
          x: data.data,
          y: this.state.depths,
          legendgroup: this.props.datetimes[j],
          name: this.state.datetimes[j],
          type: 'scatter',
          mode: 'lines',
          marker: {color: 'blue'},
          visible: j === 0 ? true : "legendonly",
          xaxis: i === 0 ? 'x' : 'x' + (i+1).toString(),
          yaxis: 'y',
          showlegend: i === 0 ? true : false,
        })
        this.setState({data: newData})
      }
    }   
  }

  async getTsData(variable) {
    var q = {};
    for (let i = 0; i < this.props.depths.length-1; i++){
      q = {
        dataset: this.props.dataset,
        variable: variable,
        point: this.props.point,
        starttime: this.props.timestamps[0],
        endtime: this.props.timestamps[this.props.timestamps.length-1],
        depth: i.toString(),
        plotType: this.props.plotType
      };
    
      const query = "/api/v1.0/point_data/?query=" + encodeURIComponent(stringify(q))
    
      const res = await axios(query);
      const data = await res;
      var newData = [...this.state.data];
      newData.push({
        x: this.props.datetimes,
        y: data.data,
        name: this.props.depths[i+1],
        type: 'scatter',
        mode: 'lines',
        marker: {color: 'blue'},
        visible: i === 0 ? true : "legendonly",
      })
      this.setState({data: newData})
    }   
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
