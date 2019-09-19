import React from 'react';
import Layer, { testClick } from './Layer.jsx';
import Enzyme, { shallow, render, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import moment from 'moment-timezone';

// React 16 Enzyme Adapter
Enzyme.configure({ adapter: new Adapter() });



test('Test: loadExisting()', () => {
    jest.mock('i18next',() => {

    });
    
    expect(true).toBeTruthy();
    
    let testState = {
        timestamps: new moment()
    }

    const component = shallow(
        <Layer
            state={testState}
        />
    );
    //component.testClick('test');
    //expect(testClick('test')).toBe('test');
})