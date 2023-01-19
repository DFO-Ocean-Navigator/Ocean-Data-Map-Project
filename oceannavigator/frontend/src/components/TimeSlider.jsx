import React, { useState, useEffect } from "react";
import Slider from 'rc-slider';

import { GetTimestampsPromise } from "../remote/OceanNavigator";

function TimeSlider(props) {
  const [timestamps, setTimestamps] = useState({});
  const [min, setMin] = useState(null);
  const [max, setMax] = useState(null);

  useEffect(() => {
    GetTimestampsPromise(props.dataset.dataset, props.dataset.variable).then(
      (timeResult) => {
        let timestamps = {};
        timeResult.data.map((data) => {
          timestamps[data.id] = formatDatetime(data.value);
        });
        setTimestamps(timestamps);
        setMin(Object.keys(timestamps)[0]);
        setMax(Object.keys(timestamps)[Object.keys(timestamps).length - 1]);
      }
    )
  }, [])

  const formatDatetime = (datetime) => {
    datetime = new Date(datetime)
    let options = {};
    switch (props.dataset.quantum) {
      case "season":
        return datetime = datetime;
      case "hour":
        options = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        };
        break;
      case "day":
        options = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        };
        break;
      case "month":
        options = {
          year: 'numeric',
          month: 'short',
        };
        break;
      case "year":
        options = {
          year: 'numeric',
          month: 'short',
        };
        break;
    }
    
    return datetime.toLocaleDateString(undefined, options);
  };

  const update = (key, value) => {
    console.log([key, value])
  }

  return (
    <Slider
      min={min}
      max={max}
      marks={timestamps}
      step={null}
      onChange={update}
      defaultValue={max}
    />
  );
};

export default TimeSlider  