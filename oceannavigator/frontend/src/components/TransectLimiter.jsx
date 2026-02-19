import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import NumberBox from "./NumberBox.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const TransectLimiter = ({
  id,
  title,
  parameter,
  state: propState,
  onUpdate,
  t: _,
  children,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const openHelp = () => setShowHelp(true);
  const closeHelp = () => setShowHelp(false);

  const initialLimit = !(isNaN(propState) || propState === false);
  const initialValue = initialLimit ? parseInt(propState, 10) : 200;

  const [limit, setLimit] = useState(initialLimit);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isNaN(propState) || propState === false) {
      setLimit(false);
      setValue(200);
    } else {
      setLimit(true);
      setValue(parseInt(propState, 10));
    }
  }, [propState]);

  const handleChecked = (e) => {
    const checked = e.target.checked;
    setLimit(checked);
    onUpdate(checked ? value : false);
  };

  const handleValueUpdate = (newValue) => {
    setValue(newValue);
    onUpdate(newValue);
  };

  return (
    <div className="TransectLimiter">
      <Form.Check
        type="checkbox"
        checked={limit}
        onChange={handleChecked}
        label={title}
        className="transect-title-row"
      />

      {limit && (
        <div className="threshold-block">
          <div className="parameter-label-row">
            <label className="parameter-label">{parameter}</label>

            {children && (
              <button
                type="button"
                className="help-btn"
                onClick={openHelp}
                aria-label={_("Open help for {{parameter}}", { parameter })}
              >
                ?
              </button>
            )}
          </div>

          <NumberBox
            id="depth"
            state={value}
            onUpdate={handleValueUpdate}
            title=""
            inputId={`${id}-depth`}
          />
        </div>
      )}

      <Modal show={showHelp} onHide={closeHelp} dialogClassName="helpdialog">
        <Modal.Header closeButton>
          <Modal.Title>{_("titlehelp", { title })}</Modal.Title>
        </Modal.Header>

        <Modal.Body>{children}</Modal.Body>

        <Modal.Footer>
          <Button onClick={closeHelp}>
            <Icon icon="close" /> {_(`Close`)}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

TransectLimiter.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string,
  parameter: PropTypes.string,
  state: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  onUpdate: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(TransectLimiter);