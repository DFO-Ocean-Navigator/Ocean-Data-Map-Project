import React, { useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { useTranslation } from "react-i18next";

export default function AnnotationTextWindow(props) {
  const [inputText, setInputText] = useState("");

  const { t, i18n } = useTranslation();

  const onSubmit = () => {
    props.mapRef.current.addAnnotationLabel(inputText.trim());
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
          {t("Add")}
        </Button>
        <Button onClick={onUndo} variant="secondary" className="me-2">
          {t("Undo")}
        </Button>
        <Button onClick={onClear} variant="outline-danger">
          {t("Clear")}
        </Button>
      </div>
    </div>
  );
}
