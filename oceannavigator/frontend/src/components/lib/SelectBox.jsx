import React from "react";
import { FormGroup, ControlLabel, FormControl } from "react-bootstrap";
import PropTypes from "prop-types";

const i18n = require("../../i18n.js");

function SelectBox(props) {
    let options = null;
    if (!!props.options) {
        options = props.options.map((option) => {
            return (
                <option
                    key={`option-${option.id}`}
                    value={option.id}
                >
                    {option.value}
                </option>
            );
        })
    }

    const disabled = !Array.isArray(props.options) || !props.options.length;

    return (
        <FormGroup controlid={`formgroup-${props.id}-selectbox`}>
            <ControlLabel>{props.label}</ControlLabel>
            <FormControl
                componentClass="select"
                placeholder={disabled ? _("Loading...") : props.placeholder}
                onChange={props.onChange}
                disabled={disabled}
                value={props.selected}
            >
                {options}
            </FormControl>
        </FormGroup>
    );
}

//***********************************************************************
SelectBox.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    placeholder: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(PropTypes.object),
    selected: PropTypes.string,
};

export default SelectBox;
