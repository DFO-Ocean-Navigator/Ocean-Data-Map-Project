import React from 'react';
import {render} from 'react-dom';
import OceanNavigator from './components/OceanNavigator.jsx';
import WebFont from 'webfontloader';

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

render(<App/>, document.getElementById('app'));

WebFont.load({
    custom: {
        families: ['FontAwesome'],
    }
});

