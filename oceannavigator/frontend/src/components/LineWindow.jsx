/* eslint react/no-deprecated: 0 */
/*

  Opens Window displaying the Image corresponding to a Selected Line

*/
import React from "react";
import {Nav, NavItem, Panel, Row, Col, Button} from "react-bootstrap";
import PlotImage from "./PlotImage.jsx";
import ComboBox from "./ComboBox.jsx";
import Range from "./Range.jsx";
import SelectBox from "./SelectBox.jsx";
import moment from "moment-timezone";
import NumberBox from "./NumberBox.jsx";
import ImageSize from "./ImageSize.jsx";
import DepthLimit from "./DepthLimit.jsx";
import DatasetSelector from "./DatasetSelector.jsx";
import PropTypes from "prop-types";
import CustomPlotLabels from "./CustomPlotLabels.jsx";
import DataSelection from "./DataSelection.jsx";
import Spinner from '../images/spinner.gif';

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

export default class LineWindow extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;
   
    this.state = {
      selected: 1,
      //scale: props.scale + ",auto",
      //scale_1: props.scale_1 + ",auto",
      //scale_diff: "-10,10,auto",
      data: {},
      data_compare: {},
      colormap: "default",
      colormap_right: "default", // Colourmap for second (right) plot
      colormap_diff: "default", // Colourmap for difference plot
      showmap: true,
      surfacevariable: "none",
      linearthresh: 200,
      scale_diff: '0,0',
      size: "10x7",
      dpi: 144,
      depth_limit: false,
      plotTitles: Array(2).fill(""),
      selectedPlots: [0, 1, 1]
    };

    if (props.init !== null) {
      $.extend(this.state, props.init);
    }

    // Function bindings
    this.onLocalUpdate = this.onLocalUpdate.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updatePlotTitle = this.updatePlotTitle.bind(this);
    this.updateSelectedPlots = this.updateSelectedPlots.bind(this);
    this.updateData = this.updateData.bind(this);
    this.populateVariables = this.populateVariables.bind(this);
    this.updatePlot = this.updatePlot.bind(this);
  }

  componentDidMount() {
    this._mounted = true;
  }

  componentWillUnmount() {
    this._mounted = false;
  }


  /*
    Updates Plot with User Specified Title
  */
  updatePlotTitle (title) {
    if (title !== this.state.plotTitles[this.state.selected - 1]) {   //If new plot title
      const newTitles = this.state.plotTitles;
      newTitles[this.state.selected - 1] = title;
      this.setState({plotTitles: newTitles,});   //Update Plot Title
    }
  }

  /*
    
  */
  updateData(selected) {
    selected = selected.split(',')
    let data = this.props.data

    // Initialize non compare data
    let layer = selected[0]
    let index = selected[1]
    let dataset = selected[2]
    let variable = ''

    if (selected.length > 4) {
      for (let v = 3; v < selected.length; v = v + 1) {
        if (variable === '') {
          variable = selected[v]
        } else {
          variable = variable + ',' + selected[v]
        }
      }
    } else {
      variable = [selected[3]]
    }
    
    let display = data[layer][index][dataset][variable].display
    let colourmap = data[layer][index][dataset][variable].colourmap
    let quantum = data[layer][index][dataset][variable].quantum
    let scale = data[layer][index][dataset][variable].scale
    let time = data[layer][index][dataset][variable].time
    let compare_time = moment(time.valueOf())
    compare_time.tz('GMT')
    time = moment(time.valueOf())
    time.tz('GMT')
    let output_starttime = moment(time.valueOf())
    let output_endtime = moment(time.valueOf())
    
    if (jQuery.isEmptyObject(this.props.data_compare)) {
        let data_compare = {
          layer: layer,
          index: index,
          dataset: dataset,
          variable: variable,
    
          display: display,
          colourmap: colourmap,
          dataset_quantum: quantum,
          scale: scale + ',auto',
          time: time,  
        }
        
        this.setState({
          data_compare: data_compare,
          output_starttime: output_starttime,
          output_endtime: output_endtime,
        })
    } else {

      let compare_display = data[layer][index][dataset][variable].display
      let compare_colourmap = data[layer][index][dataset][variable].colourmap
      let compare_quantum = data[layer][index][dataset][variable].quantum
      let compare_scale = data[layer][index][dataset][variable].scale
      compare_time = data[layer][index][dataset][variable].time
      
      let depth = data[layer][index][dataset][variable].depth
      
      let data_compare = {
        layer: layer,
        index: index,
        dataset: dataset,
        depth: depth,
        variable: variable,
        display: compare_display,
        colourmap: compare_colourmap,
        quantum: compare_quantum,
        scale: compare_scale + ',auto',
        time: moment(compare_time.valueOf()),
      }
      
      this.setState({
        data_compare: data_compare,
        output_starttime: output_starttime,
        output_endtime: output_endtime,
      })
    }
    
    this.setState({
      data: {
        layer: layer,
        index: index,
        dataset: dataset,
        variable: variable,
  
        display: display,
        colourmap: colourmap,
        dataset_quantum: quantum,
        scale: scale + ',auto',
        time: time,
      }
    }, () => {
      this.updatePlot()
   })
    
  }


  /*
    Populates all the variables available in the dataset
  */
  populateVariables(dataset) {
    if (dataset === undefined) {
      return
    }
    $.ajax({
      url: "/api/v1.0/variables/?dataset=" + dataset + "&anom",
      dataType: "json",
      cache: true,

      success: function (data) {
        if (this._mounted) {
          const vars = data.map(function (d) {
            return d.id;
          });

          //if (vars.indexOf(this.props.variable.split(",")[0]) === -1) {
          //  this.props.onUpdate("variable", vars[0]);
          //}

          this.setState({
            variables: data.map(function (d) {
              return d.id;
            }),
          }, () => {
            this.updatePlot()
          });
        }
        //this.updatePlot()
      }.bind(this),

      error: function (xhr, status, err) {
        if (this._mounted) {
          console.error(this.props.url, status, err.toString());
        }
      }.bind(this)
    });
  }

  /*
    I have no idea what this does
  */
  updateSelectedPlots (plots_selected, compare) {
    let temp = [1, 0, 0];
    
    if(plots_selected[0]) {
      temp[0] = 1;
    } else {
      temp[0] = 0;
    }
    if(plots_selected[1]) {
      temp[1] = 1;
    } else {
      temp[1] = 0;
    }
    if(plots_selected[2]) {
      temp[2] = 1;
    } else {
      temp[2] = 0;
    }

    if (compare) {
      this.setState({
        comparePlots: temp, 
      });
    } else {
      this.setState({
        selectedPlots: temp,
      });
    }
    
  }

  /*

  */
  onLocalUpdate(key, value) {
    if (this._mounted) {
      
      var newState = {};

      if (key === 'data') {
        newState[key] = value;
      } else if (typeof(key) === "string") {
        if (key === 'scale') {
          let data = jQuery.extend({}, this.state.data)
          data['scale'] = value
          newState.data = data
        } else {
          newState[key] = value;
        }
      } else {
        if (key[0] === 'colourmap') {
          let data = jQuery.extend({}, this.state.data)
          data['colourmap'] = value.join()
          newState.data = data
        } else {
          for (let i = 0; i < key.length; ++i) {
            newState[key[i]] = value[i];
          }
        }
      }
      
      this.setState(newState);
      
      /*this.setState({
        [key]: value
      })*/
    }
  }

  /*

  */
  updatePlot() {
    if (jQuery.isEmptyObject(this.state.data)) {
      return
    }

    
    const plot_query = {
      dataset: this.state.data.dataset,
      quantum: this.state.data.dataset_quantum,
      variable: this.state.data.variable,
      path: this.props.line[0],
      scale: this.state.data.scale,
      colormap: this.state.data.colourmap,
      showmap: this.state.showmap,
      name: this.props.names[0],
      size: this.state.size,
      dpi: this.state.dpi,
      plotTitle: this.state.plotTitles[this.state.selected - 1],
      random: Math.random()
    };

    switch(this.state.selected) {
      case 1:
        plot_query.type = "transect";
        plot_query.time = this.state.data.time;
        plot_query.surfacevariable = this.state.surfacevariable;
        plot_query.linearthresh = this.state.linearthresh;
        plot_query.depth_limit = this.state.depth_limit;
        plot_query.selectedPlots = this.state.selectedPlots.toString();
        if (this.state.dataset_compare) {
          plot_query.compare_to = this.state.data_compare
          plot_query.compare_to.dataset = this.state.data_compare.dataset;
          plot_query.compare_to.scale = this.state.data_compare.scale;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.data_compare.colourmap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }
        break;
      case 2:
        plot_query.type = "hovmoller";
        plot_query.endtime = this.state.data.time;
        plot_query.starttime = this.state.data.starttime;//this.props.starttime;
        plot_query.depth = this.state.data.depth;
        if (this.state.dataset_compare) {
          plot_query.compare_to = this.state.data_compare
          plot_query.compare_to.dataset = this.state.data_compare.dataset;
          plot_query.compare_to.scale = this.state.data_compare.scale;
          plot_query.compare_to.scale_diff = this.state.scale_diff;
          plot_query.compare_to.colormap = this.state.data_compare.colourmap;
          plot_query.compare_to.colormap_diff = this.state.colormap_diff;
        }
        break;
    }
    this.setState({
      plot_query: plot_query
    })
  }

  /*

  */
  onSelect(key) {
    this.setState({
      selected: key,
    }, this.updatePlot);
  }

  render() {
    _("Dataset");
    _("Time");
    _("Start Time");
    _("End Time");
    _("Depth");
    _("Variable");
    _("Variable Range");
    _("Colourmap");
    _("Show Location");
    _("Linear Threshold");
    _("Surface Variable");
    _("Saved Image Size");

    let dataSelection = <DataSelection
      data={this.props.data}
      localUpdate={this.updateData}
    ></DataSelection>
    let applyChanges1 = <Button
        key='1'
        onClick={this.updatePlot}
        >Apply Changes
      </Button>
    const global = (<Panel 
      key='global_settings'
      id='global_settings'
      collapsible
      defaultExpanded
      header={_("Global Settings")}
      bsStyle='primary'
    >
      <Row>
        <Col xs={9}>
          <SelectBox
            id='dataset_compare'
            key='dataset_compare'
            state={this.state.dataset_compare}
            onUpdate={this.onLocalUpdate}
            title={_("Compare Datasets")}
          />
        </Col>
        <Col xs={3}>
          <Button 
            bsStyle="link"
            key='show_help'
            id='show_help'
            onClick={this.props.showHelp}
          >
            {_("Help")}
          </Button>
        </Col>
      </Row>
      <Button
        key='swap_views'
        id='swap_views'
        bsStyle="default"
        block
        style={{display: this.state.dataset_compare ? "block" : "none"}}
        onClick={this.props.swapViews}
      >
        {_("Swap Views")}
      </Button>
      
      {/*Show range widget for difference plot iff in compare mode and both variables are equal*/}
      <div
        style={{display: this.state.dataset_compare &&
                         this.state.data.variable == this.state.data_compare.variable ? "block" : "none"}}
      >
        <Range
          auto
          key='scale_diff'
          id='scale_diff'
          state={this.state.scale_diff}
          def={""}
          onUpdate={this.onLocalUpdate}
          title={_("Diff. Variable Range")}
        /> 
      </div>

      <SelectBox
        key='showmap'
        id='showmap'
        state={this.state.showmap}
        onUpdate={this.onLocalUpdate}
        title={_("Show Map Location")}
      >
        {_("showmap_help")}
      </SelectBox>
        
      <ImageSize
        key='size'
        id='size'
        state={this.state.size}
        onUpdate={this.onLocalUpdate}
        title={_("Saved Image Size")}
      />
      <CustomPlotLabels
        key='title'
        id='title'
        title={_("Plot Title")}
        updatePlotTitle={this.updatePlotTitle}
        plotTitle={this.state.plotTitles[this.state.selected - 1]}
      ></CustomPlotLabels>
      {applyChanges1}
    </Panel>);
    let applyChanges2 = <Button
      key='2'
      onClick={this.updatePlot}
      >Apply Changes
    </Button>
    var transectSettings
    if (this._mounted) {
      transectSettings = <Panel
      key='transect_settings'
      id='transect_settings'
      collapsible
      defaultExpanded
      header={_("Transect Settings")}
      bsStyle='primary'
    >
      <ComboBox
        key='surfacevariable'
        id='surfacevariable'
        state={this.state.surfacevariable}
        onUpdate={this.onLocalUpdate}
        title={_("Surface Variable")}
        url={"/api/v1.0/variables/?dataset=" + this.state.data.dataset}
      >{_("surfacevariable_help")}</ComboBox>

      <NumberBox
        key='linearthresh'
        id='linearthresh'
        state={this.state.linearthresh}
        onUpdate={this.onLocalUpdate}
        title={_("Linear Threshold")}
      >{_("linearthresh_help")}</NumberBox>

      <DepthLimit
        key='depth_limit'
        id='depth_limit'
        state={this.state.depth_limit}
        onUpdate={this.onLocalUpdate}
      />

      <div
        style={{display: this.state.dataset_compare &&
                         this.state.data.variable == this.state.data_compare.variable ? "block" : "none"}}>
        <ComboBox
          key='colormap_diff'
          id='colormap_diff'
          state={this.state.colormap_diff}
          def='default'
          onUpdate={this.onLocalUpdate}
          url='/api/v1.0/colormaps/'
          title={_("Diff. Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
        </ComboBox>
      </div>
      {applyChanges2}
    </Panel>;
    }
    
    let applyChanges3 = <Button
      key='3'
      onClick={this.updatePlot}
      >Apply Changes
    </Button>
    var dataset = null
    if (this.state.data.scale !== undefined) {
      dataset = <Panel 
      key='left_map'
      id='left_map'
      collapsible
      defaultExpanded
      header={this.state.dataset_compare ? _("Left Map (Anchor)") : _("Main Map")}
      bsStyle='primary'
    >
      <DatasetSelector
        key='data'
        id='data'
        state={this.state.data}
        onUpdate={this.onLocalUpdate}
        depth={this.state.selected == 2}
        variables={this.state.selected == 2 ? "all" : "3d"}
        time={this.state.selected == 2 ? "range" : "single"}
        line={true}
        updateSelectedPlots={this.updateSelectedPlots}
        compare={this.state.dataset_compare}
      />
      
      <Range
        auto
        key='scale'
        id='scale'
        state={this.state.data.scale}
        def={""}
        onUpdate={this.onLocalUpdate}
        title={_("Variable Range")}
      />

      <ComboBox
        key='colourmap'
        id='colourmap'
        state={this.state.data.colourmap}
        def='default'
        onUpdate={this.onLocalUpdate}
        url='/api/v1.0/colormaps/'
        title={_("Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
      </ComboBox>
      {applyChanges3}
    </Panel>;
    }
    

    if (jQuery.isEmptyObject(this.state.data_compare) === false && this.state.data_compare.scale !== undefined) {
      var compare_dataset = <div key='compare_dataset'>
      <div style={{ "display": this.state.dataset_compare ? "block" : "none" }}>  
        <Panel 
          key='right_map'
          id='right_map'
          collapsible
          defaultExpanded
          header={_("Right Map")}
          bsStyle='primary'
        >
          <DatasetSelector
            key='data_compare'
            id='data_compare'
            state={this.state.data_compare}
            onUpdate={this.onLocalUpdate}
            depth={this.state.selected == 2}
            variables={this.state.selected == 2 ? "all" : "3d"}
            time={this.state.selected == 2 ? "range" : "single"}
          />
          <Range
            auto
            key='compare_scale'
            id='compare_scale'
            state={this.state.data_compare.scale}
            def={""}
            onUpdate={this.onLocalUpdate}
            title={_("Variable Range")}
          />
          <ComboBox
            key='compare_colourmap'
            id='compare_colourmap'
            state={this.state.data_compare.colourmap}
            def='default'
            onUpdate={this.onLocalUpdate}
            url='/api/colormaps/'
            title={_("Colour Map")}>{_("colourmap_help")}<img src="/colormaps.png" />
          </ComboBox>
        </Panel>
      </div></div>;
    }
    
    



    // Input panels
    const leftInputs = [global];
    const rightInputs = [dataset];
    if (this.state.dataset_compare) {
      rightInputs.push(compare_dataset);
    }
    if (this.state.selected) {
      leftInputs.push(transectSettings);
    }
    
    let plotImage = ''
    if (this.state.plot_query !== undefined) {
      if (this.state.data.time !== undefined) {
        plotImage = <PlotImage
          query={this.state.plot_query}
          permlink_subquery={this.state.data}
          action={this.props.action}
        />
      }
    } else {
      <img src={Spinner} />;
    }

    return (
      <div className='LineWindow Window'>
        <Nav
          bsStyle="tabs"
          activeKey={this.state.selected}
          onSelect={this.onSelect}
        >
          <NavItem eventKey={1}>{_("Transect")}</NavItem>
          <NavItem eventKey={2}>{_("Hovmöller Diagram")}</NavItem>
        </Nav>
        <Row>
          
          <Col lg={2}>
          <Panel
              key='data_selection'
              id='data_selection'
              collapsible
              defaultExpanded
              header={_("Layer")}
              bsStyle='primary'
            >
              {dataSelection}
            </Panel>
            {leftInputs}
          </Col>
          <Col lg={8}>
          
            {plotImage}
          </Col>
          <Col lg={2}>
            {rightInputs}
          </Col>
        </Row>
      </div>
    );
  }
}

//***********************************************************************
LineWindow.propTypes = {
  generatePermLink: PropTypes.func,
  depth: PropTypes.number,
  time: PropTypes.number,
  dataset_compare: PropTypes.bool,
  dataset_1: PropTypes.object,
  names: PropTypes.array,
  line: PropTypes.array,
  variable: PropTypes.string,
  quantum: PropTypes.string,
  dataset_0: PropTypes.object,
  onUpdate: PropTypes.func,
  scale: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  scale_1: PropTypes.string,
  init: PropTypes.object,
  action: PropTypes.func,
  swapViews: PropTypes.func,
  showHelp: PropTypes.func,
};
