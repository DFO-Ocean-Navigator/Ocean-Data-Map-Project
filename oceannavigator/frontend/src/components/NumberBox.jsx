import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const NumberBox = ({state: propState, onUpdate, t: _ }) => {
  const [value, setValue] = useState(propState);
  const timeoutRef = useRef(null);

  // Sync propState to local value
  useEffect(() => {
    setValue(propState);
  }, [propState]);

  const updateParent = () => {
    onUpdate(value);
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

  return (
    <div className="NumberBox">

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