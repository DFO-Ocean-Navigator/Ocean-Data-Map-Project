import React from "react";
import Plot from "react-plotly.js";

const stringify = require("fast-stable-stringify");
const axios = require("axios");


export class ProfilePlotter extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {data: [],
                  layout: {},
                  frames: [],
                  config: { displaylogo: false },
                  depths: [],
                  datetimes: [],
                  variableNames: [],
                  variableUnits: [],
                  loading: true
                };

    this.plotProfile = this.plotProfile.bind(this);
  }

  componentDidMount() {
    this.plotProfile();
  } 

  componentDidUpdate(prevProps) {
    if (prevProps.query.dataset !== this.props.query.dataset ||
      prevProps.query.variable !== this.props.query.variable) {
      this.setState({data: [],
                    variableNames: [],
                    variableUnits: [],
                    loading: true})
      this.plotProfile();
    }   
  }

  plotProfile() {
      this.formatDepths();  
      this.formatDatetimes();
      this.getProfileData(this.props.query.variable); 
  }

  createLayout() {
    var newLayout = {
      title: {
        text:'Profile at (' + this.props.query.point[0][0].toFixed(4).toString() +
              ',' +this.props.query.point[0][1].toFixed(4).toString()+')',
        font: {
          family: 'Courier New, monospace',
          size: 12
        },
        xref: 'paper',
        x: 0.5,
        yref: "paper",
        y: 1.5,        
      },
      width: 1000,
      height: 750,
      yaxis: {
        autorange: "reversed",
        title : "Depth (m)",
      },
      showlegend: true
    };

    var subplots = [];
    for (let i = 0; i < this.props.query.variable.length; i++) {
      var idx = (i + 1).toString();
      var xaxisTitle = this.state.variableNames[i] + " (" + this.state.variableUnits[i] + ")"
      if (i === 0) {
        newLayout["xaxis"] = { title : xaxisTitle}
        subplots.push("xy")
      } else {
        newLayout["xaxis" + idx] = { title : xaxisTitle}
        subplots.push("x" + idx + "y")
      }
    } 

    newLayout["grid"] = {rows: 1, 
                    columns: this.props.query.variable.length, 
                    subplots: [subplots]
                };

    this.setState({layout: newLayout})
  }

  formatDatetimes() {
    var datetimes = [];
    var d = [...this.props.metaData.datetimes];
    for (let i = 0; i < d.length; i++) {
      var dt = d[i].replace("T", " ")
      dt = dt.replace("+00:00", "")
      datetimes.push(dt)
    }
    this.setState({datetimes: datetimes})
  } 

  formatDepths() {
    // remove "all" and "bottom" from depths
    if (this.props.metaData.depths.length > 1) {
      var d = [...this.props.metaData.depths];

      while (d[0].id === 'bottom' || d[0].id === 'all') {
        d.shift()
      }

      var depths = [];
      for (let i = 0; i < d.length; i++) {
        depths.push(parseInt(d[i].value))
      }
      this.setState({depths: depths})
    }
  }

  async getProfileData(variable) {
    var q = {...this.props.query};
    q.starttime = this.props.metaData.timestamps[0];
    q.endtime = this.props.metaData.timestamps[this.props.metaData.timestamps.length-1];
    for (let j = 0; j < this.props.metaData.timestamps.length; j++){        
      for (let i = 0; i < this.props.query.variable.length; i++){
        q.time = this.props.metaData.timestamps[j];
        q.variable = [this.props.query.variable[i]];
        q.station = this.props.query.point;
    
        const query = "/api/v1.0/plot?query=" + encodeURIComponent(stringify(q))
    
        const resp = await axios(query);
        var newData = [...this.state.data];
        var newVariableNames = [...this.state.variableNames]
        var newVariableUnits = [...this.state.variableUnits]
        var h = 240 - j/this.props.metaData.timestamps.length*240;
        var v = 1.0 - j/(2*this.props.metaData.timestamps.length);
        var lineColor = "hsv(" + h.toString() + ",1," + v.toString() +")";
        var trace = {
          x: resp.data.data,
          y: this.state.depths,
          legendgroup: this.props.metaData.datetimes[j],
          name: this.state.datetimes[j],
          type: "scatter",
          mode: "lines",
          marker: {color: lineColor},
          visible: j === 0 ? true : "legendonly",
          xaxis: i === 0 ? "x" : "x" + (i+1).toString(),
          yaxis: "y",
          showlegend: i === 0 ? true : false,
        }

        newData.push(trace);
        newVariableNames.push(resp.data.variableName);
        newVariableUnits.push(resp.data.variableUnit);
        
        if (variable === this.props.query.variable) {
          this.setState({data: newData,
                          variableNames: [...new Set(newVariableNames)],
                          variableUnits: [...new Set(newVariableUnits)]
                        })
          if (i === this.props.query.variable.length -1 &&
              this.state.loading) {
            this.createLayout()
            this.setState({loading: false})
          }
        }
      }
    }   
  }

  onUpdate(figure) {
    this.setState(figure)

    // track which traces are currently visible
    var data = figure.data
    let visibleList = data.reduce((m, e, i) => (e.visible === true && m.push(i), m), []);
    this.props.updateTraces(visibleList)
  }
  
  render() {
    let image = null;
    if (this.state.loading) {
      image = <img src={this.props.LOADING_IMAGE} />
    } else {
      image = <Plot
                data={this.state.data}
                layout={this.state.layout}
                frames={this.state.frames}
                config={this.state.config}
                onInitialized={(figure) => this.onUpdate(figure)}
                onUpdate={(figure) => this.onUpdate(figure)}
              />
    }

    return (
      <div>{image}</div>
    );
  }
}