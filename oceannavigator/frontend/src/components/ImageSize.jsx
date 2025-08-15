import React, { useState } from "react";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const ImageSize = ({ id, title, onUpdate, t: _ }) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(7);
  const [dpi, setDpi] = useState(144);
  
  const changed = (key, value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    if (key === "width") {
      setWidth(num);
      onUpdate("size", `${num}x${height}`);
    } else if (key === "height") {
      setHeight(num);
      onUpdate("size", `${width}x${num}`);
    } else if (key === "dpi") {
      setDpi(num);
      onUpdate("dpi", num);
    }
  };

  return (
    <div className="image-size">
      <h1 className="image-title">{title}</h1>
      <table className="image-table">
        <tbody>
          <tr>
            <td>
              <label htmlFor={`${id}_width`}>{_("Width:")}</label>
            </td>
            <td>
              <input
                className="size-input"
                id={`${id}_width`}
                type="number"
                value={width}
                onChange={(e) => changed("width", e.target.value)}
                step={0.25}
                min={0}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor={`${id}_height`}>{_("Height:")}</label>
            </td>
            <td>
              <input
                className="size-input"
                id={`${id}_height`}
                type="number"
                value={height}
                onChange={(e) => changed("height", e.target.value)}
                step={0.25}
                min={0}
              />
            </td>
          </tr>
          <tr>
            <td>
              <label htmlFor={`${id}_dpi`}>{_("DPI:")}</label>
            </td>
            <td>
              <input
                className="size-input"
                id={`${id}_dpi`}
                type="number"
                value={dpi}
                onChange={(e) => changed("dpi", e.target.value)}
                step={1}
                min={1}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
//***********************************************************************
ImageSize.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(ImageSize);