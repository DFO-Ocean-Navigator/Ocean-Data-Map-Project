import React from 'react';
import NumberBox from './NumberBox.jsx';
var i18n = require('../i18n.js');

class DepthLimit extends React.Component {
    constructor(props) {
        super(props);
        
        console.log(isNaN(this.props.state), this.props.state);
        if (isNaN(this.props.state) || this.props.state == false) {
            this.state = {
                limit: false,
                value: 200,
            }
        } else {
            this.state = {
                limit: true,
                value: parseInt(this.props.state),
            }
        }
    }
    enableChecked(e) {
        this.setState({
            limit: e.target.checked,
        });
        if (e.target.checked) {
            this.props.onUpdate(this.props.id, this.state.value);
        } else {
            this.props.onUpdate(this.props.id, false);
        }
    }
    onUpdate(key, value) {
        this.props.onUpdate(this.props.id, value);
    }
    updateParent() {
        this.props.onUpdate(this.props.id, this.state.value);
    }
    render() {
        var hasHelp = false;
        _("Depth Limit");
        _("Limit Depth");
        return (
            <div className='DepthLimit input'>
                <h1>{_("Depth Limit")}</h1>

                <label className="forcheckbox">
                    <input type="checkbox" onChange={this.enableChecked.bind(this)}/>
                    {_("Limit Depth")}
                </label>
                <div style={{'display': this.state.limit ? 'block' : 'none'}}>
                    <NumberBox key='depth' id='depth' state={this.state.value} onUpdate={this.onUpdate.bind(this)} title={_("Depth Limit")} />
                </div>
            </div>
        );
    }
}

export default DepthLimit;
