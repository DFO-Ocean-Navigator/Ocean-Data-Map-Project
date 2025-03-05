import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { withTranslation } from "react-i18next";

function AnnotationTextWindow(props) {
  const [inputText, setInputText] = useState("");

  const onSubmit = () => {
    props.mapRef.current.addAnnotationLabel(inputText);
    props.updateUI({ modalType: "", showModal: false });
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
        onChange={(e) => setInputText(e.target.value)}
      />

      <div className="controls">
        <Button onClick={onSubmit}>{__("Add")}</Button>
        <Button onClick={onUndo}>{__("Undo")}</Button>
        <Button onClick={onClear}>{__("Clear")}</Button>
      </div>
    </div>
  );
}

export default withTranslation()(AnnotationTextWindow);
