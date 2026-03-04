import React, { useState, useEffect, useRef, useCallback } from "react";
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

const thumbWidth = 13;
const trackOffset = 50;

function TimeSlider(props) {
  const [sliderTicks, setSliderTicks] = useState([]);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(0);

  const [tickWidth, setTickWidth] = useState(35);

  const contentRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollThumbRef = useRef(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    let nextTickWidth =
      Math.floor(scrollTrackRef.current.offsetWidth - 2 * trackOffset) /
      props.timestamps.length;
    if (nextTickWidth < 35) nextTickWidth = 35;
    setTickWidth(nextTickWidth);

    const ticks = props.timestamps.map((timestamp) => {
      let time = new Date(timestamp.value);
      let tickLabel = null;
      let tickClass = "slider-minor-tick";
      let tooltipLabel = getFormattedTime(time);
      if (setMajorTick(time)) {
        tickLabel = tooltipLabel;
        tickClass = "slider-major-tick";
      }
      return (
        <OverlayTrigger
          key={`overlay-${timestamp.id}`}
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${timestamp.id}`}>{tooltipLabel}</Tooltip>
          }
        >
          <div
            key={`span-${timestamp.id}`}
            className="tick-container"
            style={{
              width: `${tickWidth}px`,
            }}
          >
            <div className={tickClass} />
            <span className="slider-major-tick-text">{tickLabel}</span>
          </div>
        </OverlayTrigger>
      );
    });
    setSliderTicks(ticks);
  }, [props.dataset, props.timestamps]);

  useEffect(() => {
    let selectedIndex = props.timestamps.findIndex(
      (ts) => ts.id === props.selected.id,
    );

    const contentScrollLeft = contentRef.current.scrollLeft;
    const tickOffset = tickWidth / 2;
    const thumbOffset = thumbWidth / 2;
    let nextThumbPosX =
      selectedIndex * tickWidth +
      tickOffset +
      trackOffset -
      contentScrollLeft -
      thumbOffset;

    setThumbLeft(nextThumbPosX);
  }, [props.selected]);

  useEffect(() => {
    if (scrollSpeed === 0) return;
    const interval = setInterval(() => {
      if (contentRef.current && draggingRef.current) {
        contentRef.current.scrollLeft += scrollSpeed;
      }
    }, 16);
    return () => clearInterval(interval);
  }, [scrollSpeed, draggingRef.current]);

  useEffect(() => {
    document.addEventListener("mousemove", handleThumbMousemove);
    document.addEventListener("mouseup", handleThumbMouseup);
    document.addEventListener("mouseleave", handleThumbMouseup);
    return () => {
      document.removeEventListener("mousemove", handleThumbMousemove);
      document.removeEventListener("mouseup", handleThumbMouseup);
      document.removeEventListener("mouseleave", handleThumbMouseup);
    };
  }, [handleThumbMousemove, handleThumbMouseup, props]);

  const setMajorTick = (time) => {
    return time.getUTCHours() === 0 || time.getUTCHours() === 12;
  };

  const getFormattedTime = (time) => {
    let formatter = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    };

    formatter["timeZone"] = "UTC";
    return time.toLocaleDateString(props.i18n.language, formatter);
  };

  const handleThumbMousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
  };

  const handleThumbMouseup = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggingRef.current) {
        const tickOffset = tickWidth / 2;
        const thumbOffset = thumbWidth / 2;

        const posX = e.clientX;
        const contentScrollLeft = contentRef.current.scrollLeft;
        const trackLeft = scrollTrackRef.current.getBoundingClientRect().x;

        // calculate the position of the thumb relative to the content
        // by accounting for the track's position, current scroll, and offsets
        const contentPos =
          contentScrollLeft + (posX - trackLeft) - trackOffset - tickOffset;

        // determine the index of the next timestamp
        let tickIndex = Math.round((contentPos + thumbOffset) / tickWidth);
        if (tickIndex >= props.timestamps.length)
          tickIndex = props.timestamps.length - 1;
        if (tickIndex < 0) tickIndex = 0;

        let nextSelected = props.timestamps[tickIndex].id;
        if (nextSelected !== props.selected.id) {
          props.onChange(props.id, nextSelected);
        }

        // update the position of the thumb to snap to the nearest tick
        let nextThumbPosX =
          tickIndex * tickWidth +
          tickOffset +
          trackOffset -
          contentScrollLeft -
          thumbOffset;

        setThumbLeft(nextThumbPosX);

        draggingRef.current = false;
      }
    },
    [draggingRef.current, thumbLeft, tickWidth],
  );

  const handleThumbMousemove = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggingRef.current) {
        // get current position of scroll elements
        const trackRect = scrollTrackRef.current.getBoundingClientRect();
        const trackLeft = trackRect.x;
        const trackRight = trackRect.x + trackRect.width;
        const thumbLeft = scrollThumbRef.current.getBoundingClientRect().x;

        // get current mouse position and determine scroll direction
        const posX = e.clientX;
        const scrollDir = posX - thumbLeft > 0;

        // set scroll speed based on proximity to track edges
        let speed = 0;
        if (!scrollDir && posX < trackLeft + 30) {
          speed = -15;
        } else if (!scrollDir && posX < trackLeft + 60) {
          speed = -5;
        } else if (scrollDir && posX > trackRight - 30) {
          speed = 15;
        } else if (scrollDir && posX > trackRight - 60) {
          speed = 5;
        }
        setScrollSpeed(speed);

        // update the thumb position to follow the mouse, but constrain it within the track bounds
        let nextThumbPosX = posX;
        if (nextThumbPosX < trackLeft) nextThumbPosX = trackLeft;
        if (nextThumbPosX > trackRight - 15)
          nextThumbPosX = trackRight - tickWidth / 2 + 2;
        setThumbLeft(nextThumbPosX - trackLeft);
      }
    },
    [draggingRef.current, thumbLeft, tickWidth],
  );

  let prevTime = null;
  let nextTime = null;
  let firstFrameTime = null;
  let lastFrameTime = null;
  let prevFrameTime = null;
  let nextFrameTime = null;

  return (
    <div className="time-slider">
      <div className="button-container">
        <TimeSliderButton
          tooltipText={firstFrameTime}
          // onClick={firstFrame}
          // disabled={minTick === 0 || props.loading}
          icon={<ChevronBarLeft />}
        />
        <TimeSliderButton
          tooltipText={prevFrameTime}
          // onClick={prevFrame}
          // disabled={minTick === 0 || props.loading}
          icon={<ChevronDoubleLeft />}
        />
        <TimeSliderButton
          tooltipText={prevTime}
          // onClick={prevValue}
          // disabled={selectedIndex === 0 || props.loading}
          icon={<ChevronLeft />}
        />
      </div>
      <div className="time-slider-container">
        <div className="scroll-container" ref={contentRef}>
          {sliderTicks}
        </div>
        <div className="custom-scrollbars__scrollbar">
          <div className="custom-scrollbars__track-and-thumb">
            <div
              className="custom-scrollbars__track"
              ref={scrollTrackRef}
            ></div>
            <OverlayTrigger
              key={`handle-overlay`}
              placement="top"
              overlay={
                <Tooltip id={`handle-tooltip`}>
                  {getFormattedTime(new Date(props.selected.value))}
                </Tooltip>
              }
            >
              <div
                className="custom-scrollbars__thumb"
                ref={scrollThumbRef}
                onMouseDown={handleThumbMousedown}
                style={{
                  left: `${thumbLeft}px`,
                  cursor: draggingRef.current ? "grabbing" : "grab",
                }}
              ></div>
            </OverlayTrigger>
          </div>
        </div>
      </div>
      <div className="button-container">
        <TimeSliderButton
          tooltipText={nextTime}
          // onClick={nextValue}
          // disabled={
          //   selectedIndex === props.timestamps.length - 1 || props.loading
          // }
          icon={<ChevronRight />}
        />
        <TimeSliderButton
          tooltipText={nextFrameTime}
          // onClick={nextFrame}
          // disabled={maxTick === props.timestamps.length || props.loading}
          icon={<ChevronDoubleRight />}
        />
        <TimeSliderButton
          tooltipText={lastFrameTime}
          // onClick={lastFrame}
          // disabled={maxTick === props.timestamps.length || props.loading}
          icon={<ChevronBarRight />}
        />
      </div>
    </div>
  );
}

export default withTranslation()(TimeSlider);
