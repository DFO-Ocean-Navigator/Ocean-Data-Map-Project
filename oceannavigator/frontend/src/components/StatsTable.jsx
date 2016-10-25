import React from 'react';

var LOADING_IMAGE = require('../images/spinner.gif');
var FAIL_IMAGE = require('../images/failure.gif');

class StatsTable extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            loading: true,
            fail: false,
        }
    }

    componentDidMount() {
        this.populate(this.props)
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
        $.ajax({
            url: url,
            dataType: 'json',
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
                        <th>Variable</th>
                        <th title="Minimum Value">Min</th>
                        <th title="Maximum Value">Max</th>
                        <th title="Median Value">Median</th>
                        <th title="Average Value">Mean</th>
                        <th title="Standard Deviation">Std Dev</th>
                        <th title="Number of Valid Points in Area">Num</th>
                    </tr>
                </thead>
                {content}
            </table>
        );
    }
}

export default StatsTable;
