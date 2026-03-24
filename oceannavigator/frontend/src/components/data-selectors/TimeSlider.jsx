import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  memo,
} from "react";
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

import { useTranslation } from "react-i18next";

const thumbWidth = 13;
const trackOffset = 50;

const TimeSliderNavButton = memo(({ tooltipText, onClick, disabled, icon }) => {
  return (
    <OverlayTrigger
      placement="top"
      overlay={disabled ? <></> : <Tooltip>{tooltipText}</Tooltip>}
    >
      <span>
        <Button
          className="slider-nav-button"
          onClick={onClick}
          disabled={disabled}
        >
          {icon}
        </Button>
      </span>
    </OverlayTrigger>
  );
});

function TimeSlider({ id, dataset, timestamps, selected, onChange }) {
  const [thumbLeft, setThumbLeft] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState();
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [tickWidth, setTickWidth] = useState(70);

  const contentRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollTrackWidthRef = useRef(0);
  const scrollThumbRef = useRef(null);
  const draggingRef = useRef(false);
  const observer = useRef(null);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    updateTickContainerWidth();
  }, [timestamps.length]);

  useEffect(() => {
    if (timestamps.length === 0) return;

    let nextSelectedIndex = timestamps.findIndex((ts) => ts.id === selected.id);
    if (nextSelectedIndex >= 0 && nextSelectedIndex !== selectedIndex) {
      setSelectedIndex(nextSelectedIndex);
    }
  }, [timestamps.length, selected]);

  useEffect(() => {
    if (timestamps.length === 0 || selectedIndex === undefined) return;
    updateContentScroll(selectedIndex);
    let nextSelected = timestamps[selectedIndex].id;
    if (nextSelected !== selected.id) {
      onChange(id, nextSelected);
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
  }, [scrollSpeed]);

  useEffect(() => {
    document.addEventListener("mousemove", handleThumbMousemove);
    document.addEventListener("mouseup", handleThumbMouseup);
    document.addEventListener("mouseleave", handleThumbMouseup);
    return () => {
      document.removeEventListener("mousemove", handleThumbMousemove);
      document.removeEventListener("mouseup", handleThumbMouseup);
      document.removeEventListener("mouseleave", handleThumbMouseup);
    };
  }, [timestamps, tickWidth]);

  useEffect(() => {
    if (contentRef.current && scrollTrackRef.current) {
      let resizeTimer;
      observer.current = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const trackWidth = scrollTrackRef.current?.scrollWidth;
          if (trackWidth !== scrollTrackWidthRef.current) {
            updateTickContainerWidth();

            updateContentScroll(selectedIndex);
            scrollTrackWidthRef.current = trackWidth;
          }
        }, 250);
      });

      observer.current.observe(scrollTrackRef.current);
      return () => {
        clearTimeout(resizeTimer);
        if (scrollTrackRef.current)
          observer.current?.unobserve(scrollTrackRef.current);
      };
    }
  }, [selectedIndex]);

  const updateContentScroll = (tickIndex) => {
    // scroll to position of currently selected tick
    if (!contentRef.current) return;

    let contentScrollLeft = contentRef.current.scrollLeft;
    const trackWidth = scrollTrackRef.current.getBoundingClientRect().width;
    const tickPosX = (tickIndex + 0.5) * tickWidth + trackOffset;

    if (
      tickPosX < contentScrollLeft ||
      tickPosX > contentScrollLeft + trackWidth
    ) {
      contentRef.current.scroll({
        left: tickPosX - trackWidth / 2,
        behavior: "instant",
      });
      contentScrollLeft = contentRef.current.scrollLeft;
    }

    let nextThumbPosX = tickPosX - contentScrollLeft - thumbWidth / 2;
    setThumbLeft(nextThumbPosX);
  };

  const setMajorTick = (time) => {
    switch (dataset.quantum) {
      case "hour":
        return time.getUTCHours() === 0 || time.getUTCHours() === 12;
    }
    return true;
  };

  const updateTickContainerWidth = () => {
    if (!scrollTrackRef.current || timestamps.length === 0) return;

    let minTickWidth = 105;
    if (dataset.quantum === "hour" && dataset.id !== "giops_day") {
      minTickWidth = 35;
    }

    let nextTickWidth =
      Math.floor(scrollTrackRef.current.offsetWidth - 2 * trackOffset) /
      timestamps.length;
    if (nextTickWidth < minTickWidth || !Number.isFinite(nextTickWidth))
      nextTickWidth = minTickWidth;

    setTickWidth(nextTickWidth);
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
    if (tickIndex >= timestamps.length) tickIndex = timestamps.length - 1;
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

  const handleThumbMouseup = (e) => {
    // Stop dragging the thumb when the user releases the mouse button and snap to the nearest tick
    e.preventDefault();
    e.stopPropagation();
    if (draggingRef.current) {
      // determine nearest tick index
      const tickIndex = getNearestTickIndex(e.clientX);
      setSelectedIndex(tickIndex);
      updateContentScroll(tickIndex);

      // reset scroll speed
      setScrollSpeed(0);

      draggingRef.current = false;
    }
  };
  const handleThumbMousemove = (e) => {
    // scroll the content when dragging the thumb
    e.preventDefault();
    e.stopPropagation();
    if (draggingRef.current) {
      // get current position of scroll elements
      const trackRect = scrollTrackRef.current.getBoundingClientRect();
      const trackLeft = trackRect.x;
      const trackRight = trackRect.x + trackRect.width;
      const currentThumbLeft = scrollThumbRef.current.getBoundingClientRect().x;

      // get current mouse position and determine scroll direction
      const posX = e.clientX;
      const scrollDir = posX - currentThumbLeft > 0;

      // set scroll speed based on proximity to track edges
      let speed = 0;
      if (!scrollDir && posX < trackLeft + thumbWidth) {
        speed = -15;
      } else if (!scrollDir && posX < trackLeft + 70) {
        speed = -5;
      } else if (scrollDir && posX > trackRight - thumbWidth) {
        speed = 15;
      } else if (scrollDir && posX > trackRight - 70) {
        speed = 5;
      }
      setScrollSpeed(speed);

      // update the thumb position to follow the mouse, but constrain it within the track bounds
      let nextThumbPosX = posX;
      if (nextThumbPosX < trackLeft) nextThumbPosX = trackLeft;
      if (nextThumbPosX > trackRight - thumbWidth)
        nextThumbPosX = trackRight - thumbWidth;
      setThumbLeft(nextThumbPosX - trackLeft);
    }
  };

  const getFormattedTime = (timestr) => {
    // format a timestamp string based on the dataset's quantum and climatology settings
    let time = timestr;
    if (!(time instanceof Date)) time = new Date(timestr);
    if (isNaN(time)) {
      return "";
    }

    const isClimatology = dataset.id.includes("climatology");

    let formatter = {};
    switch (dataset.quantum) {
      case "season":
        return getSeason(time, isClimatology);
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
        formatter = isClimatology
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
    return time.toLocaleDateString(i18n.language, formatter);
  };

  const getSeason = (time, isClimatology) => {
    // assumes timestamp is not on boundary
    let year = time.getFullYear();
    if (new Date(year - 1, 10, 30) <= time && time <= new Date(year, 1, 29)) {
      return isClimatology ? t("Winter") : `${t("Winter")} ${year - 1}`;
    } else if (new Date(year, 1, 29) <= time && time <= new Date(year, 3, 31)) {
      return isClimatology ? t("Spring") : `${t("Spring")} ${year}`;
    } else if (new Date(year, 4, 1) <= time && time <= new Date(year, 7, 31)) {
      return isClimatology ? t("Summer") : `${t("Summer")} ${year}`;
    } else {
      return isClimatology ? t("Fall") : `${t("Fall")} ${year}`;
    }
  };

  const scrollbarTicks = useMemo(
    () =>
      timestamps.map((timestamp) => {
        let time = new Date(timestamp.value);
        let tickLabel;
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
                minWidth: `${tickWidth}px`,
                maxWidth: `${tickWidth}px`,
              }}
            >
              <div className={tickClass} />
              <span className="slider-major-tick-text">{tickLabel}</span>
            </div>
          </OverlayTrigger>
        );
      }),
    [timestamps, tickWidth],
  );

  const sliderThumb =
    timestamps.length === 0 ? null : (
      <OverlayTrigger
        key={`handle-overlay`}
        placement="top"
        overlay={
          <Tooltip id={`handle-tooltip`}>
            {timestamps.length > 0 && getFormattedTime(selected.value)}
          </Tooltip>
        }
      >
        <div
          className="slider-thumb"
          ref={scrollThumbRef}
          onMouseDown={handleThumbMousedown}
          style={{
            left: `${thumbLeft}px`,
            cursor: draggingRef.current ? "grabbing" : "grab",
          }}
        ></div>
      </OverlayTrigger>
    );

  // generate the left and right navigation buttons
  const nVisibleTicks = scrollTrackRef.current
    ? Math.round(
        scrollTrackRef.current.getBoundingClientRect().width / tickWidth,
      )
    : 1;
  const leftButtonIcons = [
    <ChevronBarLeft />,
    <ChevronDoubleLeft />,
    <ChevronLeft />,
  ];
  const leftButtons = [0, selectedIndex - nVisibleTicks, selectedIndex - 1].map(
    (index, i) => (
      <TimeSliderNavButton
        key={`left-button-${i}`}
        tooltipText={getFormattedTime(timestamps[index]?.value)}
        onClick={() => setSelectedIndex(index)}
        disabled={index === selectedIndex || index < 0}
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
    selectedIndex + nVisibleTicks,
    timestamps.length - 1,
  ].map((index, i) => (
    <TimeSliderNavButton
      key={`right-button-${i}`}
      tooltipText={getFormattedTime(timestamps[index]?.value)}
      onClick={() => setSelectedIndex(index)}
      disabled={index === selectedIndex || index >= timestamps.length}
      icon={rightButtonIcons[i]}
    />
  ));

  return (
    <div className="time-slider">
      <div className="nav-button-container">{leftButtons}</div>
      <div className="time-slider-container">
        <div
          className="slider-content-container"
          ref={contentRef}
          onClick={handleScrollClick}
        >
          {scrollbarTicks}
        </div>
        <div className="slider-scrollbar">
          <div className="slider-track-and-thumb">
            <div className="slider-track" ref={scrollTrackRef}></div>
            {sliderThumb}
          </div>
        </div>
      </div>
      <div className="nav-button-container">{rightButtons}</div>
    </div>
  );
}

export default TimeSlider;
