import React, { useState, useEffect, useRef } from "react";
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

import TimeSliderButton from "./TimeSliderButton.jsx";

import { withTranslation } from "react-i18next";

function TimeSlider(props) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [climatology, setClimatology] = useState(false);

  const nTicksRef = useRef(20);

  useEffect(() => {
    let newIndex = props.timestamps.findIndex((timestamp) => {
      return timestamp.id === props.selected;
    });
    if (newIndex >= 0 && newIndex !== selectedIndex) {
      let nTicks = 20;
      if (props.dataset.quantum === "hour") {
        nTicks = 48;
      }
      if (props.timestamps.length < nTicks) {
        nTicks = props.timestamps.length;
      }

      nTicksRef.current = nTicks;

      setSelectedIndex(newIndex);

      if (props.dataset.id.includes("climatology")) {
        setClimatology(true);
      }
    }
  }, [props.selected, props.timestamps, props.dataset.quantum]);

  useEffect(() => {
    if (
      props.timestamps.length > 0 &&
      selectedIndex >= 0 &&
      parseInt(props.timestamps[selectedIndex].id) !== props.selected
    ) {
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

  const firstFrame = () => {
    setSelectedIndex(0);
  };

  const lastFrame = () => {
    setSelectedIndex(props.timestamps.length - 1);
  };

  const prevFrame = () => {
    let newIdx = selectedIndex - nTicksRef.current;
    if (newIdx < 0) {
      newIdx = 0;
    }
    setSelectedIndex(newIdx);
  };

  const nextFrame = () => {
    let newIdx = selectedIndex + nTicksRef.current;
    if (newIdx >= props.timestamps.length) {
      newIdx = props.timestamps.length - 1;
    }
    setSelectedIndex(newIdx);
  };

  const prevValue = () => {
    let newIdx = selectedIndex > 0 ? selectedIndex - 1 : 0;
    setSelectedIndex(newIdx);
  };

  const nextValue = () => {
    let newIdx =
      selectedIndex < props.timestamps.length - 1
        ? selectedIndex + 1
        : props.timestamps.length - 1;
    setSelectedIndex(newIdx);
  };

  let minTick, maxTick;
  if (props.timestamps.length < nTicksRef.current) {
    minTick = 0;
    maxTick = props.timestamps.length;
  } else {
    minTick = nTicksRef.current * Math.trunc(selectedIndex / nTicksRef.current);
    maxTick = minTick + nTicksRef.current;
  }

  const SliderHandle = () => {
    if (selectedIndex >= 0 && selectedIndex < props.timestamps.length) {
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

  const ticks = props.timestamps
    .slice(minTick, maxTick)
    .map((timestamp, index) => {
      let time = new Date(timestamp.value);
      let tickLabel = null;
      let tickClass = "slider-minor-tick";
      let tooltipLabel = getFormattedTime(time);
      index = index + minTick;
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

  let prevTime = null;
  let nextTime = null;
  let firstFrameTime = null;
  let lastFrameTime = null;
  let prevFrameTime = null;
  let nextFrameTime = null;

  if (props.timestamps.length > 0 && selectedIndex < props.timestamps.length) {
    let prevTimeIdx = selectedIndex - 1;
    prevTimeIdx = prevTimeIdx < 0 ? 0 : prevTimeIdx;

    let nextTimeIdx = selectedIndex + 1;
    nextTimeIdx =
      nextTimeIdx >= props.timestamps.length
        ? props.timestamps.length - 1
        : nextTimeIdx;

    let prevFrameIdx = minTick - nTicksRef.current;
    prevFrameIdx = prevFrameIdx < 0 ? 0 : prevFrameIdx;

    let nextFrameIdx = maxTick + nTicksRef.current;
    nextFrameIdx =
      nextFrameIdx >= props.timestamps.length
        ? props.timestamps.length - 1
        : nextFrameIdx;

    prevTime = getFormattedTime(new Date(props.timestamps[prevTimeIdx].value));
    nextTime = getFormattedTime(new Date(props.timestamps[nextTimeIdx].value));
    firstFrameTime = getFormattedTime(new Date(props.timestamps[0].value));
    lastFrameTime = getFormattedTime(
      new Date(props.timestamps[props.timestamps.length - 1].value)
    );
    prevFrameTime = getFormattedTime(
      new Date(props.timestamps[prevFrameIdx].value)
    );
    nextFrameTime = getFormattedTime(
      new Date(props.timestamps[nextFrameIdx].value)
    );
  }

  return (
    <div className="time-slider">
      <div className="button-container">
        <TimeSliderButton
          tooltipText={firstFrameTime}
          onClick={firstFrame}
          disabled={minTick === 0 || props.loading}
          icon={<ChevronBarLeft />}
        />
        <TimeSliderButton
          tooltipText={prevFrameTime}
          onClick={prevFrame}
          disabled={minTick === 0 || props.loading}
          icon={<ChevronDoubleLeft />}
        />
        <TimeSliderButton
          tooltipText={prevTime}
          onClick={prevValue}
          disabled={selectedIndex === 0 || props.loading}
          icon={<ChevronLeft />}
        />
      </div>
      <div className="slider-container">
        <div className="slider-rail" />
        {props.loading ? null : ticks}
      </div>
      <div className="button-container">
        <TimeSliderButton
          tooltipText={nextTime}
          onClick={nextValue}
          disabled={
            selectedIndex === props.timestamps.length - 1 || props.loading
          }
          icon={<ChevronRight />}
        />
        <TimeSliderButton
          tooltipText={nextFrameTime}
          onClick={nextFrame}
          disabled={maxTick === props.timestamps.length || props.loading}
          icon={<ChevronDoubleRight />}
        />
        <TimeSliderButton
          tooltipText={lastFrameTime}
          onClick={lastFrame}
          disabled={maxTick === props.timestamps.length || props.loading}
          icon={<ChevronBarRight />}
        />
      </div>
    </div>
  );
}

export default withTranslation()(TimeSlider);
