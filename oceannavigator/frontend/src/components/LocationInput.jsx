import React, {useState, useEffect} from "react";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

function LocationInput(props) {
  const [latitude, setLatitude] = useState(parseFloat(props.state[0][0]).toFixed(4));
  const [longitude, setLongitude] = useState(parseFloat(props.state[0][1]).toFixed(4));

  useEffect(() => {
    let newLat = parseFloat(latitude).toFixed(4);
    let newLon = parseFloat(longitude).toFixed(4);
    let prevLat = props.state[0][0].toFixed(4);
    let prevLon = props.state[0][1].toFixed(4);

    if (
      !isNaN(newLat) &&
      !isNaN(newLon) &&
      (newLat !== prevLat || newLon !== prevLon)
    ) {
      const timer = setTimeout(() => {
        props.onUpdate(props.id, [[parseFloat(newLat), parseFloat(newLon)]]);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [latitude, longitude]);

  const changed = (key, e) => {
    switch (key) {
      case "latitude":
        setLatitude(e.target.value);
        break;
      case "longitude":
        setLongitude(e.target.value);
        break;
    }
  };

  return (
    <div key={props.url} className="LocationInput input">
      <h1 className="location-header">{props.title}</h1>
      <div className="tale-container">
        <table className="location-table">
          <tbody>
            <tr>
              <td>
                <label htmlFor={props.id + "_lat"}>{"Lat:"}</label>
              </td>
              <td>
                <input
                  className="location-input"
                  type="number"
                  value={latitude}
                  step={0.01}
                  onChange={(n, s) => changed("latitude", n)}
                  id={props.id + "_lat"}
                />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor={props.id + "_lon"}>{"Lon:"}</label>
              </td>
              <td>
                <input
                  className="location-input"
                  type="number"
                  value={longitude}
                  step={0.01}
                  onChange={(n, s) => changed("longitude", n)}
                  id={props.id + "_lon"}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

//***********************************************************************
LocationInput.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  onUpdate: PropTypes.func,
  state: PropTypes.array,
};

export default withTranslation()(LocationInput);
