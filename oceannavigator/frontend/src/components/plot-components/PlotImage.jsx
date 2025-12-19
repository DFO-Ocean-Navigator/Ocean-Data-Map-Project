import React, { useState, useRef } from "react";
import {
  Button,
  ButtonToolbar,
  Modal,
  Dropdown,
  DropdownButton,
  Spinner,
} from "react-bootstrap";
import Icon from "../lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

import { usePlotImageQuery } from "../../remote/queries.js";

const FAIL_IMAGE = require("../fail.js");

const PlotImage = ({
  plotType,
  query,
  permlink_subquery,
  featureId,
  action,
  size,
  dpi,
  t,
}) => {
  const imagelinkRef = useRef();
  const [showImagelink, setShowImagelink] = useState(false);

  const image = usePlotImageQuery(featureId, plotType, query);

  // Generate API script
  const generateScript = (language) => {
    const [type, newQuery] = generateQuery(query);

    const querystring = encodeURIComponent(JSON.stringify(newQuery));

    const scriptType = language.includes("Plot") ? "plot" : "csv";
    const scriptLang = language.startsWith("python") ? "python" : "r";

    window.location.href =
      `${window.location.origin}/api/v2.0/generate_script?query=${querystring}` +
      `&plot_type=${encodeURIComponent(type)}` +
      `&lang=${encodeURIComponent(scriptLang)}` +
      `&script_type=${encodeURIComponent(scriptType)}`;
  };

  // Generate type and query object from props.query
  const generateQuery = (q) => {
    let newQuery = {};

    switch (q.type) {
      case "profile":
      case "ts":
      case "sound":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          variable: q.variable,
          station: q.point,
          showmap: q.showmap,
          time: q.time,
          variable_range: q.variable_range,
        };
        break;
      case "timeseries":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          showmap: q.showmap,
          station: q.point,
          variable: q.variable,
          variable_range: q.variable_range,
          depth: q.depth,
          starttime: q.starttime,
          endtime: q.endtime,
          colormap: q.colormap,
          interp: q.interp,
          radius: q.radius,
          neighbours: q.neighbours,
        };
        break;
      case "transect":
        newQuery = {
          dataset: q.dataset,
          name: q.name,
          variable: q.variable,
          time: q.time,
          scale: q.scale,
          path: q.path,
          showmap: q.showmap,
          surfacevariable: q.surfacevariable,
          linearthresh: q.linearthresh,
          depth_limit: q.depth_limit,
          colormap: q.colormap,
          selectedPlots: q.selectedPlots,
          profile_distance: q.profile_distance,
        };

        if (q.compare_to) {
          newQuery.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.attribution,
            dataset_quantum: q.compare_to.quantum,
            time: q.compare_to.time,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            variable: q.compare_to.variable,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
        break;
      case "hovmoller":
        newQuery = {
          dataset: q.dataset,
          name: q.name,
          variable: q.variable,
          starttime: q.starttime,
          endtime: q.endtime,
          scale: q.scale,
          colormap: q.colormap,
          path: q.path,
          depth: q.depth,
          showmap: q.showmap,
        };

        if (q.compare_to) {
          newQuery.compare_to = {
            variable: q.compare_to.variable,
            starttime: q.compare_to.starttime,
            endtime: q.compare_to.endtime,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            depth: q.compare_to.depth,
            dataset: q.compare_to.dataset,
            dataset_quantum: q.compare_to.quantum,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
        break;
      case "map":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          variable: q.variable,
          time: q.time,
          scale: q.scale,
          depth: q.depth,
          colormap: q.colormap,
          area: q.area,
          projection: q.projection,
          bathymetry: q.bathymetry,
          quiver: q.quiver,
          contour: q.contour,
          showarea: q.showarea,
          interp: q.interp,
          radius: q.radius,
          neighbours: q.neighbours,
        };

        if (q.compare_to) {
          newQuery.compare_to = {
            dataset: q.compare_to.dataset,
            dataset_attribution: q.compare_to.dataset_attribution,
            dataset_quantum: q.compare_to.dataset_quantum,
            time: q.compare_to.time,
            variable: q.compare_to.variable,
            depth: q.compare_to.depth,
            scale: q.compare_to.scale,
            scale_diff: q.compare_to.scale_diff,
            colormap: q.compare_to.colormap,
            colormap_diff: q.compare_to.colormap_diff,
          };
        }
        break;
      case "track":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          variable: q.variable,
          depth: q.depth,
          track: q.track,
          showmap: q.showmap,
          latlon: q.latlon,
          trackvariable: q.trackvariable,
          starttime: q.starttime,
          endtime: q.endtime,
          track_quantum: q.track_quantum,
        };
        break;
      case "class4":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          class4id: q.class4id,
          class4type: q.class4type,
          forecast: q.forecast,
          error: q.error,
          showmap: q.showmap,
          climatology: q.climatology,
          models: q.models,
        };

        break;
      case "observation":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          observation: q.observation,
          observation_variable: q.observation_variable,
          variable: q.variable,
        };

        break;
      case "stick":
        newQuery = {
          dataset: q.dataset,
          names: q.names,
          station: q.point,
          variable: q.variable,
          depth: q.depth,
          starttime: q.starttime,
          endtime: q.endtime,
        };

        break;
      default:
        newQuery = { ...q };
    }
    return [q.type, newQuery];
  };

  // Build URL from query
  const urlFromQuery = (q) => {
    const [type, qry] = generateQuery(q);
    return `/api/v2.0/plot/${type}?query=${encodeURIComponent(
      JSON.stringify(qry)
    )}`;
  };

  // Toggle image link modal
  const toggleImageLink = () => setShowImagelink((prev) => !prev);

  // Save image handler
  const saveImage = (format) => {
    let link = `${urlFromQuery(query)}&save=True&format=${format}`;
    if (!["odv", "csv"].includes(format)) {
      link += `&size=${size}&dpi=${dpi}`;
    }
    window.location.href = link;
  };

  // Handle link actions
  const getLink = (key) => {
    if (key === "web") action("permalink", permlink_subquery);
    if (key === "image") toggleImageLink();
    if (key === "script") generateScript();
  };

  // Auto-select link textarea
  const onLinkModalEntered = () => {
    imagelinkRef.current.style.height =
      imagelinkRef.current.scrollHeight + 5 + "px";
    imagelinkRef.current.select();
  };

  let imageElement = <Spinner animation="border" variant="primary" />;
  if (image.isError) {
    imageElement = <img src={FAIL_IMAGE} alt="Plot" />;
  } else if (image.data) {
    imageElement = <img src={image.data} alt="Plot" />;
  }

  return (
    <div className="PlotImage">
      <div className="RenderedImage">{imageElement}</div>
      <ButtonToolbar className="button-bar">
        <DropdownButton
          id="save"
          title={
            <span>
              <Icon icon="save" /> {t("Save Image")}
            </span>
          }
          disabled={image.isError || image.isLoading}
          onSelect={saveImage}
          drop="up"
        >
          {["png", "jpeg", "pdf", "svg", "ps", "eps", "tiff", "geotiff"].map(
            (fmt) => (
              <Dropdown.Item
                key={fmt}
                eventKey={fmt}
                disabled={fmt === "geotiff" && query.type != "map"}
              >
                <Icon
                  icon={fmt.includes("tiff") ? "file-image-o" : "file-image-o"}
                />{" "}
                {fmt.toUpperCase()}
              </Dropdown.Item>
            )
          )}
          <Dropdown.Divider />
          {["csv", "odv", "stats"].map((fmt) => (
            <Dropdown.Item
              key={fmt}
              eventKey={fmt}
              disabled={
                (fmt === "csv" && query.type === "hovmoller") ||
                (fmt === "odv" &&
                  !["profile", "observation", "transect", "map"].includes(
                    query.type
                  ))
              }
            >
              <Icon icon="file-text-o" />{" "}
              {t(fmt === "stats" ? "Statistics (csv)" : fmt.toUpperCase())}
            </Dropdown.Item>
          ))}
        </DropdownButton>

        <DropdownButton
          id="link"
          title={
            <span>
              <Icon icon="link" /> {t("Get Link")}
            </span>
          }
          disabled={image.isError || image.isLoading}
          onSelect={getLink}
          drop="up"
        >
          <Dropdown.Item eventKey="web">
            <Icon icon="globe" /> {t("Web")}
          </Dropdown.Item>
          <Dropdown.Item eventKey="image" disabled={image.isError || image.isLoading}>
            <Icon icon="file-image-o" /> {t("Image")}
          </Dropdown.Item>
        </DropdownButton>

        <DropdownButton
          id="script"
          title={
            <span>
              <Icon icon="file-code-o" /> {t("API Script")}
            </span>
          }
          disabled={image.isError || image.isLoading}
          onSelect={generateScript}
          drop="up"
        >
          {["rPlot", "pythonPlot", "pythonCSV", "rCSV"].map((key) => (
            <Dropdown.Item
              key={key}
              eventKey={key}
              disabled={image.isError || image.isLoading}
            >
              <Icon icon="code" /> {key === "rPlot" && "R - PLOT"}
              {key === "pythonPlot" && "Python 3 - PLOT"}
              {key === "pythonCSV" && "Python 3 - CSV"}
              {key === "rCSV" && "R - CSV"}
            </Dropdown.Item>
          ))}
        </DropdownButton>
      </ButtonToolbar>

      <Modal
        show={showImagelink}
        onHide={toggleImageLink}
        dialogClassName="permalink-modal"
        onEntered={onLinkModalEntered}
      >
        <Modal.Header closeButton>
          <Modal.Title>{t("Share Link")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <textarea
            ref={imagelinkRef}
            readOnly
            value={`${window.location.origin}${urlFromQuery(
              query
            )}&format=png&size=${size}&dpi=${dpi}`}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={() => {
              imagelinkRef.current.select();
              document.execCommand("copy");
            }}
          >
            <Icon icon="copy" /> {t("Copy")}
          </Button>
          <Button onClick={toggleImageLink}>
            <Icon icon="close" /> {t("Close")}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

//***********************************************************************
PlotImage.propTypes = {
  query: PropTypes.object,
  permlink_subquery: PropTypes.object,
  action: PropTypes.func,
  t: PropTypes.func.isRequired,
};

export default withTranslation()(PlotImage);
