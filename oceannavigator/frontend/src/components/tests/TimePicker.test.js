import React from "react";
import TimePicker from "../TimePicker.jsx";
import Adapter from "enzyme-adapter-react-16";
import moment from "moment";
import TestComponent from "../TestComponent.jsx";

Enzyme.configure({adapter: new Adapter()});

describe("TestComponent Render", () => {
  test("renders", () => {
    const wrapper = shallow(<TestComponent/>);

    expect(wrapper.exists()).toBe(true);
  });

  test("renders", () => {

    const wrapper = shallow(<TimePicker
      range={false}
      key={"dateRange"}
      dataset={"giops_day"}
      quantum={"day"}
      startDate={null}
      date={moment(new Date())}
      onTimeUpdate={(date) => pass}
    ></TimePicker>);

    expect(wrapper.exists()).toBe(true);
  });
});
