import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import {
  ChevronBarLeft,
  ChevronBarRight,
  ChevronLeft,
  ChevronDoubleLeft,
  ChevronRight,
  ChevronDoubleRight,
} from "react-bootstrap-icons";

import { withTranslation } from "react-i18next";

function TimeSlider(props) {
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const [nTicks, setNTicks] = useState(48);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [climatology, setClimatology] = useState(false);

  useEffect(() => {
    let newNTicks = 20;
    if (props.dataset.quantum === "hour") {
      newNTicks = 48;
    } else if (props.timestamps.length < newNTicks) {
      newNTicks = props.timestamps.length;
    }
    setMin(
      props.timestamps.length < newNTicks
        ? 0
        : props.timestamps.length - newNTicks
    );
    setMax(props.timestamps.length);
    let newIndex = props.timestamps.findIndex((timestamp) => {
      return timestamp.id === props.selected;
    });
    setSelectedIndex(newIndex);

    if (props.dataset.id.includes("climatology")) {
      setClimatology(true);
    }

    setNTicks(newNTicks);
  }, [props.timestamps]);

  useEffect(() => {
    if (props.timestamps.length > 0) {
      props.onChange(props.id, parseInt(props.timestamps[selectedIndex].id));
    }
  }, [selectedIndex]);

  const getFormattedTime = (time) => {
    let formatter = {};
    switch (props.dataset.quantum) {
      case "season":
        return getSeason(time);
      case "hour":
        formatter = {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hourCycle: "h23",
        };
        break;
      case "day":
        formatter = {
          year: "numeric",
          month: "numeric",
          day: "numeric",
        };
        break;
      case "month":
        formatter = climatology
          ? { month: "long" }
          : {
              year: "numeric",
              month: "short",
            };
        break;
      case "year":
        formatter = {
          year: "numeric",
        };
        break;
    }
    formatter["timeZone"] = "UTC";
    return time.toLocaleDateString(props.i18n.language, formatter);
  };

  const setMajorTick = (time) => {
    switch (props.dataset.quantum) {
      case "hour":
        return time.getUTCHours() === 0 || time.getUTCHours() === 12;
      case "day":
        return time.getUTCHours() === 0 || time.getUTCHours() === 12;
    }
    return true;
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

  const handleClick = (e) => {
    let newValue = Number(e.target.id);
    if (!isNaN(newValue) && e.target.className !== "slider-handle") {
      setSelectedIndex(newValue);
    }
  };

  const SliderHandle = () => {
    if (selectedIndex < props.timestamps.length) {
      let time = new Date(props.timestamps[selectedIndex].value);

      return (
        <OverlayTrigger
          key={`handle-overlay`}
          placement="top"
          overlay={
            <Tooltip id={`handle-tooltip`}>{getFormattedTime(time)}</Tooltip>
          }
        >
          <div className="slider-handle" />
        </OverlayTrigger>
      );
    }
  };

  const sliderRail = <div className="slider-rail" />;

  const ticks = props.timestamps.slice(min, max).map((timestamp, index) => {
    let time = new Date(timestamp.value);
    let tickLabel = null;
    let tickClass = "slider-minor-tick";
    let tooltipLabel = getFormattedTime(time);
    index = index + min;
    if (setMajorTick(time)) {
      tickLabel = tooltipLabel;
      tickClass = "slider-major-tick";
    }

    let thumb = null;
    if (timestamp.id === props.selected) {
      thumb = <SliderHandle />;
    }

    return (
      <OverlayTrigger
        key={`overlay-${index}`}
        placement="top"
        overlay={<Tooltip id={`tooltip-${index}`}>{tooltipLabel}</Tooltip>}
      >
        <div
          key={`span-${index}`}
          id={index}
          onClick={handleClick}
          className="slider-span"
        >
          <div key={`tick-${index}`} id={index} className={tickClass} />

          {thumb}
          <label className="slider-major-tick-text" id={index}>
            {tickLabel}
          </label>
        </div>
      </OverlayTrigger>
    );
  });

  const firstFrame = () => {
    if (props.timestamps.length > nTicks) {
      setMin(0);
      setMax(nTicks);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const lastFrame = () => {
    if (props.timestamps.length - nTicks > 0) {
      setMin(props.timestamps.length - nTicks);
      setMax(props.timestamps.length);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const prevFrame = () => {
    if (min >= nTicks) {
      setMin(min - nTicks);
      setMax(min);
    } else if (props.timestamps.length > nTicks) {
      setMin(0);
      setMax(nTicks);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const nextFrame = () => {
    if (props.timestamps.length - max >= nTicks) {
      setMin(max);
      setMax(max + nTicks);
    } else if (props.timestamps.length - nTicks > 0) {
      setMin(props.timestamps.length - nTicks);
      setMax(props.timestamps.length);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const prevValue = () => {
    setSelectedIndex(selectedIndex - 1);
  };

  const nextValue = () => {
    setSelectedIndex(selectedIndex + 1);
  };

  let firstFrameTime = null;
  let lastFrameTime = null;
  let prevFrameTime = null;
  let nextFrameTime = null;

  if (props.timestamps.length > 0) {
    let prevIdx = min - nTicks;
    prevIdx = prevIdx < 0 ? 0 : prevIdx;

    let nextIdx = max + nTicks;
    nextIdx =
      nextIdx >= props.timestamps.length
        ? props.timestamps.length - 1
        : nextIdx;

    firstFrameTime = getFormattedTime(new Date(props.timestamps[0].value));
    lastFrameTime = getFormattedTime(
      new Date(props.timestamps[props.timestamps.length - 1].value)
    );

    prevFrameTime = getFormattedTime(new Date(props.timestamps[prevIdx].value));
    nextFrameTime = getFormattedTime(new Date(props.timestamps[nextIdx].value));
  }

  return (
    <div className="time-slider">
      <div className="button-container">
        <OverlayTrigger
          key={`firstFrameButton-overlay`}
          placement="top"
          overlay={<Tooltip id="firsFrameButton">{firstFrameTime}</Tooltip>}
        >
          <span>
            <Button
              className="slider-button"
              onClick={firstFrame}
              disabled={min === 0 || props.loading}
            >
              <ChevronBarLeft />
            </Button>
          </span>
        </OverlayTrigger>
        <OverlayTrigger
          key={`prevFrameButton-overlay`}
          placement="top"
          overlay={<Tooltip id="prevFrameButton">{prevFrameTime}</Tooltip>}
        >
          <span>
            <Button
              className="slider-button"
              onClick={prevFrame}
              disabled={min === 0 || props.loading}
            >
              <ChevronDoubleLeft />
            </Button>
          </span>
        </OverlayTrigger>
        <Button
          className="slider-button"
          onClick={prevValue}
          disabled={selectedIndex === 0 || props.loading}
        >
          <ChevronLeft />
        </Button>
      </div>
      <div className="slider-container">
        {sliderRail}
        {props.loading ? null : ticks}
      </div>
      <div className="button-container">
        <Button
          className="slider-button"
          onClick={nextValue}
          disabled={
            selectedIndex === props.timestamps.length - 1 || props.loading
          }
        >
          <ChevronRight />
        </Button>
        <OverlayTrigger
          key={`nextFrameButton-overlay`}
          placement="top"
          overlay={<Tooltip id="nextFrameButton">{nextFrameTime}</Tooltip>}
        >
          <span>
            <Button
              className="slider-button"
              onClick={nextFrame}
              disabled={max === props.timestamps.length || props.loading}
            >
              <ChevronDoubleRight />
            </Button>
          </span>
        </OverlayTrigger>
        <OverlayTrigger
          key={`lastFrameButton-overlay`}
          placement="top"
          overlay={<Tooltip id="lastFrameButton">{lastFrameTime}</Tooltip>}
        >
          <span>
            <Button
              className="slider-button"
              onClick={lastFrame}
              disabled={max === props.timestamps.length || props.loading}
            >
              <ChevronBarRight />
            </Button>
          </span>
        </OverlayTrigger>
      </div>
    </div>
  );
}

export default withTranslation()(TimeSlider);
