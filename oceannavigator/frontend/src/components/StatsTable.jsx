import React from "react";
import {Table, Alert,Popover,OverlayTrigger,Tooltip} from "react-bootstrap";
import PropTypes from "prop-types";
//import MathJax from "react-mathjax"
const MathJax = require("react-mathjax2");

const i18n = require("../i18n.js");
const stringify = require("fast-stable-stringify");

const LOADING_IMAGE = require("../images/spinner.gif");
const FAIL_IMAGE = require("./fail.js");

export default class StatsTable extends React.Component {
  constructor(props) {
    super(props);

    // Track if mounted to prevent no-op errors with the Ajax callbacks.
    this._mounted = false;

    this.state = {
      data: [],
      loading: true,
      fail: false,
      errorMessage: null,
    };
  }

  componentDidMount() {
    this._mounted = true;
    this.populate(this.props);
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  componentWillReceiveProps(props) {
    if (this.urlFromQuery(this.props.query) !== this.urlFromQuery(props.query)) {
      this.populate(props);
    }
  }

  populate(props) {

    this.setState({
      loading: true,
      fail: false,
      errorMessage: null,
    });
  
    const url = this.urlFromQuery(props.query);
    const query = this.query(props.query);
    const paramString = $.param({
      query: stringify(query),
    });
  
    const promise = $.ajax({
      url: "/stats/",
      data: paramString,
      method: (paramString.length < 1536) ? "GET" : "POST",
      dataType: "json",
      cache: true,
      
    }).promise();
    promise.done(function(data) {
      if (this._mounted) {
        this.setState({
          data: data,
          fail: false,
          loading: false,
          errorMessage: null,
        });
      }
    }.bind(this));
    promise.fail(function(xhr) {
      if (this._mounted) {
        const message = JSON.parse(xhr.responseText).message;
        console.error(xhr);
        this.setState({
          loading: false,
          fail: true,
          errorMessage: message,
        });
      }
    }.bind(this));
    
    
  }

  query(q) {
    const query = {
      dataset: q.dataset,
      variable: q.variable,
      time: q.time,
      depth: q.depth,
      area: q.area,
    };
    return query;
  }

  urlFromQuery(q) {
    const query = {
      dataset: q.dataset,
      variable: q.variable,
      time: q.time,
      depth: q.depth,
      area: q.area,
    };

    return "/stats/?query=" + encodeURIComponent(stringify(query));
  }

  render() {
    // Show a nice error if we need to
    let errorAlert = null;
    if (this.state.errorMessage !== null) {
      errorAlert = (<Alert bsStyle="danger">{this.state.errorMessage}</Alert>);
    }

    let content = "";
    if (this.state.loading) {
      content = (
        <tbody className='loading'>
          <tr><td colSpan='7'><img src={LOADING_IMAGE} /></td></tr>
        </tbody>
      );
    } else if (this.state.fail) {
      content = (
        <tbody className='fail'>
          <tr><td colSpan='7'><img src={FAIL_IMAGE} /></td></tr>
        </tbody>
      );
    } else {

      const arrayData = Object.entries(this.state.data);
      
      content = arrayData.map(function(area) {
        const vars = area.map(function(v) {
          if(typeof(v)=="object"){

            return (
              <tr key={v.name}>
                <td>{v.name}(@{v.depth}m) ({v.unit})</td>
                <td>{v.min}</td>
                <td>{v.max}</td>
                <td>{v.median}</td>
                <td>{v.mean}</td>
                <td>{v.variance}</td>
                <td>{v.standard_dev}</td>
                <td>{v.skewness}</td>
                <td>{v.kurtosis}</td>
                
                <td>{v.sampled_points}</td>
              </tr>
            )}
        });
        let name = "";
        if (area.name) {
          name = (
            <tr className='name'>
              <td colSpan='7'>{area.name}</td>
            </tr>
          );
        }
        return (
          <tbody key={area.name}>
            {name}
            {vars}
          </tbody>
        );
      });
    }
    ////////required latex code and popover for Min cell OverlayTrigger
    const minimumTex =[`X_{ min}`]
    const minimunFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{minimumTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const minimumPopover = (
      <Popover id="pop" title="Minimum Value" >
        {minimunFormula}
      </Popover>
    );
    ////////required latex code and popover Max cell OverlayTrigger
    const maximumTex =[`X_{ max}`]
    const maximumFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{maximumTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const maximumPopover = (
      <Popover id="pop" title="Maximum Value" >
        {maximumFormula}
      </Popover>
    );
   
    ////////required latex code and popover for Med cell OverlayTrigger
    const medianTex =[`\\widetilde{X}=\\left\\{  \\frac{N+1}{2} \\right\\}th`]//latex code of Median formula
    const medianFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{medianTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const medianPopover = (
      <Popover id="pop" title="Median Value" >
        {medianFormula}
      </Popover>
    );
    ////////required latex code and popover for Mean cell OverlayTrigger
    const meanTex =[`\\overline{X}=\\frac{\\sum_{i=1}^N{x_{i}}}{N}`]//latex code of Mean formula
    const meanFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{meanTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const meanPopover = (
      <Popover id="pop" title="Average Value" >
        {meanFormula}
      </Popover>
    );
    ////////required varibles for Var cell OverlayTrigger
    const varianceTex =[`s^{2}=\\frac{{\\sum_{i=1}^N}{{(x_{i}-\\overline{X})}^{2}}}{N-1}`]//latex code of Variance formula
    const varianceFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{varianceTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const variancePopover = (
      <Popover id="pop" title="Variance" >
        {varianceFormula}
      </Popover>
    );
    ////////required latex code and popover for Std cell OverlayTrigger
    const stdTex =[`\\delta=\\sqrt{{\\frac{1}{N-1}}{\\sum_{i=1}^N}{{({x_{i}-\\overline{X}})}^{2}}}`]//latex code of Standars Deviation formula
    const stdFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{stdTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const stdPopover = (
      <Popover id="pop" title="Standard Deviation" >
        {stdFormula}
      </Popover>
    );

    ////////required latex code and popover for Skew cell OverlayTrigger
    const skewnessTex =[`skew = \\frac{{3({\\overline{X}-{\\widetilde{X}}})}}{\\delta}`]//latex code of Skewness formula
    const skewnessFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{skewnessTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const skewnessPopover = (
      <Popover id="pop" title="Standard Deviation" >
        {skewnessFormula}
      </Popover>
    );
    ////////required latex code and popover for Kurt cell OverlayTrigger
    const kurtosisTex =[`kurtosis = N\\frac{{\\sum_{i=1}^N}{{(x_{i}-\\overline{X})}^{4}}}{{({\\sum_{i=1}^N}{{(x_{i}-\\overline{X})}^{2}})}^{2}}-3`]//latex code of Kurtosis formula
    const kurtosisFormula =
      <MathJax.Context input='tex'>
        <div>
          <MathJax.Node>{kurtosisTex}</MathJax.Node>  
        </div>
      </MathJax.Context>
     
    const kurtosisPopover = (
      <Popover id="pop" title="Excess Kurtosis" >
        {kurtosisFormula}
      </Popover>
    );
    ////////tooltip for N cell
    const Ntooltip = ( 
      <Tooltip id="tooltip">
        <strong>{"Number of Points in Bounding Box"}</strong>
      </Tooltip>

    )

    return(
        <div>
          
          <Table 
            responsive 
            className='StatsTable' 
            striped
            hover
            bordered
          >
            <thead>
              <tr>
              
                <th>{_("Variable")}</th>

                <OverlayTrigger trigger="hover" placement="right" overlay={minimumPopover}>
                  <th data-container="body"> {_("Min")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={maximumPopover}>
                  <th data-container="body">{_("Max")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={medianPopover}>
                  <th data-container="body">{_("Med")}</th>
                </OverlayTrigger> 

                <OverlayTrigger trigger="hover" placement="right" overlay={meanPopover}>
                  <th data-container="body">{_("Mean")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={variancePopover}>
                  <th data-container="body">{_("Var")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={stdPopover}> 
                 <th data-container="body">{_("Std Dev")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={skewnessPopover}>
                  <th data-container="body">{_("Skew")}</th>
                </OverlayTrigger>

                <OverlayTrigger trigger="hover" placement="right" overlay={kurtosisPopover}>
                  <th data-container="body">{_("Kurt")}</th>
                </OverlayTrigger>
                
                <OverlayTrigger trigger="hover" placement="right" overlay={Ntooltip}>
                  <th data-container="body">{_("# N")}</th>
                </OverlayTrigger>
              </tr>
            </thead>
            {content}
          </Table>
          
          
          
        
        </div>
    )
  }
}

//***********************************************************************
StatsTable.propTypes = {
  query: PropTypes.object,
};
