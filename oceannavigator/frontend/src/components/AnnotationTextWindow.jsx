import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { withTranslation } from "react-i18next";

function AnnotationTextWindow(props) {
  const [inputText, setInputText] = useState("");

  const onSubmit = () => {
    const centerCoord = props.mapRef.current.getMapCenter();
    props.mapRef.current.addAnnotationLabel(inputText.trim(), centerCoord);
    props.updateUI({ annotationMode: false, modalType: "", showModal: false });
  };

  const onUndo = () => {
    props.mapRef.current.undoAnnotationLabel();
  };

  const onClear = () => {
    props.mapRef.current.clearAnnotationLabels();
  };

  return (
    <div className="annotation-text-window">
      <Form.Label>Annotation Text</Form.Label>
      <Form.Control
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Enter annotation text..."
        autoFocus
      />
      <div className="controls mt-3">
        <Button
          onClick={onSubmit}
          disabled={!inputText.trim()}
          variant="primary"
          className="me-2"
        >
          {__("Add")}
        </Button>
        <Button onClick={onUndo} variant="secondary" className="me-2">
          {__("Undo")}
        </Button>
        <Button onClick={onClear} variant="outline-danger">
          {__("Clear")}
        </Button>
      </div>
    </div>
  );
}

export default withTranslation()(AnnotationTextWindow);
