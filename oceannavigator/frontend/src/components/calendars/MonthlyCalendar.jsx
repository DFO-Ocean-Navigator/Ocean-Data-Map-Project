import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

const MONTHS = [
  ["January", 0],
  ["February", 1],
  ["March", 2],
  ["April", 3],
  ["May", 4],
  ["June", 5],
  ["July", 6],
  ["August", 7],
  ["September", 8],
  ["October", 9],
  ["November", 10],
  ["December", 11],
];

const MONTH_OBJ = {};

function MonthlyCalendar(props) {
  const [year, setYear] = useState(props.selected.getFullYear());
  const [monthsEnabled, setMonthsEnabled] = useState([]);

  useEffect(() => {
    let monthsEnabled = props.availableDates.filter((date) => {
      return date.getFullYear() === year;
    });
    setMonthsEnabled(monthsEnabled);
  }, [year]);

  const prevYear = () => {
    setYear((year) => year - 1);
  };
  const nextYear = () => {
    setYear((year) => year + 1);
  };

  const handleMonthClick = (month) => {
    let selection = new Date(Date.UTC(year, month, 16));
    props.onUpdate(selection);
  };

  const monthButtons = MONTHS.map((month) => {
    let style = "date-button-disabled";
    let disabled = true;

    let dateObj = new Date(year, month[1], 16);

    if (
      dateObj.getMonth() === props.selected.getMonth() &&
      dateObj.getFullYear() === props.selected.getFullYear()
    ) {
      style = "date-selected";
      disabled = false;
    } else if (
      monthsEnabled.find(
        (date) => date.getMonth() === month[1] && date.getFullYear() === year
      )
    ) {
      style = "date-button-enabled";
      disabled = false;
    }

    return (
      <button
        id={`${month[1]}-${year}`}
        key={`${month[1]}-${year}`}
        className={style}
        disabled={disabled}
        onClick={() => handleMonthClick(month[1])}
      >
        {month[0]}
      </button>
    );
  });

  let prevDisabled = true;
  if (props.availableDates[0].getFullYear() < year) {
    prevDisabled = false;
  }

  let nextDisabled = true;
  if (
    props.availableDates[props.availableDates.length - 1].getFullYear() > year
  ) {
    nextDisabled = false;
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <Button disabled={prevDisabled} onClick={prevYear}>
          <ChevronLeft />
        </Button>
        <label className="calendar-header">{year}</label>
        <Button disabled={nextDisabled} onClick={nextYear}>
          <ChevronRight />
        </Button>
      </div>
      <div className="calendar">{monthButtons}</div>
    </div>
  );
}

export default MonthlyCalendar;
