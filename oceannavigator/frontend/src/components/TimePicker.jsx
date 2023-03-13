import React, { useState, useEffect, useRef } from "react";
import { Button } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import {
  ChevronLeft,
  ChevronRight,
} from "react-bootstrap-icons";

import DailyCalendar from "./calendars/DailyCalendar.jsx";
import MonthlyCalendar from "./calendars/MonthlyCalendar.jsx";
import SeasonalCalendar from "./calendars/SeasonalCalendar.jsx";

function TimePicker(props) {
  const [data, setData] = useState([]);
  const [map, setMap] = useState({});
  const [revMap, setRevMap] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateHours, setDateHours] = useState([]);

  useEffect(() => {
    let data = props.timestamps;

    if (props.min) {
      data = data.filter((data) => {
        return data.id > props.min;
      });
    }

    if (props.max) {
      data = data.filter((data) => {
        return data.id < props.max;
      });
    }

    let map = {};
    let revMap = {};

    for (let i = 0; i < data.length; ++i) {
      const d1 = new Date(data[i].value);
      const d2 = new Date(d1.getTime() + d1.getTimezoneOffset() * 60000);
      let d3 = d2;
      if (props.dataset.quantum !== "hour") {
        d3 = new Date(
          Date.UTC(
            d1.getUTCFullYear(),
            d1.getUTCMonth(),
            d1.getUTCDate(),
            0,
            0,
            0,
            0
          )
        );
      }
      map[data[i].id] = d2;
      revMap[d3.toUTCString()] = data[i].id;
    }

    if (props.dataset.quantum === "hour") {
      let currentTime = new Date(map[props.state]);
      let hours = getHoursForDate(currentTime, map);
      setDateHours(hours);
    }

    setData(data);
    setMap(map);
    setRevMap(revMap);
  }, [props]);

  const zeroPad = (num) => {
    return num.toString().padStart(2, "0");
  };

  const getHoursForDate = (currentDate, map) => {
    let hours = Object.entries(map).filter((date) => {
      return (
        date[1].getDate() === currentDate.getDate() &&
        date[1].getMonth() === currentDate.getMonth() &&
        date[1].getFullYear() === currentDate.getFullYear()
      );
    });

    return hours;
  };

  const getSeason = (time) => {
    // assumes timestamp is not on boundary
    let year = time.getFullYear();
    if (new Date(year - 1, 10, 30) <= time && time <= new Date(year, 1, 29)) {
      return `Winter ${year - 1}`;
    } else if (new Date(year, 1, 29) <= time && time <= new Date(year, 3, 31)) {
      return `Spring ${year}`;
    } else if (new Date(year, 4, 1) <= time && time <= new Date(year, 7, 31)) {
      return `Summer ${year}`;
    } else {
      return `Fall ${year}`;
    }
  };

  const getMinMaxTimestamps = (data) => {
    let min = data[0].id;
    let max = data[data.length - 1].id;

    if ("min" in props) {
      min = getNextTimestamp(parseInt(props.min));
    }
    if ("max" in props) {
      max = getPrevTimestamp(parseInt(props.max));
    }

    if (!min) {
      min = data[0].id;
    }
    if (!max) {
      max = data[data.length - 1].id;
    }

    return [min, max];
  };

  const getNextTimestamp = (timestamp) => {
    const keys = Object.keys(map);
    const nextIndex = keys.indexOf(timestamp.toString()) + 1;
    return keys[nextIndex];
  };

  const getPrevTimestamp = (timestamp) => {
    const keys = Object.keys(map);
    const prevIndex = keys.indexOf(timestamp.toString()) - 1;
    return keys[prevIndex];
  };

  const getIndexFromTimestamp = (timestamp) => {
    return props.timestamps.findIndex((ts) => {
      return ts.id === timestamp;
    });
  };

  const getTimestampFromIndex = (index) => {
    const keys = Object.keys(map);
    if (index < 0) {
      return parseInt(keys[keys.length + index]);
    }

    return parseInt(keys[index]);
  };

  const handleDateClick = () => {
    setShowCalendar(!showCalendar);
  };

  const hourChanged = (e) => {
    props.onUpdate(props.id, e.target.value);
  };

  const handlePrevTime = () => {
    let currentIndex = getIndexFromTimestamp(props.state);
    if (currentIndex > 0) {
      props.onUpdate(props.id, getTimestampFromIndex(currentIndex - 1));
    }
  };

  const handleNextTime = () => {
    let currentIndex = getIndexFromTimestamp(props.state);
    if (currentIndex < data.length - 1) {
      props.onUpdate(props.id, getTimestampFromIndex(currentIndex + 1));
    }
  };

  const handleCalendarInteraction = (date) => {
    switch (props.dataset.quantum) {
      case "hour":
        let hours = getHoursForDate(date, map);
        setDateHours(hours);
        props.onUpdate(props.id, hours[hours.length - 1][0]);
        break;
      default:
        const utcDate = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        );
        props.onUpdate(props.id, revMap[utcDate.toUTCString()]);
        break;
    }
    setShowCalendar(!showCalendar)
  };

  let buttonText = "";
  let calendar = null;
  if (Object.keys(map).length > 0) {
    let selectedDate = new Date(map[props.state]);
    switch (props.dataset.quantum) {
      case "hour":
      case "day":
        buttonText = selectedDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        calendar = showCalendar ? (
          <DailyCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
          />
        ) : null;
        break;
      case "month":
        buttonText = selectedDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
        });

        calendar = showCalendar ? (
          <MonthlyCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
          />
        ) : null;
        break;
      case "year":
        buttonText = selectedDate.getUTCFullYear();
        break;
      case "season":
        buttonText = getSeason(selectedDate);

        calendar = showCalendar ? (
          <SeasonalCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
          />
        ) : null;
        break;
    }
  }

  let currentIndex = getIndexFromTimestamp(props.state);
  let hourDropdown = null;
  if (props.dataset.quantum === "hour") {
    const hourOptions = dateHours.map((date) => {
      return (
        <option key={date[0]} value={date[0]}>
          {zeroPad(date[1].getHours()) + ":00"}
        </option>
      );
    });

    hourDropdown = (
      <Form.Select
        className="hour-selector"
        onChange={hourChanged}
        value={props.state}
      >
        {hourOptions}
      </Form.Select>
    );
  }
  let headerButtons = (
    <div className="button-container">
      <Button
        className="header-button"
        disabled={currentIndex === 0}
        onClick={handlePrevTime}
      >
        <ChevronLeft />
      </Button>
      <Button className="date-label" onClick={handleDateClick}>
        {buttonText}
      </Button>
      {hourDropdown}
      <Button
        className="header-button"
        disabled={currentIndex === data.length - 1}
        onClick={handleNextTime}
      >
        <ChevronRight />
      </Button>
    </div>
  );

  return (
    <div className="timepicker">
      <label className="timepicker-label">{props.title}</label>
      <div className="button-container">{headerButtons}</div>
      {calendar}
    </div>
  );
}

export default TimePicker;
