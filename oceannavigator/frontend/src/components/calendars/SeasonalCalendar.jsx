import React, { forwardRef, useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { ChevronLeft, ChevronRight } from "react-bootstrap-icons";

const SEASONS = [
  ["Winter", 0],
  ["Spring", 1],
  ["Summer", 2],
  ["Fall", 3],
];

const SeasonalCalendar = forwardRef((props, ref) => {
  const [year, setYear] = useState(props.selected.getFullYear());
  const [seasonBounds, setSeasonBounds] = useState([]);
  const [datesEnabled, setDatesEnabled] = useState([]);

  useEffect(() => {
    // determine seasons using meterological bounds
    let currentYear = props.selected.getFullYear();
    let bounds = [
      new Date(currentYear, 1, year % 4 === 1 ? 28 : 29).getTime(), // winter end
      new Date(currentYear, 4, 31).getTime(), // spring end
      new Date(currentYear, 7, 31).getTime(), // summer end
      new Date(currentYear, 10, 30).getTime(), // fall end
    ];

    let datesEnabled = props.availableDates.filter((date) => {
      return date.getFullYear() === currentYear;
    });

    setYear(currentYear);
    setSeasonBounds(bounds);
    setDatesEnabled(datesEnabled);
  }, [year]);

  const prevYear = () => {
    setYear((year) => year - 1);
  };
  const nextYear = () => {
    setYear((year) => year + 1);
  };

  const handleSeasonClick = (date) => {
    props.onUpdate(date);
  };

  const dateInSeason = (date, seasonIdx) => {
    if (seasonIdx === 0) {
      return date.getTime() <= seasonBounds[seasonIdx];
    } else {
      return (
        date.getTime() > seasonBounds[seasonIdx - 1] &&
        date.getTime() <= seasonBounds[seasonIdx]
      );
    }
  };

  const seasonButtons = SEASONS.map((season) => {
    let style = "date-button-disabled";
    let disabled = true;

    let seasonDates = datesEnabled.filter((date) => {
      return dateInSeason(date, season[1]);
    });

    if (dateInSeason(props.selected, season[1])) {
      style = "date-selected";
      disabled = false;
    } else if (seasonDates.length > 0) {
      style = "date-button-enabled";
      disabled = false;
    }

    return (
      <button
        id={`${season[0]}-${year}`}
        key={`${season[0]}-${year}`}
        className={style}
        disabled={disabled}
        onClick={() => handleSeasonClick(seasonDates[0])}
      >
        {season[0]}
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
    <div ref={ref} className="calendar-container">
      <div className="calendar-header">
        <Button disabled={prevDisabled} onClick={prevYear}>
          <ChevronLeft />
        </Button>
        <label className="calendar-header">{year}</label>
        <Button disabled={nextDisabled} onClick={nextYear}>
          <ChevronRight />
        </Button>
      </div>
      <div className="calendar">{seasonButtons}</div>
    </div>
  );
});

export default SeasonalCalendar;
