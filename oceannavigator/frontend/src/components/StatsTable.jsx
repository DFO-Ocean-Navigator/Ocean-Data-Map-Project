import React from "react";
import {Table, Alert} from "react-bootstrap";
import PropTypes from "prop-types";

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
    promise.done((data) => {
      if (this._mounted) {
        this.setState({
          data,
          fail: false,
          loading: false,
          errorMessage: null,
        });
      }
    });
    promise.fail((xhr) => {
      if (this._mounted) {
        const message = JSON.parse(xhr.responseText).message;
        console.error(xhr);
        this.setState({
          loading: false,
          fail: true,
          errorMessage: message,
        });
      }
    });
    
    
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

    return `/stats/?query=${  encodeURIComponent(stringify(query))}`;
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
      content = this.state.data.map((area) => {
        const vars = area.variables.map((v) => {
          return (
            <tr key={`${area.name  }_${  v.name}`}>
              <td>{v.name} ({v.unit})</td>
              <td>{v.min}</td>
              <td>{v.max}</td>
              <td>{v.median}</td>
              <td>{v.mean}</td>
              <td>{v.stddev}</td>
              <td>{v.num}</td>
            </tr>
          );
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

    return (
      <div>
        <Table 
          responsive 
          className='StatsTable'
          hover
          striped
          bordered
        >
          <thead>
            <tr>
              <th>{_("Variable")}</th>
              <th title={_("Minimum Value")}>{_("Min")}</th>
              <th title={_("Maximum Value")}>{_("Max")}</th>
              <th title={_("Median Value")}>{_("Median")}</th>
              <th title={_("Average Value")}>{_("Mean")}</th>
              <th title={_("Standard Deviation")}>{_("Std Dev")}</th>
              <th title={_("Number of Valid Points in Area")}>{_("# Valid Pts")}</th>
            </tr>
          </thead>
          {content}
        </Table>
        {errorAlert}
      </div>
    );
  }
}

//***********************************************************************
StatsTable.propTypes = {
  query: PropTypes.object,
};
