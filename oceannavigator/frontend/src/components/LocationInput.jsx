import React from 'react';
import NumericInput from 'react-numeric-input';

var i18n = require('../i18n.js');

class LocationInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            latitude: parseFloat(this.props.state[0][0]),
            longitude: parseFloat(this.props.state[0][1]),
        }
    }

    updateParent() {
        clearTimeout(this.timeout);
        this.props.onUpdate(this.props.id, [[this.state.latitude, this.state.longitude]]);
    }

    keyPress(e) {
        var key = e.which || e.keyCode;
        if (key == 13) {
            this.updateParent();
            return false;
        } else {
            return true;
        }
    }

    changed(key, value) {
        clearTimeout(this.timeout);
        var state = {}
        state[key] = value;
        this.setState(state);
        this.timeout = setTimeout(this.updateParent.bind(this), 500);
    }

    render() {
        var latlon = this.props.state[0];

        return (
            <div key={this.props.url} className='LocationInput input'>
                <h1>
                {this.props.title}
                </h1>

                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor={this.props.id + '_lat'}>{_("Lat:")}</label>
                            </td>
                            <td>
                                <NumericInput
                                    value={this.state.latitude}
                                    precision={4}
                                    step={0.01}
                                    onChange={(n,s) => this.changed('latitude', n)}
                                    onBlur={this.updateParent.bind(this)}
                                    onKeyPress={this.keyPress.bind(this)}
                                    id={this.props.id + '_lat'}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor={this.props.id + '_lon'}>{_("Lon:")}</label>
                            </td>
                            <td>
                                <NumericInput
                                    value={this.state.longitude}
                                    precision={4}
                                    step={0.01}
                                    onChange={(n,s) => this.changed('longitude', n)}
                                    onBlur={this.updateParent.bind(this)}
                                    onKeyPress={this.keyPress.bind(this)}
                                    id={this.props.id + '_lon'}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default LocationInput;
