import React, { useState, useEffect, useRef } from "react";
import { Button, ButtonGroup } from "react-bootstrap";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import {
  ChevronLeft,
  ChevronDoubleLeft,
  ChevronRight,
  ChevronDoubleRight,
} from "react-bootstrap-icons";

function TimeSlider(props) {
  const [min, setMin] = useState(0);
  const [max, setMax] = useState(1);
  const [selected, setSelected] = useState(1);
  const containerRef = useRef();

  useEffect(() => {
    setMin(props.timestamps.length < 50 ? 0 : props.timestamps.length - 50);
    setMax(props.timestamps.length);
    setSelected(props.timestamps.length - 1);
  }, [props.timestamps]);

  useEffect(() => {
    if (props.timestamps.length > 0) {
      props.onChange(props.id, parseInt(props.timestamps[selected].id));
    }
  }, [selected]);

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
        formatter = {
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
    return time.toLocaleDateString(undefined, formatter);
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
    if (new Date(year - 1, 11, 22) <= time && time <= new Date(year, 2, 20)) {
      return `Winter ${year - 1}`;
    } else if (new Date(year, 2, 20) <= time && time <= new Date(year, 5, 20)) {
      return `Spring ${year}`;
    } else if (new Date(year, 5, 21) <= time && time <= new Date(year, 8, 22)) {
      return `Summer ${year}`;
    } else {
      return `Fall ${year}`;
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrop = (e) => {
    let newValue = Number(e.target.id);
    if (!isNaN(newValue)) {
      setSelected(newValue);
    }
  };

  const handleClick = (e) => {
    let newValue = Number(e.target.id);
    if (!isNaN(newValue) && e.target.className !== "slider-handle") {
      setSelected(newValue);
    }
  };

  const SliderHandle = () => {
    let time = new Date(props.timestamps[selected].value);

    return (
      <OverlayTrigger
        key={`handle-overlay`}
        placement="top"
        container={containerRef}
        overlay={
          <Tooltip id={`handle-tooltip`}>{getFormattedTime(time)}</Tooltip>
        }
      >
        <div draggable className="slider-handle" />
      </OverlayTrigger>
    );
  };

  const sliderRail = <div className="slider-rail" />;

  const ticks = props.timestamps.slice(min, max).map((timestamp, index) => {
    let time = new Date(timestamp.value);
    let tickLabel = null;
    let tickClass = "slider-minor-tick";
    let tooltipLabel = getFormattedTime(time);
    if (setMajorTick(time)) {
      tickLabel = tooltipLabel;
      tickClass = "slider-major-tick";
    }

    let thumb = null;
    if (index === selected) {
      thumb = <SliderHandle />;
    }

    return (
      <OverlayTrigger
        key={`overlay-${index}`}
        placement="top"
        container={containerRef}
        overlay={<Tooltip id={`tooltip-${index}`}>{tooltipLabel}</Tooltip>}
      >
        <div
          key={`span-${index}`}
          id={index}
          onDragOver={onDragOver}
          onTouchMove={onDragOver}
          onTouchEnd={onDrop}
          onDrop={onDrop}
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

  const prevFrame = () => {
    if (min >= 50) {
      setMin(min - 50);
      setMax(min);
    } else if (props.timestamps.length > 50) {
      setMin(0);
      setMax(50);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const nextFrame = () => {
    if (props.timestamps.length - max >= 50) {
      setMin(max);
      setMax(max + 50);
    } else if (props.timestamps.length - 50 > 0) {
      setMin(props.timestamps.length - 50);
      setMax(props.timestamps.length);
    } else {
      setMin(0);
      setMax(props.timestamps.length);
    }
  };

  const prevValue = () => {
    setSelected(selected - 1);
  };

  const nextValue = () => {
    setSelected(selected + 1);
  };

  return (
    <div className="time-slider">
      <div className="button-container">
        <Button
          className="slider-button"
          onClick={prevFrame}
          disabled={min === 0 || props.loading}
        >
          <ChevronDoubleLeft />
        </Button>
        <Button
          className="slider-button"
          onClick={prevValue}
          disabled={selected === 0 || props.loading}
        >
          <ChevronLeft />
        </Button>
      </div>
      <div className="slider-container" ref={containerRef}>
        {sliderRail}
        {props.loading ? null : ticks}
      </div>
      <div className="button-container">
        <Button
          className="slider-button"
          onClick={nextValue}
          disabled={selected === props.timestamps.length - 1 || props.loading}
        >
          <ChevronRight />
        </Button>
        <Button
          className="slider-button"
          onClick={nextFrame}
          disabled={max === props.timestamps.length || props.loading}
        >
          <ChevronDoubleRight />
        </Button>
      </div>
    </div>
  );
}

export default TimeSlider;
