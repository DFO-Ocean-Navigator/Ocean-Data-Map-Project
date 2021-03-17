import React from 'react'
import { render, fireEvent, cleanup } from "react-testing-library";

import SelectBox from "../components/SelectBox";

afterEach(cleanup);

it("toggles checkbox checked state on click", () => {
    const result = render(<SelectBox id="myID" />);
    const box = result.container.querySelector("#myID");

    expect(box.checked).toEqual(false);
    fireEvent.click(box);
    expect(box.checked).toEqual(true);
    fireEvent.click(box);
    expect(box.checked).toEqual(false);
});
