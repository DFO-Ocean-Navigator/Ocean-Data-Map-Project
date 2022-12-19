import React from "react";
import Plot from "react-plotly.js";

const stringify = require("fast-stable-stringify");
const axios = require("axios");


export class TimeseriesPlotter extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {data: [],
                  layout: {},
                  frames: [],
                  config: {displaylogo: false},
                  depths: [],
                  datetimes: [],
                  variableNames: [],
                  variableUnits: [],
                  loading: true
                };

    this.plotTimeseries = this.plotTimeseries.bind(this);
  }

  componentDidMount() {
    this.plotTimeseries()
  }   

  componentDidUpdate(prevProps) {
    if (prevProps.query.dataset !== this.props.query.dataset ||
      prevProps.query.variable !== this.props.query.variable) {
      this.setState({data: []})
      this.plotTimeseries();
    }   
  }

  formatDepths() {
    if (this.props.metaData.depths.length > 0) {
      // remove "all" and "bottom" from depths
      var d = [...this.props.metaData.depths];

      while (d[0].id === 'bottom' || d[0].id === 'all') {
        d.shift()
      }

      var depths = [];
      for (let i = 0; i < d.length; i++) {
        depths.push(d[i].value)
      }
      return  depths;
    } else {
      return ["0 m"];
    }
  }  

  createLayout() {
    var newLayout = {
      title: {
        text:'Timeseries at (' + this.props.query.point[0][0].toFixed(4).toString() +
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
      xaxis: {rangeslider: {}},
      yaxis: {
        title : this.state.variableNames + " (" + this.state.variableUnits + ")",
      },
      showlegend: true
    };

    this.setState({layout: newLayout});
  }  

  async plotTimeseries() {
    var q = {...this.props.query};
    q.starttime = this.props.metaData.timestamps[0];
    q.endtime = this.props.metaData.timestamps[this.props.metaData.timestamps.length-1];
    const depths = this.formatDepths();
    for (let i = 0; i < depths.length; i++) {
      q.depth = i.toString();
      q.variable = [this.props.query.variable];
      q.station = this.props.query.point;

      const query = "/api/v1.0/plot/?query=" + encodeURIComponent(stringify(q))

      const resp = await axios(query);
      var newData = [...this.state.data];
      var newVariableNames = [...this.state.variableNames];
      var newVariableUnits = [...this.state.variableUnits];      
      var h = 240 - i/(depths.length)*240;
      var v = 1.0 - i/(2*(depths.length));
      var lineColor = "hsv(" + h.toString() + ",1," + v.toString() +")";
      var trace = {
        x: this.props.metaData.datetimes,
        y: resp.data.data,
        name: depths[i],
        type: "scatter",
        mode: "lines",
        marker: {color: lineColor},
        visible: i === 0 ? true : "legendonly",
      }

      newData.push(trace);
      newVariableNames.push(resp.data.variableName);
      newVariableUnits.push(resp.data.variableUnit);

      this.setState({data: newData,
                    variableNames: [...new Set(newVariableNames)],
                    variableUnits: [...new Set(newVariableUnits)]
                    })
      if (this.state.loading) {
        this.createLayout(this.props.query.variable)
        this.setState({loading: false})
      }
    }
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
                onInitialized={(figure) => this.setState(figure)}
                onUpdate={(figure) => this.setState(figure)}
              />
    }
    return (
      <div>{image}</div>
    );
  }
}