import React from 'react';
import ComboBox from './ComboBox.jsx';
import SelectBox from './SelectBox.jsx';

class ContourSelector extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            levels: "-10,0,10",
        }
    }

    onUpdate(key, value) {
        if (!this.props.state.hasOwnProperty(key)) {
            return;
        }
        var state = {};
        state[key] = value;
        var newState = jQuery.extend({}, this.props.state, state);

        this.props.onUpdate(this.props.id, newState);
    }

    levelsChanged(e) {
        this.setState({
            levels: e.target.value,
        });
    }

    updateLevels() {
        this.onUpdate('levels', this.state.levels);
    }

    onUpdateAuto(key, value) {
        if (value) {
            this.onUpdate('levels', 'auto');
        } else {
            this.updateLevels();
        }
    }

    render() {
        var auto = this.props.state.levels == 'auto';
        return (
            <div className='ContourSelector input'>
                <ComboBox id='variable' state={this.props.state.variable} def='' onUpdate={this.onUpdate.bind(this)} url={'/api/variables/?dataset=' + this.props.dataset} title={this.props.title}>{this.props.children}</ComboBox>
                <div className='sub' style={{'display': (this.props.state.variable == 'none' || this.props.state.variable == '') ? 'none' : 'block'}}>
                    <SelectBox key='hatch' id='hatch' state={this.props.state.hatch} onUpdate={this.onUpdate.bind(this)} title='Crosshatch'></SelectBox>
                    <div style={{'display': this.props.state.hatch ? 'none' : 'block'}}>
                        <ComboBox key='colormap' id='colormap' state={this.props.state.colormap} def='' onUpdate={this.onUpdate.bind(this)} url='/api/colormaps/' title='Colourmap'></ComboBox>
                    </div>
                    <SelectBox key='legend' id='legend' state={this.props.state.legend} onUpdate={this.onUpdate.bind(this)} title='Show Legend'></SelectBox>
                    <h1>Levels</h1>
                    <SelectBox key='autolevels' id='autolevels' state={auto} onUpdate={this.onUpdateAuto.bind(this)} title='Auto Levels'></SelectBox>
                    <input type="text" style={{'display': this.state.autolevels ? 'none' : 'inline-block'}} value={this.state.levels} onChange={this.levelsChanged.bind(this)} onBlur={this.updateLevels.bind(this)} />
                </div>
            </div>
        );
    }
}

export default ContourSelector;

