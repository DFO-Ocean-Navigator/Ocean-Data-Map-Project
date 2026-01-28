import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import { Accordion, Dropdown, Form } from "react-bootstrap";

import { useGetDatasets } from "../../remote/queries";

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
      <label className="dataset-selector-toggle-label">{children}</label>
    </button>
  ),
);

const DropdownButton = forwardRef(({ children, onClick }, ref) => (
  <button
    className="dataset-selector-option-button"
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

function DatasetSelector({ updateDataset, selected, horizontalLayout, t }) {
  const datasets = useGetDatasets();

  const selectHandler = (dataset) => {
    let nextDataset = datasets.data.filter((d) => {
      return d.id === dataset;
    })[0];

    updateDataset("dataset", nextDataset);
  };

  let title = "";
  let dropdownItems = [];
  if (datasets.data.length > 0) {
    let menus = datasets.data.map((d) => d.group);
    menus = [...new Set(menus)];

    for (let menu of menus) {
      let groupDatasets = datasets.data.filter((d) => {
        return d.group === menu;
      });
      let submenus = groupDatasets.map((d) => d.subgroup);
      submenus = [...new Set(submenus)];

      let options = [];
      for (let submenu of submenus) {
        let subDatasets = groupDatasets.filter((d) => {
          return d.subgroup === submenu;
        });
        options.push([
          <label
            key={`label_${submenu}`}
            className="dataset-selector-subgroup-label"
          >
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
          <Accordion.Body className="dataset-selector-group">
            {options}
          </Accordion.Body>
        </Accordion>,
      );
    }

    title = datasets.data.filter((d) => {
      return d.id === selected;
    })[0].value;
  }

  return (
    <div
      className={`dataset-selector dataset-selector-${horizontalLayout ? "horizontal" : "vertical"}`}
    >
      <div className="dataset-selector-label-row">
        <h1 className="dataset-selector-label"> {t("Dataset")}</h1>
      </div>
      <Dropdown>
        <Dropdown.Toggle
          className="form-select dataset-selector-toggle"
          as={CustomToggle}
        >
          {title}
        </Dropdown.Toggle>
        <Dropdown.Menu className="dataset-selector-menu">
          {dropdownItems}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
}

//***********************************************************************
DatasetSelector.propTypes = {
  id: PropTypes.string.isRequired,
  updateDataset: PropTypes.func.isRequired,
  selected: PropTypes.string.isRequired,
  horizontalLayout: PropTypes.bool,
};

export default withTranslation()(DatasetSelector);
