import React, { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";

import Class4Calendar from "./calendars/Class4Calendar.jsx";
import { GetClass4Promise } from "../remote/OceanNavigator";

function Class4Window(props) {
  const [class4OPFiles, setClass4OPFiles] = useState([]);
  const [class4RAOFiles, setClass4RAOFiles] = useState([]);
  const [class4Type, setClass4Type] = useState("ocean_predict");

  useEffect(() => {
    GetClass4Promise().then(
      (result) => {
        setClass4OPFiles(
          result.data.ocean_predict.reduce(function (map, obj) {
            let date = new Date(obj.name);
            map[date.toISOString()] = obj.id;
            return map;
          }, {})
        );
        setClass4RAOFiles(
          result.data.riops_obs.reduce(function (map, obj) {
            let date = new Date(obj.name);
            map[date.toISOString()] = obj.id;
            return map;
          }, {})
        );
      },
      (error) => {
        console.error(error);
      }
    );
  }, []);

  const handleCalendarInteraction = (selected) => {
    let dateString = selected.toISOString()
    if (class4Type === "ocean_predict") {
      props.action("show", "class4", class4OPFiles[dateString], class4Type);
    } else if (class4Type === "riops_obs"){
      props.action("show", "class4", class4RAOFiles[dateString], class4Type);
    }
  };

  let timestamps = Object.keys(
    class4Type === "ocean_predict" ? class4OPFiles : class4RAOFiles
  );
  let dates = timestamps.map((ts)=>{return new Date(ts)})

  let calendar =
    timestamps.length > 0 ? (
      <Class4Calendar
        availableDates={dates}
        onUpdate={handleCalendarInteraction}
      />
    ) : null;

  return (
    <div className="Class4Window">
      <Form.Select
        value={class4Type}
        onChange={(e) => {
          setClass4Type(e.target.value);
        }}
      >
        <option value="ocean_predict">{"Ocean Predict"}</option>
        <option value="riops_obs">{"RIOPS Assimilated Observations"}</option>
      </Form.Select>
      {calendar}
    </div>
  );
}

export default Class4Window;
