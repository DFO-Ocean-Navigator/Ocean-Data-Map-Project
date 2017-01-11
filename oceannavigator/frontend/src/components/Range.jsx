import React from 'react';
var i18n = require('../i18n.js');

class Range extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            auto: this.props.auto
        }
    }
    updateParent() {
        var range = this.min.value.toString() + ',' + this.max.value.toString();
        this.props.onUpdate(this.props.id, range);
    }
    componentWillReceiveProps(nextProps) {
        var scale = nextProps.state;
        if (typeof(nextProps.state.split) === "function") {
            scale = nextProps.state.split(",");
        }
        if (scale.length > 1) {
            this.min.value = parseFloat(scale[0]);
            this.max.value = parseFloat(scale[1]);
        }
    }
    autoChanged(e) {
        this.setState({
            auto: e.target.checked
        });

        var scale = this.props.state;
        if (typeof(this.props.state.split) === "function") {
            scale = this.props.state.split(",");
        }

        if (e.target.checked) {
            this.props.onUpdate(this.props.id, scale[0] + "," + scale[1] + ",auto");
        } else {
            this.props.onUpdate(this.props.id, scale[0] + "," + scale[1]);
        }
    }
    render() {
        var scale = this.props.state;
        if (typeof(this.props.state.split) === "function") {
            scale = this.props.state.split(",");
        }
        var min = parseFloat(scale[0]);
        var max = parseFloat(scale[1]);

        var auto = (
            <div>
                <label className='forcheckbox'>
                    <input type='checkbox' id={this.props.id + '_auto'} checked={this.state.auto} onChange={this.autoChanged.bind(this)} />
                    {_("Auto Range")}
                </label>
            </div>
        );

        return (
            <div className='Range input'>
                <h1>{this.props.title}</h1>
                {this.props.auto ? auto : null}
                <table style={{'display': this.state.auto ? 'none' : 'table'}}>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor={this.props.id + '_min'}>{_("Min:")}</label>
                            </td>
                            <td>
                                <input ref={(x) => this.min = x} id={this.props.id + '_min'} type='number' defaultValue={min} onChange={this.rangeChanged} onBlur={this.updateParent.bind(this)} disabled={this.state.auto} />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor={this.props.id + '_max'}>{_("Max:")}</label>
                            </td>
                            <td>
                                <input ref={(x) => this.max = x} id={this.props.id + '_max'} type='number' defaultValue={max} onChange={this.rangeChanged} onBlur={this.updateParent.bind(this)} disabled={this.state.auto} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default Range;
