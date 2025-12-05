import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Button,
  ButtonToolbar,
  Modal,
  Alert,
  Dropdown,
  DropdownButton,
  Spinner,
} from "react-bootstrap";
import Icon from "../lib/Icon.jsx";
import PropTypes from "prop-types";
import { withTranslation } from "react-i18next";

const FAIL_IMAGE = require("../fail.js");
const LOADING_IMAGE = require("../../images/spinner.gif").default;

const PlotImage = ({ query, permlink_subquery, action, t: _ }) => {
  const imagelinkRef = useRef(null);

  // Local state
  const [showImagelink, setShowImagelink] = useState(false);
  const [fail, setFail] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(LOADING_IMAGE);
  const [queryString, setQueryString] = useState(null);

  // Load image when query changes
  useEffect(() => {
    const [type, qry] = generateQuery(query);
    const qs = JSON.stringify(qry);
    if (qs !== queryString) {
      setLoading(true);
      setFail(false);
      setUrl(LOADING_IMAGE);
      setErrorMessage(null);
      setQueryString(qs);

      axios
        .get(`/api/v2.0/plot/${type}`, {
          params: { query: qs, format: "json" },
        })
        .then((res) => {
          setLoading(false);
          setFail(false);
          setUrl(res.data);
        })
        .catch(() => {
          setLoading(false);
          setFail(true);
          setUrl(FAIL_IMAGE);
        });
    }
  }, [query]);

  // Generate API script
  const generateScript = (language) => {
    const [type, qry] = generateQuery(query);

    const qstr = encodeURIComponent(JSON.stringify(qry));

    const scriptType = language.includes("Plot") ? "plot" : "csv";
    const scriptLang = language.startsWith("python") ? "python" : "r";

    window.location.href =
      `${window.location.origin}/api/v2.0/generate_script?query=${qstr}` +
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
  const urlFromQuery = useCallback(
    (q) => {
      const [type, qry] = generateQuery(q);
      return `/api/v2.0/plot/${type}?query=${encodeURIComponent(
        JSON.stringify(qry)
      )}`;
    },
    [generateQuery]
  );

  // Toggle image link modal
  const toggleImageLink = () => setShowImagelink((prev) => !prev);

  // Save image handler
  const saveImage = (format) => {
    let link = `${urlFromQuery(query)}&save=True&format=${format}`;
    if (!["odv", "csv"].includes(format)) {
      link += `&size=${query.size}&dpi=${query.dpi}`;
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

  return (
    <div className="PlotImage">
      <div className="RenderedImage">
        {loading ? (
          <Spinner animation="border" variant="primary" />
        ) : (
          <img src={url} alt="Plot" />
        )}
      </div>
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
      <ButtonToolbar className="button-bar">
        <DropdownButton
          id="save"
          title={
            <span>
              <Icon icon="save" /> {_("Save Image")}
            </span>
          }
          disabled={fail || loading}
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
              {_(fmt === "stats" ? "Statistics (csv)" : fmt.toUpperCase())}
            </Dropdown.Item>
          ))}
        </DropdownButton>

        <DropdownButton
          id="link"
          title={
            <span>
              <Icon icon="link" /> {_("Get Link")}
            </span>
          }
          disabled={fail || loading}
          onSelect={getLink}
          drop="up"
        >
          <Dropdown.Item eventKey="web">
            <Icon icon="globe" /> {_("Web")}
          </Dropdown.Item>
          <Dropdown.Item eventKey="image" disabled={fail}>
            <Icon icon="file-image-o" /> {_("Image")}
          </Dropdown.Item>
        </DropdownButton>

        <DropdownButton
          id="script"
          title={
            <span>
              <Icon icon="file-code-o" /> {_("API Script")}
            </span>
          }
          disabled={fail || loading}
          onSelect={generateScript}
          drop="up"
        >
          {["rPlot", "pythonPlot", "pythonCSV", "rCSV"].map((key) => (
            <Dropdown.Item key={key} eventKey={key} disabled={fail}>
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
          <Modal.Title>{_("Share Link")}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <textarea
            ref={imagelinkRef}
            readOnly
            value={`${window.location.origin}${urlFromQuery(
              query
            )}&format=png&size=${query.size}&dpi=${query.dpi}`}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            onClick={() => {
              imagelinkRef.current.select();
              document.execCommand("copy");
            }}
          >
            <Icon icon="copy" /> {_("Copy")}
          </Button>
          <Button onClick={toggleImageLink}>
            <Icon icon="close" /> {_("Close")}
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
