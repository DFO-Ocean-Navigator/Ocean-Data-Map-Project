import React, { useEffect } from "react";
import PropTypes from "prop-types";

import TimeSlider from "./TimeSlider.jsx";
import TimePicker from "./TimePicker.jsx";

import { useGetDatasetTimestamps } from "../../remote/queries.js";

import { withTranslation } from "react-i18next";

function TimeSelector({
  dataset,
  updateDataset,
  updateQueryStatus,
  selectorType,
  horizontalLayout,
  enabled = true,
  t,
}) {
  const timestamps = useGetDatasetTimestamps(dataset, enabled);

  useEffect(() => {
    let timeIdx = timestamps.data.findIndex(
      (ts) => ts.id === dataset.time.id && ts.value === dataset.time.value
    );

    let starttimeIdx = timestamps.data.findIndex(
      (ts) =>
        ts.id === dataset.starttime.id && ts.value === dataset.starttime.value
    );

    if (timestamps.data.length > 0 && (timeIdx < 0 || starttimeIdx < 0)) {
      let time, starttime;
      let updateParent = dataset.time.updateParent || false;
      if (!dataset.time.value) {
        // no timestamp previously selected, so select the latest one
        time = timestamps.data[timestamps.data.length - 1];
        starttime = timestamps.data[timestamps.data.length - 21];
        updateParent = true;
      } else {
        // find timestamp nearest to previously selected
        time = timeIdx >= 0 ? dataset.time : findNearestTime(dataset.time);
        starttime =
          starttimeIdx >= 0
            ? dataset.starttime
            : findNearestTime(dataset.starttime);

        if (time.id <= starttime.id) {
          timeIdx = timestamps.data.findIndex((ts) => ts.value === time.value);
          if (timeIdx > 0) {
            starttime = timestamps.data[timeIdx - 1];
          } else if (
            timeIdx < timestamps.data.length - 1 &&
            selectorType === "range"
          ) {
            time = timestamps.data[timeIdx + 1];
          } else {
            starttime = timestamps.data[0];
          }
        }
      }
      updateDataset("time", time, updateParent);
      updateDataset("starttime", starttime, updateParent);
    }
    updateQueryStatus("timestamps", timestamps.status);
  }, [dataset, timestamps.status]);

  const findNearestTime = (timestamp) => {
    const testDate = new Date(timestamp.value);
    return timestamps.data.reduce((previous, current) => {
      const previousDiff = Math.abs(new Date(previous.value) - testDate);
      const currentDiff = Math.abs(new Date(current.value) - testDate);
      return currentDiff <= previousDiff ? current : previous;
    });
  };

  const updateTime = (key, value) => {
    value = parseInt(value);

    let time = dataset.time.id;
    let starttime = dataset.starttime.id;
    let timeIdx, starttimeIdx;

    const timestampIds = timestamps.data.map((ts) => {
      return ts.id;
    });

    switch (key) {
      case "time":
        timeIdx = timestampIds.indexOf(value);
        if (value < starttime || starttime < 0) {
          let starttime =
            timeIdx > 20 ? timestamps.data[timeIdx - 20] : timestamps.data[0];
          updateDataset("starttime", starttime);
        }
        updateDataset("time", timestamps.data[timeIdx]);
        break;
      case "starttime":
        timeIdx = timestampIds.indexOf(time);
        starttimeIdx = timestampIds.indexOf(value);
        if (time <= value) {
          starttimeIdx = timeIdx > 0 ? timeIdx - 1 : 0;
        }
        updateDataset("starttime", timestamps.data[starttimeIdx]);
        break;
    }
  };

  let timeSelector;
  switch (selectorType) {
    case "slider":
      timeSelector = (
        <TimeSlider
          key="time"
          id="time"
          dataset={dataset}
          timestamps={timestamps.data}
          selected={dataset.time.id}
          onChange={updateTime}
          loading={timestamps.isLoading}
        />
      );
      break;
    case "range":
      timeSelector = (
        <div>
          <TimePicker
            key="starttime"
            id="starttime"
            state={dataset.starttime.id}
            title={t("Start Time (UTC)")}
            onUpdate={updateTime}
            max={dataset.time.id}
            dataset={dataset}
            timestamps={timestamps.data}
          />
          <TimePicker
            key="time"
            id="time"
            state={dataset.time.id}
            title={t("End Time (UTC)")}
            onUpdate={updateTime}
            min={dataset.starttime.id}
            dataset={dataset}
            timestamps={timestamps.data}
          />
        </div>
      );
      break;
    default:
      timeSelector = (
        <TimePicker
          key="time"
          id="time"
          state={dataset.time.id}
          onUpdate={updateTime}
          title={t("Time (UTC)")}
          dataset={dataset}
          timestamps={timestamps.data}
          horizontalLayout={horizontalLayout}
        />
      );
  }

  return timeSelector;
}

//***********************************************************************
TimeSelector.propTypes = {
  dataset: PropTypes.object.isRequired,
  updateDataset: PropTypes.func.isRequired,
  updateQueryStatus: PropTypes.func.isRequired,
  selectorType: PropTypes.string,
  horizontalLayout: PropTypes.bool,
  enabled: PropTypes.bool,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(TimeSelector);
