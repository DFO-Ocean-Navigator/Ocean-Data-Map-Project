import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Button,
  ButtonToolbar,
  Modal,
  Alert,
  Dropdown,
  DropdownButton,
} from "react-bootstrap";
import Icon from "./lib/Icon.jsx";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const FAIL_IMAGE = require("./fail.js");
const LOADING_IMAGE = require("../images/spinner.gif").default;

const PlotImage = ({ query, permlink_subquery, action }) => {
  const { t: _ } = useTranslation();
  const isMountedRef = useRef(false);
  const imagelinkRef = useRef(null);

  // Local state
  const [showImagelink, setShowImagelink] = useState(false);
  const [fail, setFail] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(LOADING_IMAGE);
  const [queryString, setQueryString] = useState(null);

  // Generate type and query object from props.query
  const generateQuery = useCallback(q => {
    const base = { dataset: q.dataset, names: q.names };
    if (q.plotTitle != null) base.plotTitle = q.plotTitle;
    let newQuery = { ...base };
    switch (q.type) {
      case "profile":
      case "ts":
      case "sound":
        newQuery = { ...newQuery, variable: q.variable, station: q.point, showmap: q.showmap, time: q.time };
        if (q.variable_range) newQuery.variable_range = q.variable_range;
        if (q.compare_to) newQuery.compare_to = { ...q.compare_to };
        break;
      // ... handle other types similarly ...
      case "track":
        newQuery = {
          ...newQuery,
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
      default:
        newQuery = { ...newQuery, ...q };
    }
    return [q.type, newQuery];
  }, []);

  // Build URL from query
  const urlFromQuery = useCallback(q => {
    const [type, qry] = generateQuery(q);
    return `/api/v2.0/plot/${type}?query=${encodeURIComponent(JSON.stringify(qry))}`;
  }, [generateQuery]);

  // Load image when query changes
  useEffect(() => {
    isMountedRef.current = true;
    const [type, qry] = generateQuery(query);
    const qs = JSON.stringify(qry);
    if (qs !== queryString) {
      setLoading(true);
      setFail(false);
      setUrl(LOADING_IMAGE);
      setErrorMessage(null);
      setQueryString(qs);

      axios.get(`/api/v2.0/plot/${type}`, { params: { query: qs, format: "json" } })
        .then(res => {
          if (isMountedRef.current) {
            setLoading(false);
            setFail(false);
            setUrl(res.data);
          }
        })
        .catch(() => {
          if (isMountedRef.current) {
            setLoading(false);
            setFail(true);
            setUrl(FAIL_IMAGE);
          }
        });
    }
    return () => { isMountedRef.current = false; };
  }, [query, generateQuery, queryString]);

  // Toggle image link modal
  const toggleImageLink = () => setShowImagelink(prev => !prev);

  // Save image handler
  const saveImage = format => {
    let link = `${urlFromQuery(query)}&save=True&format=${format}`;
    if (!["odv","csv"].includes(format)) {
      link += `&size=${query.size}&dpi=${query.dpi}`;
    }
    window.location.href = link;
  };

  // Generate API script
  const generateScript = lang => {
    let [type, qry] = generateQuery(query);
    const payload = encodeURIComponent(JSON.stringify(qry));
    let scriptType = lang.includes("Plot") ? "plot" : "csv";
    let scriptLang = lang.startsWith("python") ? "python" : "r";
    window.location.href =
      `${window.location.origin}/api/v2.0/generate_script?query=${payload}` +
      `&plot_type=${type}&lang=${scriptLang}&script_type=${scriptType}`;
  };

  // Handle link actions
  const getLink = key => {
    if (key === "web") action("permalink", permlink_subquery);
    if (key === "image") toggleImageLink();
    if (key === "script") generateScript();
  };

  // Auto-select link textarea
  const onLinkModalEntered = () => {
    imagelinkRef.current.style.height = imagelinkRef.current.scrollHeight + 5 + "px";
    imagelinkRef.current.select();
  };

  return (
    <div className="PlotImage">
      <div className="RenderedImage"><img src={url} alt="Plot" /></div>
      {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
      <ButtonToolbar className="button-bar">
        <DropdownButton id="save" title={<span><Icon icon="save"/> {_('Save Image')}</span>} disabled={fail||loading} onSelect={saveImage} drop="up">
          {["png","jpeg","pdf","svg","ps","eps","tiff","geotiff"].map(fmt =>
            <Dropdown.Item key={fmt} eventKey={fmt} disabled={fmt==="geotiff"&&query.type!="map"}>
              <Icon icon={fmt.includes("tiff")?"file-image-o":"file-image-o"}/> {fmt.toUpperCase()}
            </Dropdown.Item>
          )}
          <Dropdown.Divider/>
          {['csv','odv','stats'].map(fmt =>
            <Dropdown.Item key={fmt} eventKey={fmt} disabled={(fmt==='csv'&&query.type==='hovmoller')||(fmt==='odv'&&!['profile','observation','transect','map'].includes(query.type))}>
              <Icon icon="file-text-o"/> {_(fmt==='stats'?"Statistics (csv)":fmt.toUpperCase())}
            </Dropdown.Item>
          )}
        </DropdownButton>

        <DropdownButton id="link" title={<span><Icon icon="link"/> {_('Get Link')}</span>} disabled={fail||loading} onSelect={getLink} drop="up">
          <Dropdown.Item eventKey="web"><Icon icon="globe"/> {_('Web')}</Dropdown.Item>
          <Dropdown.Item eventKey="image" disabled={fail}><Icon icon="file-image-o"/> {_('Image')}</Dropdown.Item>
        </DropdownButton>

        <DropdownButton id="script" title={<span><Icon icon="file-code-o"/> {_('API Script')}</span>} disabled={fail||loading} onSelect={generateScript} drop="up">
          {['rPlot','pythonPlot','pythonCSV','rCSV'].map(key=>
            <Dropdown.Item key={key} eventKey={key} disabled={fail}><Icon icon="code"/> {key}</Dropdown.Item>
          )}
        </DropdownButton>
      </ButtonToolbar>

      <Modal show={showImagelink} onHide={toggleImageLink} dialogClassName="permalink-modal" onEntered={onLinkModalEntered}>
        <Modal.Header closeButton><Modal.Title>{_('Share Link')}</Modal.Title></Modal.Header>
        <Modal.Body>
          <textarea ref={imagelinkRef} readOnly
            value={`${window.location.origin}${urlFromQuery(query)}&format=png&size=${query.size}&dpi=${query.dpi}`}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={()=>{imagelinkRef.current.select();document.execCommand('copy');}}><Icon icon="copy"/> {_('Copy')}</Button>
          <Button onClick={toggleImageLink}><Icon icon="close"/> {_('Close')}</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

PlotImage.propTypes = {
  query: PropTypes.object,
  permlink_subquery: PropTypes.object,
  action: PropTypes.func,
};

export default PlotImage;
