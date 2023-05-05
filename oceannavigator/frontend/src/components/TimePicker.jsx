import React, { useState, useEffect, forwardRef } from "react";
import { Button, Col, Row } from "react-bootstrap";
import Dropdown from "react-bootstrap/Dropdown";
import { InputGroup } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

import DailyCalendar from "./calendars/DailyCalendar.jsx";
import MonthlyCalendar from "./calendars/MonthlyCalendar.jsx";
import SeasonalCalendar from "./calendars/SeasonalCalendar.jsx";
import { GetTimestampsPromise } from "../remote/OceanNavigator.js";

import { withTranslation } from "react-i18next";

const CustomToggle = React.forwardRef(({ children, onClick }, ref) => (
  <div
    href=""
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
  >
    {children}
  </div>
));

function TimePicker(props) {
  const [timestamps, setTimestamps] = useState([]);
  const [data, setData] = useState([]);
  const [map, setMap] = useState({});
  const [revMap, setRevMap] = useState({});
  const [dateHours, setDateHours] = useState([]);
  const [climatology, setClimatology] = useState(false);

  useEffect(() => {
    if (!props.timestamps) {
      if (props.dataset.id && props.dataset.variable) {
        GetTimestampsPromise(props.dataset.id, props.dataset.variable).then(
          (result) => {
            setTimestamps(result.data);
          }
        );
      }
    } else {
      setTimestamps(props.timestamps);
    }
    if (props.dataset.id && props.dataset.id.includes("climatology")) {
      setClimatology(true);
    }
  }, [props]);

  useEffect(() => {
    let data = timestamps;

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
  }, [timestamps]);

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
      return climatology ? __("Winter") : `${__("Winter")} ${year - 1}`;
    } else if (new Date(year, 1, 29) <= time && time <= new Date(year, 3, 31)) {
      return climatology ? __("Spring") : `${__("Spring")} ${year}`;
    } else if (new Date(year, 4, 1) <= time && time <= new Date(year, 7, 31)) {
      return climatology ? __("Summer") : `${__("Summer")} ${year}`;
    } else {
      return climatology ? __("Fall") : `${__("Fall")} ${year}`;
    }
  };

  const getIndexFromTimestamp = (timestamp) => {
    return timestamps.findIndex((ts) => {
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

        calendar = (
          <DailyCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
          />
        );
        break;
      case "month":
        buttonText = climatology
          ? selectedDate.toLocaleDateString(undefined, {
              month: "long",
            })
          : selectedDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
            });

        calendar = (
          <MonthlyCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
            climatology={climatology}
          />
        );
        break;
      case "year":
        buttonText = selectedDate.getUTCFullYear();
        break;
      case "season":
        buttonText = getSeason(selectedDate);

        calendar = (
          <SeasonalCalendar
            selected={selectedDate}
            availableDates={Object.values(map)}
            onUpdate={handleCalendarInteraction}
            climatology={climatology}
          />
        );
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
  let dateSelector = (
    <div className="selector-container">
      <Button className="date-label">{buttonText}</Button>
      {hourDropdown}
    </div>
  );

  const formLayout = props.horizontalLayout ? Row : Col;

  return (
    <InputGroup className="timepicker" as={formLayout}>
      <label
        className={`timepicker-label ${
          props.horizontalLayout ? "horizontal" : ""
        }`}
      >
        {props.title}
      </label>
      <Dropdown drop={props.horizontalLayout ? "up" : "down"}>
        <div className="button-container">
          <Button
            className="header-button"
            disabled={currentIndex === 0}
            onClick={handlePrevTime}
          >
            {" "}
            <ChevronLeft />
          </Button>
          <Dropdown.Toggle as={CustomToggle}>{dateSelector}</Dropdown.Toggle>
          <Dropdown.Menu
            className="dropdown-menu"
            disabled={props.dataset.quantum === "year"}
          >
            {calendar}
          </Dropdown.Menu>
          <Button
            className="header-button"
            disabled={currentIndex === data.length - 1}
            onClick={handleNextTime}
          >
            <ChevronRight />
          </Button>
        </div>
      </Dropdown>
    </InputGroup>
  );
}

export default withTranslation()(TimePicker);
