import React from 'react';
var i18n = require('../i18n.js');

class LocationInput extends React.Component {
    constructor(props) {
        super(props);
    }

    updateParent() {
        var lat = parseFloat(this.latinput.value);
        var lon = parseFloat(this.loninput.value);

        this.props.onUpdate(this.props.id, [[lat, lon]]);
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
                                <input ref={(i) => this.latinput = i} id={this.props.id + '_lat'} type='number' step='0.0001' defaultValue={parseFloat(latlon[0]).toFixed(4)} onBlur={this.updateParent.bind(this)} onKeyPress={this.keyPress.bind(this)} />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor={this.props.id + '_lon'}>{_("Lon:")}</label>
                            </td>
                            <td>
                                <input ref={(i) => this.loninput = i} id={this.props.id + '_lon'} type='number' step='0.0001' defaultValue={parseFloat(latlon[1]).toFixed(4)} onBlur={this.updateParent.bind(this)} onKeyPress={this.keyPress.bind(this)} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default LocationInput;
