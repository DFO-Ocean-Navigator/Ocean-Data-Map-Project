import React, { useState, useEffect } from "react";
import { Button, Dropdown } from "react-bootstrap";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dateButton = React.forwardRef(
  ({ children, className, disabled, onClick, date }, ref) => (
    <button
      href=""
      ref={ref}
      id={date.join("-")}
      key={date.join("-")}
      className={className}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
    >
      {children}
    </button>
  )
);

const DailyCalendar = React.forwardRef((props, ref) => {
  // Helper functions sourced from https://blog.logrocket.com/react-custom-datepicker-step-by-step/
  const earliestDate = new Date(Math.min(...props.availableDates));
  const latestDate = new Date(Math.max(...props.availableDates));
  const [month, setMonth] = useState(props.selected.getMonth());
  const [year, setYear] = useState(props.selected.getFullYear());
  const [datesEnabled, setDatesEnabled] = useState([]);

  useEffect(() => {
    const [prevMonth, prevMonthYear] = getPreviousMonth(month, year);
    const [nextMonth, nextMonthYear] = getNextMonth(month, year);

    let availableDates = JSON.parse(JSON.stringify(props.availableDates));
    availableDates = availableDates.map((date) => new Date(date))

    let newDatesEnabled = availableDates.filter((date) => {
      let dateMonth = date.getMonth();
      let dateYear = date.getFullYear();

      return (
        (dateMonth === prevMonth && dateYear === prevMonthYear) ||
        (dateMonth === month && dateYear === year) ||
        (dateMonth === nextMonth && dateYear === nextMonthYear)
      );
    });
    setDatesEnabled(newDatesEnabled);
  }, [props.availableDates, month, year]);

  const getMonthDays = (month, year) => {
    const months30 = [3, 5, 8, 10];
    const leapYear = year % 4 === 0;
    return month === 1
      ? leapYear
        ? 29
        : 28
      : months30.includes(month)
        ? 30
        : 31;
  };

  const getPreviousMonth = (month, year) => {
    const prevMonth = month > 0 ? month - 1 : 11;
    const prevMonthYear = month > 0 ? year : year - 1;
    return [prevMonth, prevMonthYear];
  };

  const getNextMonth = (month, year) => {
    const nextMonth = month < 11 ? month + 1 : 1;
    const nextMonthYear = month < 11 ? year : year + 1;
    return [nextMonth, nextMonthYear];
  };

  const getMonthFirstDay = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const getCalendarDates = (month, year) => {
    // Get number of days in the month and the month's first day
    const monthDays = getMonthDays(month, year);
    const monthFirstDay = getMonthFirstDay(month, year);
    // Get number of days to be displayed from previous and next months
    // These ensure a total of 42 days (6 weeks) displayed on the calendar
    const daysFromPrevMonth = monthFirstDay;
    const daysFromNextMonth = 42 - (daysFromPrevMonth + monthDays);
    // Get the previous and next months and years
    const [prevMonth, prevMonthYear] = getPreviousMonth(month, year);
    const [nextMonth, nextMonthYear] = getNextMonth(month, year);
    // Get number of days in previous month
    const prevMonthDays = getMonthDays(prevMonth, prevMonthYear);
    // Builds dates to be displayed from previous month
    const prevMonthDates = [...new Array(daysFromPrevMonth)].map((n, index) => {
      const day = index + 1 + (prevMonthDays - daysFromPrevMonth);
      return [prevMonthYear, prevMonth, day];
    });
    // Builds dates to be displayed from current month
    const thisMonthDates = [...new Array(monthDays)].map((n, index) => {
      const day = index + 1;
      return [year, month, day];
    });
    // Builds dates to be displayed from next month
    const nextMonthDates = [...new Array(daysFromNextMonth)].map((n, index) => {
      const day = index + 1;
      return [nextMonthYear, nextMonth, day];
    });
    // Combines all dates from previous, current and next months
    return [...prevMonthDates, ...thisMonthDates, ...nextMonthDates];
  };

  const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => {
    return (
      <label key={`${day}_label`} className="day-label">
        {day}
      </label>
    );
  });

  const handleDateClick = (date) => {
    let selection = new Date(Date.UTC(date[0], date[1], date[2] + 1));
    props.onUpdate(selection);
  };

  const dates = getCalendarDates(month, year);

  const dateButtons = dates.map(function (date) {
    let style = "date-button-disabled";
    let disabled = true;
    let dateObj = new Date(...date);
    if (
      dateObj.getDate() === props.selected.getDate() &&
      dateObj.getMonth() === props.selected.getMonth() &&
      dateObj.getFullYear() === props.selected.getFullYear()
    ) {
      style = "date-selected";
      disabled = false;
    } else if (
      datesEnabled.find((date) => date.setHours(0) === dateObj.getTime())
    ) {
      style = "date-button-enabled";
      disabled = false;
    }
    return (
      <button
        id={date.join("-")}
        key={date.join("-")}
        className={style}
        disabled={disabled}
        onClick={() => handleDateClick(date)}
      >
        {date[2]}
      </button>
    );
  });

  const prevMonth = () => {
    const [prevMonth, prevMonthYear] = getPreviousMonth(month, year);
    setMonth(prevMonth);
    setYear(prevMonthYear);
  };

  const nextMonth = () => {
    const [nextMonth, nextMonthYear] = getNextMonth(month, year);
    setMonth(nextMonth);
    setYear(nextMonthYear);
  };

  let prevDisabled = true;
  if (
    (earliestDate.getUTCMonth() < month &&
      earliestDate.getUTCFullYear() === year) ||
    earliestDate.getUTCFullYear() < year
  ) {
    prevDisabled = false;
  }

  let nextDisabled = true;
  if (
    (latestDate.getUTCMonth() > month &&
      latestDate.getUTCFullYear() ===
      year) ||
    latestDate.getUTCFullYear() > year
  ) {
    nextDisabled = false;
  }

  return (
    <div ref={ref} className="daily-calendar-container">
      <div className="daily-calendar-header">
        <Button disabled={prevDisabled} onClick={prevMonth}>
          <ChevronLeft />
        </Button>
        <label>{`${MONTHS[month]} ${year}`}</label>
        <Button disabled={nextDisabled} onClick={nextMonth}>
          <ChevronRight />
        </Button>
      </div>
      <div className="daily-calendar">
        {dayLabels}
        {dateButtons}
      </div>
    </div>
  );
});

export default DailyCalendar;
