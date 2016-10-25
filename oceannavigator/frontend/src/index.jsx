import React from 'react';
import {render} from 'react-dom';
import OceanNavigator from './components/OceanNavigator.jsx';

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

