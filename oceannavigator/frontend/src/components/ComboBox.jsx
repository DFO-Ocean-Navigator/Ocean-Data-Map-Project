import React, { useState, useEffect } from "react";
import axios from "axios";
import { Modal, Button, Form } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

function ComboBox({
  id,
  title,
  url,
  data: incomingData,
  state: propState,
  onUpdate,
  multiple = false,
  alwaysShow = false,
  def = "",
  children,
  t: _,
}) {
  const [optionsData, setOptionsData] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    populate();
  }, [url, incomingData]);

  function populate() {
    if (url) {
      axios
        .get(url)
        .then((res) => {
          let list = res.data.slice();
          const ids = list.map((d) => d.id);
          if (
            def === "quiverSelectorPresent" ||
            def === "contourSelectorPresent" ||
            (propState === "" && typeof propState === "string") ||
            propState === "none"
          ) {
            if (!ids.includes("none"))
              list.unshift({ id: "none", value: _("None") });
          }
          setOptionsData(list);
          normalizeAndNotify(list);
        })
        .catch((err) => console.error(url, err));
    } else if (Array.isArray(incomingData)) {
      setOptionsData(incomingData);
      normalizeAndNotify(incomingData);
    } else {
      setOptionsData([]);
    }
  }

  function normalizeAndNotify(list) {
    const a = list.map((d) => d.id);
    let value = propState;
    const f = parseFloat(value);
    const notIn = Array.isArray(value)
      ? value.some((v) => !a.includes(v) && !a.includes(parseFloat(v)))
      : !a.includes(value) && !a.includes(f);
    if (notIn || (propState === "" && list.length) || propState === "all") {
      if (multiple) {
        value =
          propState === "all"
            ? a
            : Array.isArray(propState)
            ? propState
            : [propState];
      }
    } else {
      if (list.length === 0) value = def;
      else if (list.length === 1) value = list[0].id;
      else if (multiple && !Array.isArray(propState)) value = [propState];
      else value = propState;
    }

    if (!multiple && !a.includes(value) && !a.includes(f) && list.length) {
      value = a.includes(0) ? 0 : a[0];
    }
    if (typeof onUpdate === "function") {
      onUpdate(id, value);
    }
  }

  function handleChange(e) {
    let value = e.target.value;
    if (multiple) {
      value = [];
      for (let opt of e.target.options) {
        if (opt.selected) value.push(opt.value);
      }
    }
    if (typeof onUpdate === "function") {
      const keys = [id],
        vals = [value];
      if (e.target.selectedIndex !== -1) {
        const ds = e.target.options[e.target.selectedIndex].dataset;
        for (let k in ds) {
          keys.push(id + "_" + k);
          vals.push(ds[k]);
        }
      }
      onUpdate(keys, vals);
    }
  }

  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  const opts = optionsData.map((o) => {
    const attrs = { key: o.id, value: o.id };
    for (let k in o) {
      if (k !== "id" && k !== "value" && o[k] != null) {
        attrs["data-" + k] = o[k];
      }
    }
    return <option {...attrs}>{o.value}</option>;
  });

  // only render if >1 entry or alwaysShow
  if (optionsData.length > 1 || alwaysShow) {
    let value = propState;
    if (multiple && value === "all") value = optionsData.map((d) => d.id);
    if (multiple && !Array.isArray(value)) value = [value];
    if (!multiple && Array.isArray(value)) value = value[0];

    const hasHelp =
      React.Children.count(children) > 0 ||
      (optionsData.length > 1 && optionsData[optionsData.length - 1].help);

    const helpBlocks =
      optionsData.length > 1 && optionsData[optionsData.length - 1].help
        ? optionsData.map((d) => (
            <p key={d.id}>
              <em>{d.value}</em>
              <span dangerouslySetInnerHTML={{ __html: d.help }} />
            </p>
          ))
        : null;

    return (
      <div className="ComboBox input">
        <div className="combobox-title-row">
          <h1 className="combobox-title">{title}</h1>
          {hasHelp && (
            <Button
              variant="link"
              className="combobox-help-button"
              onClick={openHelp}
              aria-label={_("Open help for {{title}}", { title })}
            >
              {_("?")}
            </Button>
          )}
        </div>

        <Modal show={showHelp} onHide={closeHelp} dialogClassName="helpdialog">
          <Modal.Header closeButton>
            <Modal.Title>{_("titlehelp", { title })}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {children}
            {helpBlocks}
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={closeHelp}>
              <Icon icon="close" /> {_(`Close`)}
            </Button>
          </Modal.Footer>
        </Modal>

        <Form.Select
          size={Math.min(10, multiple ? optionsData.length : 1)}
          value={value}
          onChange={handleChange}
          multiple={multiple}
        >
          {opts}
        </Form.Select>
      </div>
    );
  }

  return null;
}

ComboBox.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  url: PropTypes.string,
  data: PropTypes.array,
  state: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  onUpdate: PropTypes.func,
  multiple: PropTypes.bool,
  alwaysShow: PropTypes.bool,
  def: PropTypes.string,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(ComboBox);
