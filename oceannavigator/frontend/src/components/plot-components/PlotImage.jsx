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

import { useGetPlotImage } from "../../remote/queries.js";

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

  const image = useGetPlotImage(featureId, plotType, query);

  // Generate API script
  const generateScript = (language) => {
    const querystring = encodeURIComponent(JSON.stringify(query));

    const scriptType = language.includes("Plot") ? "plot" : "csv";
    const scriptLang = language.startsWith("python") ? "python" : "r";

    window.location.href =
      `${window.location.origin}/api/v2.0/generate_script?query=${querystring}` +
      `&plot_type=${encodeURIComponent(plotType)}` +
      `&lang=${encodeURIComponent(scriptLang)}` +
      `&script_type=${encodeURIComponent(scriptType)}`;
  };

  // Build URL from query
  const urlFromQuery = () => {
    return `/api/v2.0/plot/${plotType}?query=${encodeURIComponent(
      JSON.stringify(query)
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
  if (image.status === "error") {
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
          disabled={image.status === "pending" || image.status === "error" }
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
          disabled={image.status === "pending" || image.status === "error" }
          onSelect={getLink}
          drop="up"
        >
          <Dropdown.Item eventKey="web">
            <Icon icon="globe" /> {t("Web")}
          </Dropdown.Item>
          <Dropdown.Item
            eventKey="image"
            disabled={image.status === "pending" || image.status === "error" }
          >
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
          disabled={image.status === "pending" || image.status === "error" }
          onSelect={generateScript}
          drop="up"
        >
          {["rPlot", "pythonPlot", "pythonCSV", "rCSV"].map((key) => (
            <Dropdown.Item
              key={key}
              eventKey={key}
              disabled={image.status === "pending" || image.status === "error" }
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
