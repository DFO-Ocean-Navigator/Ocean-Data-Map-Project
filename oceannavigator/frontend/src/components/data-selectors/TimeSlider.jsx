import React, { useState, useEffect, useRef, useCallback } from "react";
import Button from "react-bootstrap/Button";
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

const thumbWidth = 13;
const trackOffset = 50;

function TimeSliderNavButton(props) {
  return (
    <OverlayTrigger
      placement="top"
      trigger={props.disabled ? null : ["hover", "focus"]}
      overlay={<Tooltip>{props.tooltipText}</Tooltip>}
    >
      <span>
        <Button
          className="slider-nav-button"
          onClick={props.onClick}
          disabled={props.disabled}
        >
          {props.icon}
        </Button>
      </span>
    </OverlayTrigger>
  );
}

function TimeSlider(props) {
  const [sliderTicks, setSliderTicks] = useState([]);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
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
    if (props.timestamps.length === 0) return;
    let nextSelectedIndex = props.timestamps.findIndex(
      (ts) => ts.id === props.selected.id,
    );

    if (nextSelectedIndex !== selectedIndex) {
      setSelectedIndex(nextSelectedIndex);
    }
  }, [props.selected]);

  useEffect(() => {
    if (props.timestamps.length === 0) return;
    updateContentScroll(selectedIndex);
    updateThumbPosition(selectedIndex);
    let nextSelected = props.timestamps[selectedIndex].id;
    if (nextSelected !== props.selected.id) {
      props.onChange(props.id, nextSelected);
    }
  }, [selectedIndex]);

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

  const updateContentScroll = (tickIndex) => {
    const contentScrollLeft = contentRef.current.scrollLeft;
    const trackWidth = scrollTrackRef.current.getBoundingClientRect().width;
    const tickPosX = tickIndex * tickWidth + tickWidth / 2;

    if (
      tickPosX < contentScrollLeft ||
      tickPosX > contentScrollLeft + trackWidth
    ) {
      contentRef.current.scrollBy({
        left: tickPosX - (contentScrollLeft + trackWidth / 2),
        behavior: "instant",
      });
    }
  };

  const updateThumbPosition = (tickIndex) => {
    const contentScrollLeft = contentRef.current.scrollLeft;
    const tickPosX = tickIndex * tickWidth + tickWidth / 2;

    let nextThumbPosX =
      tickPosX + trackOffset - contentScrollLeft - thumbWidth / 2;

    setThumbLeft(nextThumbPosX);
  };

  const getNearestTickIndex = (posX) => {
    const tickOffset = tickWidth / 2;
    const thumbOffset = thumbWidth / 2;

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

    return tickIndex;
  };

  const handleScrollClick = (e) => {
    // Update the selected index when a user clicks on the scroll area
    e.preventDefault();
    e.stopPropagation();
    const tickIndex = getNearestTickIndex(e.clientX);
    setSelectedIndex(tickIndex);
  };

  const handleThumbMousedown = (e) => {
    // Start dragging the thumb when the user clicks on it
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
  };

  const handleThumbMouseup = useCallback(
    // Stop dragging the thumb when the user releases the mouse button and snap to the nearest tick
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggingRef.current) {
        // determine nearest tick index
        const tickIndex = getNearestTickIndex(e.clientX);
        setSelectedIndex(tickIndex);

        // reset scroll speed
        setScrollSpeed(0);

        // update the position of the thumb to snap to the nearest tick
        updateThumbPosition(tickIndex);

        draggingRef.current = false;
      }
    },
    [draggingRef.current, thumbLeft, tickWidth],
  );

  const handleThumbMousemove = useCallback(
    // scroll the content when dragging the thumb
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

  const getFormattedTime = (timestr) => {
    // format a timestamp string based on the dataset's quantum and climatology settings
    let time = timestr;
    if (!(time instanceof Date)) time = new Date(timestr);
    if (isNaN(time)) {
      return "";
    }

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

  // generate the left and right navigation buttons
  const leftButtonIcons = [
    <ChevronBarLeft />,
    <ChevronDoubleLeft />,
    <ChevronLeft />,
  ];
  const leftButtons = [0, selectedIndex - 20, selectedIndex - 1].map(
    (index, i) => (
      <TimeSliderNavButton
        key={`left-button-${i}`}
        tooltipText={getFormattedTime(props.timestamps[index]?.value)}
        onClick={() => setSelectedIndex(index)}
        disabled={index === selectedIndex || index < 0 || props.loading}
        icon={leftButtonIcons[i]}
      />
    ),
  );

  const rightButtonIcons = [
    <ChevronRight />,
    <ChevronDoubleRight />,
    <ChevronBarRight />,
  ];
  const rightButtons = [
    selectedIndex + 1,
    selectedIndex + 20,
    props.timestamps.length - 1,
  ].map((index, i) => (
    <TimeSliderNavButton
      key={`right-button-${i}`}
      tooltipText={getFormattedTime(props.timestamps[index]?.value)}
      onClick={() => setSelectedIndex(index)}
      disabled={
        index === selectedIndex ||
        index >= props.timestamps.length ||
        props.loading
      }
      icon={rightButtonIcons[i]}
    />
  ));

  return (
    <div className="time-slider">
      <div className="button-container">{leftButtons}</div>
      <div className="time-slider-container">
        <div
          className="scroll-container"
          ref={contentRef}
          onClick={handleScrollClick}
        >
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
                  {props.timestamps.length > 0 &&
                    getFormattedTime(props.selected.value)}
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
      <div className="button-container">{rightButtons}</div>
    </div>
  );
}

export default withTranslation()(TimeSlider);
