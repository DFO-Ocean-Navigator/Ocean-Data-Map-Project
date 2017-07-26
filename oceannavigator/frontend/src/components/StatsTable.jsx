import React from "react";
import PropTypes from "prop-types";

const i18n = require("../i18n.js");

const LOADING_IMAGE = require("../images/spinner.gif");
const FAIL_IMAGE = require("./fail.js");

export default class StatsTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      loading: true,
      fail: false,
    };
  }

  componentDidMount() {
    this.populate(this.props);
  }

  componentWillReceiveProps(props) {
    if (this.urlFromQuery(this.props.query) != this.urlFromQuery(props.query)) {
      this.populate(props);
    }
  }

  populate(props) {
    this.setState({
      loading: true,
      fail: false,
    });
    var url = this.urlFromQuery(props.query);
    var query = this.query(props.query);
    var paramString = $.param({
      query: JSON.stringify(query),
    });
    $.ajax({
      url: "/stats/",
      data: paramString,
      method: (paramString.length < 1536) ? "GET" : "POST",
      dataType: "json",
      cache: true,
      success: function(data) {
        this.setState({
          data: data,
          fail: false,
          loading: false,
        });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(url, status, err.toString());
        this.setState({
          loading: false,
          fail: true,
        });
      }.bind(this)
    });
  }

  query(q) {
    var query = {
      dataset: q.dataset,
      variable: q.variable,
      time: q.time,
      depth: q.depth,
      area: q.area,
    };
    return query;
  }

  urlFromQuery(q) {
    var query = {
      dataset: q.dataset,
      variable: q.variable,
      time: q.time,
      depth: q.depth,
      area: q.area,
    };

    return "/stats/?query=" + encodeURIComponent(JSON.stringify(query));
  }

  render() {
    var content = "";
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
      content = this.state.data.map(function(area) {
        var vars = area.variables.map(function(v) {
          return (
                        <tr key={area.name + "_" + v.name}>
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
        var name = "";
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
            <table className='StatsTable'>
                <thead>
                    <tr>
                        <th>{_("Variable")}</th>
                        <th title={_("Minimum Value")}>{_("Min")}</th>
                        <th title={_("Maximum Value")}>{_("Max")}</th>
                        <th title={_("Median Value")}>{_("Median")}</th>
                        <th title={_("Average Value")}>{_("Mean")}</th>
                        <th title={_("Standard Deviation")}>{_("Std Dev")}</th>
                        <th title={_("Number of Valid Points in Area")}>{_("Num")}</th>
                    </tr>
                </thead>
                {content}
            </table>
    );
  }
}

//***********************************************************************
StatsTable.propTypes = {
  query: PropTypes.object,
};
