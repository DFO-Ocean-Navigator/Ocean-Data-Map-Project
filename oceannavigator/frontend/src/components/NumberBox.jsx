import React, { useState, useEffect, useRef } from "react";
import { Modal, Button } from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const NumberBox = ({ id, title, state: propState, onUpdate, children, t: _ }) => {
  const [value, setValue] = useState(propState);
  const [showHelp, setShowHelp] = useState(false);
  const timeoutRef = useRef(null);

  // Sync propState to local value
  useEffect(() => {
    setValue(propState);
  }, [propState]);

  const updateParent = () => {
    onUpdate(id, value);
  };

  const changed = (newVal) => {
    clearTimeout(timeoutRef.current);
    const num = Number(newVal);
    if (!isNaN(num)) {
      setValue(num);
    }
    timeoutRef.current = setTimeout(updateParent, 1250);
  };

  const keyPress = (e) => {
    if (e.key === "Enter") {
      changed(value);
      updateParent();
      e.preventDefault();
    }
  };

  const hasHelp = React.Children.count(children) > 0;

  return (
    <div className="NumberBox">
      <h1 className="numberbox-title">
        {title}
        {hasHelp && (
          <span className="help-button" onClick={() => setShowHelp(true)}>
            ?
          </span>
        )}
      </h1>

      <Modal
        show={showHelp}
        onHide={() => setShowHelp(false)}
        dialogClassName="helpdialog"
      >
        <Modal.Header closeButton>
          <Modal.Title>{_("titlehelp", { title })}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{children}</Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowHelp(false)}>
            <Icon icon="close" /> {_("Close")}
          </Button>
        </Modal.Footer>
      </Modal>

      <table className="numberbox-table">
        <tbody>
          <tr>
            <td>
              <input
                className="table-input"
                type="number"
                value={value}
                onChange={(e) => changed(e.target.value)}
                onKeyPress={keyPress}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

NumberBox.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.number,
  children: PropTypes.node,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(NumberBox);