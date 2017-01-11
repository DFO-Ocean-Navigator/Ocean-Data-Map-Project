import React from 'react';
import {render} from 'react-dom';
import OceanNavigator from './components/OceanNavigator.jsx';
import WebFont from 'webfontloader';
import Browser from 'detect-browser';
var i18n = require('./i18n.js');

require('bootstrap/dist/css/bootstrap.css');
require('./stylesheets/main.scss');

class App extends React.Component {
    render () {
        return (
            <div>
                <OceanNavigator />
            </div>
        );
    }
}

document.title = _("Ocean Navigator");

render(<App/>, document.getElementById('app'));

WebFont.load({
    custom: {
        families: ['FontAwesome'],
    }
});

$(function() {
    $("html").addClass(Browser.name);
});

