import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Icon from "./Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

import { useGetComboBoxQuery } from "../../remote/queries.js";

function ComboBox({
  id,
  label,
  options = [],
  placeholder = "",
  selected,
  onChange,
  multiple = false,
  includeNone = false,
  alwaysShow = false,
  horizontalLayout = false,
  children,
  t: _,
}) {
  const [showHelp, setShowHelp] = useState(false);

  let optionsData = [...options];
  includeNone && optionsData.unshift({ id: "", value: _("None") });

  const handleChange = (e) => {
    let nextSelected = e.target.value;
    if (multiple) {
      nextSelected = [];
      for (let opt of e.target.options) {
        if (opt.selected) nextSelected.push(opt.value);
      }
    }

    onChange(id, nextSelected);
  };

  const optionElements = optionsData.map((opt) => (
    <option key={`option-${opt.id}`} value={opt.id}>
      {opt.value}
    </option>
  ));

  if (optionElements.length > 1 || alwaysShow) {
    const hasHelp =
      React.Children.count(children) > 0 ||
      (optionsData.length > 1 && optionsData[optionsData.length - 1].help);

    const helpOptions =
      optionsData.length > 1 && optionsData[optionsData.length - 1].help
        ? optionsData.map((d) => (
            <p key={d.id}>
              <em>{d.value}</em>
              <span dangerouslySetInnerHTML={{ __html: d.help }} />
            </p>
          ))
        : null;

    return (
      <div
        className={`combobox combobox-${horizontalLayout ? "horizontal" : "vertical"}`}
      >
        <div className="combobox-label-row">
          <h1 className="combobox-label">{label}</h1>
          {hasHelp && (
            <Button
              variant="link"
              className="combobox-help-button"
              onClick={() => setShowHelp(true)}
              aria-label={_("Open help for {{label}}", { label })}
            >
              {_("?")}
            </Button>
          )}
        </div>

        <Modal
          show={showHelp}
          onHide={() => setShowHelp(false)}
          dialogClassName="helpdialog"
        >
          <Modal.Header closeButton>
            <Modal.Title>{_("titlehelp", { title: label })}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {children}
            {helpOptions}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setShowHelp(false)}>
              <Icon icon="close" /> {_("Close")}
            </Button>
          </Modal.Footer>
        </Modal>

        <Form.Select
          className={`combobox-select ${multiple ? "combobox-select-multiple" : ""}`}
          size={Math.min(10, multiple ? optionElements.length : 1)}
          placeholder={placeholder}
          value={selected}
          onChange={handleChange}
          multiple={multiple}
        >
          {optionElements}
        </Form.Select>
      </div>
    );
  }
}

ComboBox.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.array.isRequired,
  selected: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]).isRequired,
  onChange: PropTypes.func.isRequired,
  multiple: PropTypes.bool,
  includeNone: PropTypes.bool,
  alwaysShow: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  placeholder: PropTypes.string,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(ComboBox);
