import React from 'react';
import Layer, { testClick } from './Layer.jsx';
import Enzyme, { shallow, render, mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import moment from 'moment-timezone';
import _ from 'lodash';

// React 16 Enzyme Adapter
Enzyme.configure({ adapter: new Adapter() });

/*jest.mock('i18next', () => {
    return {
      withTranslation: x => y => y,
      Trans: ({ children }) => children,
    };
  });
*/

jest.mock('../i18n.js', () => ({
  addResourceBundle: jest.fn(),
}));

test('Test: loadExisting()', () => {
    
    
    expect(true).toBeTruthy();
    
    let testState = {
        timestamps: new moment()
    }

    const component = mount(
        <Layer
            state={testState}
        />
    );
    //component.testClick('test');
    //expect(testClick('test')).toBe('test');
})