import React, { useState, useEffect, forwardRef } from "react";
import PropTypes from "prop-types";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { Accordion, Row, Col } from "react-bootstrap";

import { withTranslation } from "react-i18next";

const CustomToggle = React.forwardRef(
  ({ children, className, onClick }, ref) => (
    <button
      href=""
      ref={ref}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      <label className="dd-toggle-label">{children}</label>
      <div className="dd-toggle-caret" />
    </button>
  )
);

const DropdownButton = forwardRef(({ children, onClick }, ref) => (
  <button
    className="dd-option-button"
    href=""
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    {children}
  </button>
));

function DatasetDropdown(props) {
  const [options, setOptions] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let dropdownItems = [];
    let menus = props.options.map((d) => d.group);
    menus = [...new Set(menus)];

    for (let menu of menus) {
      let datasets = props.options.filter((d) => {
        return d.group === menu;
      });
      let submenus = datasets.map((d) => d.subgroup);
      submenus = [...new Set(submenus)];

      let options = [];
      for (let submenu of submenus) {
        let subDatasets = datasets.filter((d) => {
          return d.subgroup === submenu;
        });
        options.push([
          <label key={`label_${submenu}`} className="dd-subgroup-label">
            {submenu}
          </label>,
          ...subDatasets.map((sd) => (
            <Dropdown.Item
              id={sd.id}
              key={sd.id}
              onClick={() => selectHandler(sd.id)}
              as={DropdownButton}
            >
              {sd.value}
            </Dropdown.Item>
          )),
        ]);
      }
      dropdownItems.push(
        <Accordion id={`accordion_${menu}`} key={`accordion_${menu}`}>
          <Accordion.Header>{menu}</Accordion.Header>
          <Accordion.Body className="dd-group">{options}</Accordion.Body>
        </Accordion>
      );
    }

    const newTitle = props.options.filter((d) => {
      return d.id === props.selected;
    })[0].value;

    setOptions(dropdownItems);
    setTitle(newTitle);
  }, []);

  useEffect(() => {
    const newTitle = props.options.filter((d) => {
      return d.id === props.selected;
    })[0].value;

    setTitle(newTitle);
  }, [props.selected]);

  const selectHandler = (dataset) => {
    props.onChange("dataset", dataset);
  };

  const formLayout = props.horizontalLayout ? Row : Col;

  return (
    <div className="dd-group">
      <InputGroup as={formLayout}>
        <Form.Label column>{props.label}</Form.Label>
        <Dropdown>
          <Dropdown.Toggle className={"dd-toggle"} as={CustomToggle}>
            {title}
          </Dropdown.Toggle>
          <Dropdown.Menu className="dd-menu">{options}</Dropdown.Menu>
        </Dropdown>
      </InputGroup>
    </div>
  );
}

//***********************************************************************
DatasetDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.string.isRequired,
  helpContent: PropTypes.arrayOf(PropTypes.object),
};

export default withTranslation()(DatasetDropdown);
