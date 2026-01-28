import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

import { useGetComboBoxQuery } from "../remote/queries.js";

function ComboBox({
  id,
  label,
  url = null,
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

  let optionsData = options;
  if (options.length === 0 && url) {
    const response = useGetComboBoxQuery(url);
    optionsData = [...response.data];
  }
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

  const selectOptions = optionsData.map((opt) => (
    <option key={`option-${opt.id}`} value={opt.id}>
      {opt.value}
    </option>
  ));

  if (options.length > 1 || alwaysShow) {
    const hasHelp = false;
    const helpOptions = null;
    return (
      <div className="ComboBox input">
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
            <Modal.Title>{_("titlehelp", { label })}</Modal.Title>
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
          className={
            horizontalLayout ? "form-select-horizontal" : "form-select"
          }
          size={Math.min(10, multiple ? options.length : 1)}
          placeholder={placeholder}
          value={selected}
          onChange={handleChange}
          multiple={multiple}
        >
          {selectOptions}
        </Form.Select>
      </div>
    );
  }
}

ComboBox.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  url: PropTypes.string,
  options: PropTypes.array,
  selected: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  onChange: PropTypes.func,
  multiple: PropTypes.bool,
  includeNone: PropTypes.bool,
  alwaysShow: PropTypes.bool,
  horizontalLayout: PropTypes.bool,
  placeholder: PropTypes.string,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(ComboBox);
