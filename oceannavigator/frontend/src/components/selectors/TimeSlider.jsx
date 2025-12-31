import React, { useState, useEffect } from "react";
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

import TimeSliderButton from "../TimeSliderButton.jsx";

import { withTranslation } from "react-i18next";

function TimeSlider(props) {
  const [minTick, setMinTick] = useState(0);
  const [maxTick, setMaxTick] = useState(1);
  const [nTicks, setNTicks] = useState(48);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [climatology, setClimatology] = useState(false);

  useEffect(() => {
    let newIndex = props.timestamps.findIndex((timestamp) => {
      return timestamp.id === props.selected;
    });
    if (newIndex >= 0 && newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);

      let newNTicks = 20;
      let newMinTick, newMaxTick;
      if (props.dataset.quantum === "hour") {
        newNTicks = 48;
      }
      if (props.timestamps.length < newNTicks) {
        newNTicks = props.timestamps.length;
      }

      setNTicks(newNTicks);

      if (props.timestamps.length < newNTicks) {
        newMinTick = 0;
        newMaxTick = props.timestamps.length;
      } else {
        newMinTick = newNTicks * Math.trunc(newIndex / newNTicks);
        newMaxTick = newMinTick + newNTicks;
      }

      if (props.dataset.id.includes("climatology")) {
        setClimatology(true);
      }
      setMinTick(newMinTick);
      setMaxTick(newMaxTick);
    }
  }, [props.selected, props.timestamps]);

  useEffect(() => {
    if (
      props.timestamps.length > 0 &&
      selectedIndex > 0 &&
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

  const SliderHandle = () => {
    if (selectedIndex > 0 && selectedIndex < props.timestamps.length) {
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

  const firstFrame = () => {
    if (props.timestamps.length > nTicks) {
      setMinTick(0);
      setMaxTick(nTicks);
    } else {
      setMinTick(0);
      setMaxTick(props.timestamps.length);
    }
  };

  const lastFrame = () => {
    if (props.timestamps.length - nTicks > 0) {
      setMinTick(props.timestamps.length - nTicks);
      setMaxTick(props.timestamps.length);
    } else {
      setMinTick(0);
      setMaxTick(props.timestamps.length);
    }
  };

  const prevFrame = () => {
    if (minTick >= nTicks) {
      setMinTick(minTick - nTicks);
      setMaxTick(minTick);
    } else if (props.timestamps.length > nTicks) {
      setMinTick(0);
      setMaxTick(nTicks);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const nextFrame = () => {
    if (props.timestamps.length - maxTick >= nTicks) {
      setMinTick(maxTick);
      setMaxTick(maxTick + nTicks);
    } else if (props.timestamps.length - nTicks > 0) {
      setMinTick(props.timestamps.length - nTicks);
      setMaxTick(props.timestamps.length);
    } else {
      setMinTick(0);
      setMaxTick(props.timestamps.length);
    }
  };

  const prevValue = () => {
    let newIdx = selectedIndex - 1;
    if (newIdx < minTick) {
      prevFrame();
    }
    setSelectedIndex(newIdx);
  };

  const nextValue = () => {
    let newIdx = selectedIndex + 1;
    if (newIdx >= maxTick) {
      nextFrame();
    }
    setSelectedIndex(newIdx);
  };

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

    let prevFrameIdx = minTick - nTicks;
    prevFrameIdx = prevFrameIdx < 0 ? 0 : prevFrameIdx;

    let nextFrameIdx = maxTick + nTicks;
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
        {sliderRail}
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
